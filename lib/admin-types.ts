import type { AppRole, Permission } from "@/lib/permissions";

export type AdminMembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

export type AdminGroup = {
  id: string;
  name: string;
  stage: string;
  section: string | null;
  academicYear: string;
  memberCount: number;
};

export type AdminPerson = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  status: AdminMembershipStatus;
  groups: Array<{ id: string; name: string }>;
  permissions: Permission[];
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  actorName: string;
  detail: string;
  createdAt: string;
};

export type AdminSnapshot = {
  school: { id: string; name: string; slug: string };
  people: AdminPerson[];
  groups: AdminGroup[];
  audit: AdminAuditEntry[];
};

export const ROLE_LABELS: Record<AppRole, string> = {
  COORDINATOR: "Coordinació",
  TUTOR: "Tutor/a",
  DELEGATE: "Delegat/ada",
  STUDENT: "Alumne/a",
};

export const STATUS_LABELS: Record<AdminMembershipStatus, string> = {
  INVITED: "Convidat/ada",
  ACTIVE: "Actiu/iva",
  SUSPENDED: "Suspès/esa",
};
