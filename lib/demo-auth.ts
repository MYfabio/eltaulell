import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  can,
  type AppRole,
  type Permission,
  permissionsForRole,
} from "@/lib/permissions";
import { db } from "@/lib/db";

export type DemoRole = AppRole;

export type DemoViewer = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: DemoRole;
  roleLabel: string;
  school: string;
  schoolSlug: string;
  groupName: string;
  permissions: Permission[];
};

export type PlatformDemoViewer = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  roleLabel: string;
};

export const DEMO_COOKIE = "eltaulell_demo_session";
export const PLATFORM_DEMO_COOKIE = "eltaulell_platform_demo_session";

export const PLATFORM_DEMO_ADMIN: PlatformDemoViewer = {
  id: "platform-admin-demo",
  name: "Administració El Taulell",
  firstName: "Administració",
  initials: "AT",
  email: "admin@demo.eltaulell.cat",
  roleLabel: "Administració de plataforma",
};

export const DEMO_VIEWERS: DemoViewer[] = [
  {
    id: "coordinator-nuria",
    name: "Núria Soler",
    firstName: "Núria",
    initials: "NS",
    email: "coordinacio@demo.eltaulell.cat",
    role: "COORDINATOR",
    roleLabel: "Coordinadora",
    school: "Institut Can Roca",
    schoolSlug: "institut-can-roca",
    groupName: "Tots els grups",
    permissions: permissionsForRole("COORDINATOR"),
  },
  {
    id: "tutor-marta",
    name: "Marta Puig",
    firstName: "Marta",
    initials: "MP",
    email: "marta.puig@demo.eltaulell.cat",
    role: "TUTOR",
    roleLabel: "Tutora",
    school: "Institut Can Roca",
    schoolSlug: "institut-can-roca",
    groupName: "3r B",
    permissions: permissionsForRole("TUTOR"),
  },
  {
    id: "delegate-laia",
    name: "Laia Canals",
    firstName: "Laia",
    initials: "LC",
    email: "laia.canals@demo.eltaulell.cat",
    role: "DELEGATE",
    roleLabel: "Delegada",
    school: "Institut Can Roca",
    schoolSlug: "institut-can-roca",
    groupName: "3r B",
    permissions: permissionsForRole("DELEGATE"),
  },
  {
    id: "student-marc",
    name: "Marc Costa",
    firstName: "Marc",
    initials: "MC",
    email: "marc.costa@demo.eltaulell.cat",
    role: "STUDENT",
    roleLabel: "Alumne",
    school: "Institut Can Roca",
    schoolSlug: "institut-can-roca",
    groupName: "3r B",
    permissions: permissionsForRole("STUDENT"),
  },
];

function sessionSecret() {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return secret || "eltaulell-local-development-only";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createDemoSession(userId: string) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(`${userId}:${expiresAt}`, "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySessionSubject(token?: string) {
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = sign(payload);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null;
  }

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf(":");
  if (separator < 1) return null;

  const userId = decoded.slice(0, separator);
  const expiresAt = Number(decoded.slice(separator + 1));
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return userId;
}

export function verifyDemoSession(token?: string) {
  const userId = verifySessionSubject(token);
  return DEMO_VIEWERS.find((viewer) => viewer.id === userId) || null;
}

export function isPlatformDemoEnabled() {
  return process.env.ELTAULELL_LOCAL_PREVIEW === "1" ||
    process.env.PLATFORM_ADMIN_DEMO_ENABLED === "1";
}

export function createPlatformDemoSession() {
  return createDemoSession(PLATFORM_DEMO_ADMIN.id);
}

export function verifyPlatformDemoSession(token?: string) {
  if (!isPlatformDemoEnabled()) return null;
  return verifySessionSubject(token) === PLATFORM_DEMO_ADMIN.id
    ? PLATFORM_DEMO_ADMIN
    : null;
}

export async function getDemoViewer() {
  const cookieStore = await cookies();
  const viewer = verifyDemoSession(cookieStore.get(DEMO_COOKIE)?.value);
  if (!viewer) return null;
  const school = await db.school.findFirst({
    where: { slug: viewer.schoolSlug },
    select: { active: true },
  });
  return school && school.active === false ? null : viewer;
}

export async function getPlatformDemoViewer() {
  const cookieStore = await cookies();
  return verifyPlatformDemoSession(cookieStore.get(PLATFORM_DEMO_COOKIE)?.value);
}

export async function requirePlatformDemoViewer() {
  const viewer = await getPlatformDemoViewer();
  if (!viewer) redirect("/acces");
  return viewer;
}

export async function requireDemoViewer(roles?: DemoRole[]) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/acces");
  if (roles && !roles.includes(viewer.role)) redirect("/taulell");
  return viewer;
}

export async function requireDemoPermission(permission: Permission) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/acces");
  if (!can(viewer, permission)) redirect("/sense-permis");
  return viewer;
}
