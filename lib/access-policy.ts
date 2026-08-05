export type ScopedRole = "COORDINATOR" | "TUTOR" | "DELEGATE" | "STUDENT";
export type ScopedMembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

export type AccessSubject = {
  role: ScopedRole;
  status: ScopedMembershipStatus;
  schoolId: string;
  userId: string;
  groupIds: readonly string[];
};

export type StudentScope = {
  schoolId: string;
  groupId: string;
  userId: string;
};

function isActiveInSchool(subject: AccessSubject, schoolId: string) {
  return subject.status === "ACTIVE" && subject.schoolId === schoolId;
}
export function canAccessSchool(subject: AccessSubject, schoolId: string) {
  return isActiveInSchool(subject, schoolId);
}

export function canAccessGroup(
  subject: AccessSubject,
  resource: { schoolId: string; groupId: string },
) {
  if (!isActiveInSchool(subject, resource.schoolId)) return false;
  return subject.role === "COORDINATOR" || subject.groupIds.includes(resource.groupId);
}

export function canManageGroup(
  subject: AccessSubject,
  resource: { schoolId: string; groupId: string },
) {
  if (!canAccessGroup(subject, resource)) return false;
  return subject.role === "COORDINATOR" || subject.role === "TUTOR";
}

export function canViewStudent(subject: AccessSubject, student: StudentScope) {
  if (!canAccessGroup(subject, student)) return false;
  if (subject.role === "COORDINATOR" || subject.role === "TUTOR") return true;
  return subject.role === "STUDENT" && subject.userId === student.userId;
}
