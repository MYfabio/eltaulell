import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { db, type DatabaseClient } from "@/lib/db";
import { createPasswordHash, passwordMatches } from "@/lib/credential-policy";
import type { AppRole } from "@/lib/permissions";

const INVITATION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
const INVALID_ACCOUNT_HASH = createPasswordHash("invalid-account-placeholder-2026");

type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

type LoginMembership = {
  id: string;
  userId: string;
  role: AppRole;
  status: MembershipStatus;
  school: { id: string; name: string; slug: string; active: boolean };
};

export type AccountInvitationPreview = {
  email: string;
  schoolName: string;
  expiresAt: Date;
  available: boolean;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordIsStrongEnough(password: string) {
  return password.length >= 12 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}

export async function issueAccountInvitation(
  database: DatabaseClient,
  data: { schoolId: string; email: string; role: AppRole },
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_DURATION_MS);
  const email = data.email.trim().toLowerCase();

  await database.invitation.updateMany({
    where: { schoolId: data.schoolId, email, acceptedAt: null },
    data: { expiresAt: new Date(0) },
  });
  const invitation = await database.invitation.create({
    data: {
      schoolId: data.schoolId,
      email,
      role: data.role,
      tokenHash: tokenHash(token),
      expiresAt,
    },
  });

  return { invitationId: invitation.id as string, token, expiresAt };
}

export async function inspectAccountInvitation(
  token: string,
): Promise<AccountInvitationPreview | null> {
  if (!token) return null;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { school: { select: { name: true, active: true } } },
  });
  if (!invitation) return null;

  return {
    email: invitation.email,
    schoolName: invitation.school.name,
    expiresAt: invitation.expiresAt,
    available:
      invitation.school.active &&
      !invitation.acceptedAt &&
      invitation.expiresAt.getTime() > Date.now(),
  };
}

export async function activateAccount(token: string, password: string) {
  if (!passwordIsStrongEnough(password)) return { error: "WEAK_PASSWORD" } as const;
  const passwordHash = createPasswordHash(password);

  return db.$transaction(async (transaction) => {
    const invitation = await transaction.invitation.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { school: { select: { id: true, active: true } } },
    });
    if (!invitation) return { error: "INVALID_INVITATION" } as const;
    if (
      invitation.acceptedAt ||
      invitation.expiresAt.getTime() <= Date.now() ||
      !invitation.school.active
    ) {
      return { error: "EXPIRED_INVITATION" } as const;
    }

    const user = await transaction.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) return { error: "INVALID_INVITATION" } as const;

    const membership = await transaction.schoolMembership.findUnique({
      where: {
        schoolId_userId: {
          schoolId: invitation.schoolId,
          userId: user.id,
        },
      },
    });
    if (
      !membership ||
      membership.status !== "INVITED" ||
      membership.role !== invitation.role
    ) {
      return { error: "INVALID_INVITATION" } as const;
    }

    await transaction.passwordCredential.upsert({
      where: { userId: user.id },
      update: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
        passwordSetAt: new Date(),
      },
      create: {
        userId: user.id,
        passwordHash,
      },
    });
    await transaction.schoolMembership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" },
    });
    await transaction.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedById: user.id },
    });
    await transaction.session.updateMany({
      where: { schoolMembershipId: membership.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: invitation.schoolId,
        actorId: user.id,
        action: "ACCOUNT_ACTIVATED",
        entityType: "SchoolMembership",
        entityId: membership.id,
        metadata: { email: invitation.email, role: invitation.role },
      },
    });

    return {
      userId: user.id as string,
      membershipId: membership.id as string,
      role: membership.role as AppRole,
    } as const;
  });
}

export async function authenticateAccount(
  emailInput: string,
  password: string,
  schoolSlugInput?: string,
) {
  const email = emailInput.trim().toLowerCase();
  const schoolSlug = schoolSlugInput?.trim().toLowerCase() || undefined;
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    passwordMatches(password, INVALID_ACCOUNT_HASH);
    return { error: "INVALID_CREDENTIALS" } as const;
  }

  const credential = await db.passwordCredential.findUnique({
    where: { userId: user.id },
  });
  if (!credential) {
    passwordMatches(password, INVALID_ACCOUNT_HASH);
    return { error: "INVALID_CREDENTIALS" } as const;
  }
  if (credential.lockedUntil && credential.lockedUntil.getTime() > Date.now()) {
    return { error: "LOCKED" } as const;
  }

  if (!passwordMatches(password, credential.passwordHash)) {
    const failedAttempts = credential.failedAttempts + 1;
    await db.passwordCredential.update({
      where: { id: credential.id },
      data: {
        failedAttempts,
        lockedUntil:
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : null,
      },
    });
    return { error: failedAttempts >= MAX_FAILED_ATTEMPTS ? "LOCKED" : "INVALID_CREDENTIALS" } as const;
  }

  const memberships = await db.schoolMembership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      school: { active: true, ...(schoolSlug ? { slug: schoolSlug } : {}) },
    },
    include: { school: { select: { id: true, name: true, slug: true, active: true } } },
    orderBy: { school: { name: "asc" } },
  }) as LoginMembership[];
  if (!memberships.length) return { error: "NO_ACTIVE_MEMBERSHIP" } as const;
  if (memberships.length > 1 && !schoolSlug) return { error: "CENTRE_REQUIRED" } as const;

  await db.passwordCredential.update({
    where: { id: credential.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  return { userId: user.id as string, membership: memberships[0] } as const;
}
