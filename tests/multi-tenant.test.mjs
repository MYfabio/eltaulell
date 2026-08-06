import assert from "node:assert/strict";
import test from "node:test";
import { canAccessGroup, canAccessSchool, canManageGroup, canViewStudent } from "../lib/access-policy.ts";

const roles = ["COORDINATOR", "TUTOR", "DELEGATE", "STUDENT"];

test("no active role can cross the school boundary", () => {
  for (const role of roles) {
    const subject = { role, status: "ACTIVE", schoolId: "centre-a", userId: `${role}-a`, groupIds: ["group-a"] };
    assert.equal(canAccessSchool(subject, "centre-b"), false, role);
    assert.equal(canAccessGroup(subject, { schoolId: "centre-b", groupId: "group-a" }), false, role);
    assert.equal(canManageGroup(subject, { schoolId: "centre-b", groupId: "group-a" }), false, role);
    assert.equal(canViewStudent(subject, { schoolId: "centre-b", groupId: "group-a", userId: subject.userId }), false, role);
  }
});

test("same group identifiers never override the tenant check", () => {
  const tutor = { role: "TUTOR", status: "ACTIVE", schoolId: "centre-a", userId: "tutor-a", groupIds: ["shared-id"] };
  assert.equal(canAccessGroup(tutor, { schoolId: "centre-a", groupId: "shared-id" }), true);
  assert.equal(canAccessGroup(tutor, { schoolId: "centre-b", groupId: "shared-id" }), false);
});
