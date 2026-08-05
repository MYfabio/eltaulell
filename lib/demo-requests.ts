import "server-only";

import { ensureDemoSchoolData } from "@/lib/admin";
import { issueAccountInvitation } from "@/lib/account-auth";
import { db } from "@/lib/db";
import { DEMO_VIEWERS, type DemoRole } from "@/lib/demo-auth";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const REQUEST_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type DemoRequestStatus = "PENDING" | "INVITED" | "CLOSED";

export type DemoRequestItem = {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  requestedRole: DemoRole;
  message: string | null;
  status: DemoRequestStatus;
  invitationExpiresAt: string | null;
  createdAt: string;
};

type DemoRequestRow = {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  requestedRole: DemoRole;
  message: string | null;
  status: DemoRequestStatus;
  invitationExpiresAt: Date | null;
  createdAt: Date;
};

function serializeRequest(request: DemoRequestRow): DemoRequestItem {
  return {
    ...request,
    invitationExpiresAt: request.invitationExpiresAt?.toISOString() || null,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function createDemoRequest(data: {
  name: string;
  email: string;
  schoolName: string;
  requestedRole: DemoRole;
  message?: string | null;
}) {
  await db.demoRequest.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - REQUEST_RETENTION_MS) } },
  });
  const recent = await db.demoRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  }) as DemoRequestRow[];
  const duplicate = recent.some((request) =>
    request.email.toLowerCase() === data.email.toLowerCase()
      && request.createdAt.getTime() > Date.now() - DUPLICATE_WINDOW_MS,
  );
  if (duplicate) return { error: "DUPLICATE" } as const;

  const request = await db.demoRequest.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      schoolName: data.schoolName,
      requestedRole: data.requestedRole,
      message: data.message || null,
      privacyAcceptedAt: new Date(),
    },
  }) as DemoRequestRow;
  return { request: serializeRequest(request) } as const;
}

export async function listDemoRequests() {
  const requests = await db.demoRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  }) as DemoRequestRow[];
  return requests.map(serializeRequest);
}

export async function issueDemoRequestInvitation(requestId: string) {
  const request = await db.demoRequest.findUnique({ where: { id: requestId } }) as
    | DemoRequestRow
    | null;
  if (!request) return { error: "NOT_FOUND" } as const;

  const school = await ensureDemoSchoolData(DEMO_VIEWERS[0]);
  const group = await db.group.findFirst({
    where: { schoolId: school.id, name: "3r B" },
  });
  if (!group) return { error: "DEMO_GROUP_MISSING" } as const;

  return db.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { email: request.email.toLowerCase() },
      update: { name: request.name },
      create: { name: request.name, email: request.email.toLowerCase() },
    });
    const existingMembership = await transaction.schoolMembership.findUnique({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
    });
    if (existingMembership?.status === "ACTIVE") {
      return { error: "ALREADY_ACTIVE" } as const;
    }

    const membership = await transaction.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      update: { role: request.requestedRole, status: "INVITED" },
      create: {
        schoolId: school.id,
        userId: user.id,
        role: request.requestedRole,
        status: "INVITED",
      },
    });

    await transaction.groupMembership.deleteMany({
      where: { schoolMembershipId: membership.id },
    });
    if (request.requestedRole !== "COORDINATOR") {
      await transaction.groupMembership.upsert({
        where: {
          groupId_schoolMembershipId: {
            groupId: group.id,
            schoolMembershipId: membership.id,
          },
        },
        update: { role: request.requestedRole },
        create: {
          groupId: group.id,
          schoolMembershipId: membership.id,
          role: request.requestedRole,
        },
      });
    }

    const invitation = await issueAccountInvitation(transaction, {
      schoolId: school.id,
      email: request.email,
      role: request.requestedRole,
    });
    await transaction.demoRequest.update({
      where: { id: request.id },
      data: {
        status: "INVITED",
        invitationExpiresAt: invitation.expiresAt,
      },
    });

    return {
      activationPath: `/activar?token=${encodeURIComponent(invitation.token)}`,
      expiresAt: invitation.expiresAt.toISOString(),
    } as const;
  });
}
