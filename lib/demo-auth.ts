import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type DemoRole = "COORDINATOR" | "TUTOR" | "DELEGATE" | "STUDENT";

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
  permissions: {
    manageSchool: boolean;
    moderateBoard: boolean;
    publishActivities: boolean;
    connectPlatforms: boolean;
  };
};

export const DEMO_COOKIE = "eltaulell_demo_session";

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
    permissions: {
      manageSchool: true,
      moderateBoard: true,
      publishActivities: true,
      connectPlatforms: true,
    },
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
    permissions: {
      manageSchool: false,
      moderateBoard: true,
      publishActivities: true,
      connectPlatforms: false,
    },
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
    permissions: {
      manageSchool: false,
      moderateBoard: false,
      publishActivities: true,
      connectPlatforms: false,
    },
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
    permissions: {
      manageSchool: false,
      moderateBoard: false,
      publishActivities: false,
      connectPlatforms: false,
    },
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

export function verifyDemoSession(token?: string) {
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

  return DEMO_VIEWERS.find((viewer) => viewer.id === userId) || null;
}

export async function getDemoViewer() {
  const cookieStore = await cookies();
  return verifyDemoSession(cookieStore.get(DEMO_COOKIE)?.value);
}

export async function requireDemoViewer(roles?: DemoRole[]) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/acces");
  if (roles && !roles.includes(viewer.role)) redirect("/taulell");
  return viewer;
}
