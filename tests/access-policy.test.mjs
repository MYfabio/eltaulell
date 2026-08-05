import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessGroup,
  canAccessSchool,
  canManageGroup,
  canViewStudent,
} from "../lib/access-policy.ts";
import { can, canCreatePost, PERMISSIONS } from "../lib/permissions.ts";
import { createPasswordHash, passwordMatches } from "../lib/credential-policy.ts";
import { isSessionUsable } from "../lib/session-policy.ts";

const subjects = {
  coordinator: {
    role: "COORDINATOR",
    status: "ACTIVE",
    schoolId: "school-a",
    userId: "coordinator-a",
    groupIds: [],
  },
  tutor: {
    role: "TUTOR",
    status: "ACTIVE",
    schoolId: "school-a",
    userId: "tutor-a",
    groupIds: ["group-a"],
  },
  delegate: {
    role: "DELEGATE",
    status: "ACTIVE",
    schoolId: "school-a",
    userId: "delegate-a",
    groupIds: ["group-a"],
  },
  student: {
    role: "STUDENT",
    status: "ACTIVE",
    schoolId: "school-a",
    userId: "student-a",
    groupIds: ["group-a"],
  },
};

test("coordination can observe every group in its own school only", () => {
  assert.equal(
    canAccessGroup(subjects.coordinator, { schoolId: "school-a", groupId: "group-b" }),
    true,
  );
  assert.equal(
    canAccessGroup(subjects.coordinator, { schoolId: "school-b", groupId: "group-b" }),
    false,
  );
});
test("a tutor is limited to assigned groups", () => {
  assert.equal(
    canAccessGroup(subjects.tutor, { schoolId: "school-a", groupId: "group-a" }),
    true,
  );
  assert.equal(
    canManageGroup(subjects.tutor, { schoolId: "school-a", groupId: "group-a" }),
    true,
  );
  assert.equal(
    canAccessGroup(subjects.tutor, { schoolId: "school-a", groupId: "group-b" }),
    false,
  );
});

test("delegation can participate in its group but cannot manage it", () => {
  assert.equal(
    canAccessGroup(subjects.delegate, { schoolId: "school-a", groupId: "group-a" }),
    true,
  );
  assert.equal(
    canManageGroup(subjects.delegate, { schoolId: "school-a", groupId: "group-a" }),
    false,
  );
  assert.equal(
    canViewStudent(subjects.delegate, {
      schoolId: "school-a",
      groupId: "group-a",
      userId: "student-a",
    }),
    false,
  );
});

test("students can only see their own individual record", () => {
  assert.equal(
    canViewStudent(subjects.student, {
      schoolId: "school-a",
      groupId: "group-a",
      userId: "student-a",
    }),
    true,
  );
  assert.equal(
    canViewStudent(subjects.student, {
      schoolId: "school-a",
      groupId: "group-a",
      userId: "student-b",
    }),
    false,
  );
});

test("inactive memberships cannot access their school or group", () => {
  const suspended = { ...subjects.tutor, status: "SUSPENDED" };
  assert.equal(canAccessSchool(suspended, "school-a"), false);
  assert.equal(
    canAccessGroup(suspended, { schoolId: "school-a", groupId: "group-a" }),
    false,
  );
});

test("the role permission matrix blocks student publishing and delegate moderation", () => {
  assert.equal(canCreatePost("STUDENT", "NOTICE"), false);
  assert.equal(canCreatePost("DELEGATE", "ACTIVITY"), true);
  assert.equal(can("DELEGATE", PERMISSIONS.MODERATE_BOARD), false);
  assert.equal(can("TUTOR", PERMISSIONS.MODERATE_BOARD), true);
  assert.equal(can("COORDINATOR", PERMISSIONS.MANAGE_USERS), true);
  assert.equal(can("DELEGATE", PERMISSIONS.ARRANGE_BOARD), true);
  assert.equal(can("STUDENT", PERMISSIONS.ARRANGE_BOARD), true);
  assert.equal(can("TUTOR", PERMISSIONS.ARRANGE_BOARD), false);
});

test("centre administrator passwords are verified from a salted hash", () => {
  const encodedHash = createPasswordHash("temporary-test-password", "fixed-test-salt");
  assert.equal(passwordMatches("temporary-test-password", encodedHash), true);
  assert.equal(passwordMatches("wrong-password", encodedHash), false);
  assert.equal(passwordMatches("temporary-test-password", "invalid-hash"), false);
});

test("a persistent session requires an active membership in an active school", () => {
  const now = new Date("2026-08-05T16:00:00.000Z");
  const baseSession = {
    expiresAt: new Date("2026-08-05T17:00:00.000Z"),
    revokedAt: null,
    sessionUserId: "user-1",
    membershipUserId: "user-1",
    membershipStatus: "ACTIVE",
    schoolActive: true,
  };

  assert.equal(isSessionUsable(baseSession, now), true);
  assert.equal(isSessionUsable({ ...baseSession, membershipStatus: "SUSPENDED" }, now), false);
  assert.equal(isSessionUsable({ ...baseSession, schoolActive: false }, now), false);
  assert.equal(isSessionUsable({ ...baseSession, membershipUserId: "user-2" }, now), false);
});

test("expired or revoked sessions are rejected", () => {
  const now = new Date("2026-08-05T16:00:00.000Z");
  const baseSession = {
    expiresAt: new Date("2026-08-05T17:00:00.000Z"),
    revokedAt: null,
    sessionUserId: "user-1",
    membershipUserId: "user-1",
    membershipStatus: "ACTIVE",
    schoolActive: true,
  };

  assert.equal(
    isSessionUsable({ ...baseSession, expiresAt: new Date("2026-08-05T15:59:59.000Z") }, now),
    false,
  );
  assert.equal(
    isSessionUsable({ ...baseSession, revokedAt: new Date("2026-08-05T15:30:00.000Z") }, now),
    false,
  );
});
