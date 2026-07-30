CREATE TYPE "MembershipRole" AS ENUM ('COORDINATOR', 'TUTOR', 'DELEGATE', 'STUDENT');
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "GroupMemberRole" AS ENUM ('TUTOR', 'DELEGATE', 'STUDENT');
CREATE TYPE "PostItStatus" AS ENUM ('OPEN', 'ARCHIVED');
CREATE TYPE "PostItType" AS ENUM ('NOTICE', 'TASK', 'ACTIVITY', 'MATERIAL', 'QUESTION');
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_CLASSROOM', 'MOODLE');
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR');
CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE');

CREATE TABLE "School" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "emailDomain" TEXT,
  "moodleBaseUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolMembership" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Group" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "section" TEXT,
  "academicYear" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupMembership" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "schoolMembershipId" TEXT NOT NULL,
  "role" "GroupMemberRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Board" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostIt" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "PostItType" NOT NULL DEFAULT 'NOTICE',
  "status" "PostItStatus" NOT NULL DEFAULT 'OPEN',
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "boardId" TEXT NOT NULL,
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PostIt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "groupId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "provider" "IntegrationProvider",
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "baseUrl" TEXT,
  "externalTenantId" TEXT,
  "settings" JSONB,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalCourse" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "IdentityProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "accessTokenCiphertext" TEXT,
  "refreshTokenCiphertext" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "scopes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "SchoolMembership_schoolId_userId_key" ON "SchoolMembership"("schoolId", "userId");
CREATE INDEX "SchoolMembership_schoolId_role_idx" ON "SchoolMembership"("schoolId", "role");
CREATE INDEX "SchoolMembership_userId_status_idx" ON "SchoolMembership"("userId", "status");
CREATE UNIQUE INDEX "Group_schoolId_academicYear_name_key" ON "Group"("schoolId", "academicYear", "name");
CREATE INDEX "Group_schoolId_idx" ON "Group"("schoolId");
CREATE UNIQUE INDEX "GroupMembership_groupId_schoolMembershipId_key" ON "GroupMembership"("groupId", "schoolMembershipId");
CREATE INDEX "GroupMembership_schoolMembershipId_idx" ON "GroupMembership"("schoolMembershipId");
CREATE UNIQUE INDEX "Board_groupId_key" ON "Board"("groupId");
CREATE INDEX "PostIt_boardId_status_createdAt_idx" ON "PostIt"("boardId", "status", "createdAt");
CREATE INDEX "PostIt_authorId_idx" ON "PostIt"("authorId");
CREATE INDEX "CalendarEvent_schoolId_startsAt_idx" ON "CalendarEvent"("schoolId", "startsAt");
CREATE INDEX "CalendarEvent_groupId_startsAt_idx" ON "CalendarEvent"("groupId", "startsAt");
CREATE UNIQUE INDEX "IntegrationConnection_schoolId_provider_key" ON "IntegrationConnection"("schoolId", "provider");
CREATE INDEX "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");
CREATE UNIQUE INDEX "ExternalCourse_provider_externalId_key" ON "ExternalCourse"("provider", "externalId");
CREATE INDEX "ExternalCourse_groupId_provider_idx" ON "ExternalCourse"("groupId", "provider");
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_schoolId_email_idx" ON "Invitation"("schoolId", "email");
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_schoolMembershipId_fkey" FOREIGN KEY ("schoolMembershipId") REFERENCES "SchoolMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Board" ADD CONSTRAINT "Board_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostIt" ADD CONSTRAINT "PostIt_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostIt" ADD CONSTRAINT "PostIt_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCourse" ADD CONSTRAINT "ExternalCourse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
