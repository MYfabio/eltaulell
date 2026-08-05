import "server-only";

import { timingSafeEqual } from "node:crypto";
import { ensureDemoSchoolData } from "@/lib/admin";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { passwordMatches } from "@/lib/credential-policy";
import { permissionsForRole } from "@/lib/permissions";

type CentreAdminConfig = {
  email: string;
  passwordHash: string;
  name: string;
  schoolName: string;
  schoolSlug: string;
  emailDomain: string | null;
};

function configuredCentreAdmin(): CentreAdminConfig | null {
  const email = process.env.CENTRE_ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.CENTRE_ADMIN_PASSWORD_HASH?.trim();
  const name = process.env.CENTRE_ADMIN_NAME?.trim();
  const schoolName = process.env.CENTRE_ADMIN_SCHOOL_NAME?.trim();
  const schoolSlug = process.env.CENTRE_ADMIN_SCHOOL_SLUG?.trim().toLowerCase();
  if (!email || !passwordHash || !name || !schoolName || !schoolSlug) return null;

  return {
    email,
    passwordHash,
    name,
    schoolName,
    schoolSlug,
    emailDomain: process.env.CENTRE_ADMIN_EMAIL_DOMAIN?.trim().toLowerCase() || null,
  };
}

function sameText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isCentreAdminLoginConfigured() {
  return configuredCentreAdmin() !== null;
}

export function verifyCentreAdminCredentials(email: string, password: string) {
  const config = configuredCentreAdmin();
  if (!config) return null;

  const emailMatches = sameText(email.trim().toLowerCase(), config.email);
  const validPassword = passwordMatches(password, config.passwordHash);
  return emailMatches && validPassword ? config : null;
}

function viewerFor(config: CentreAdminConfig): DemoViewer {
  const parts = config.name.split(/\s+/).filter(Boolean);
  return {
    id: "centre-admin-bootstrap",
    name: config.name,
    firstName: parts[0] || config.name,
    initials: parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    email: config.email,
    role: "COORDINATOR",
    roleLabel: "Administrador/a del centre",
    school: config.schoolName,
    schoolSlug: config.schoolSlug,
    groupName: "Tots els grups",
    permissions: permissionsForRole("COORDINATOR"),
  };
}

export async function ensureCentreAdmin(config: CentreAdminConfig) {
  const viewer = viewerFor(config);
  const school = await ensureDemoSchoolData(viewer);
  await db.school.update({
    where: { id: school.id },
    data: {
      name: config.schoolName,
      active: true,
      ...(config.emailDomain ? { emailDomain: config.emailDomain } : {}),
    },
  });

  const user = await db.user.upsert({
    where: { email: config.email },
    update: { name: config.name },
    create: { name: config.name, email: config.email },
  });
  const membership = await db.schoolMembership.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
    update: { role: "COORDINATOR", status: "ACTIVE" },
    create: {
      schoolId: school.id,
      userId: user.id,
      role: "COORDINATOR",
      status: "ACTIVE",
    },
  });
  await db.session.updateMany({
    where: { schoolMembershipId: membership.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { userId: user.id as string, membershipId: membership.id as string };
}
