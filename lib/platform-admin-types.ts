export type PlatformSchoolPlan = "PILOT" | "STANDARD";

export type PlatformSchool = {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  plan: PlatformSchoolPlan;
  maxUsers: number;
  maxGroups: number;
  userCount: number;
  groupCount: number;
  coordinators: Array<{ name: string; email: string }>;
  createdAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  action: string;
  actorName: string;
  detail: string;
  schoolName: string | null;
  createdAt: string;
};

export type PlatformSnapshot = {
  schools: PlatformSchool[];
  audit: PlatformAuditEntry[];
};

export const PLATFORM_PLAN_LABELS: Record<PlatformSchoolPlan, string> = {
  PILOT: "Pilot",
  STANDARD: "Estàndard",
};
