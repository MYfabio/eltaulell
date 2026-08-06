ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'IEDUCA';

CREATE TYPE "LearningTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'GRADED');
CREATE TYPE "AiRiskLevel" AS ENUM ('NONE', 'CONCERN', 'URGENT');
CREATE TYPE "AnonymousQueryStatus" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED');
CREATE TYPE "AnonymousMessageAuthor" AS ENUM ('STUDENT_ANONYMOUS', 'TUTOR', 'COORDINATOR', 'SYSTEM');
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'ERROR');
CREATE TYPE "SyncDirection" AS ENUM ('PULL', 'PUSH', 'BIDIRECTIONAL');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "PlatformAdmin"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "IntegrationConnection"
  ADD COLUMN "accessTokenCiphertext" TEXT,
  ADD COLUMN "refreshTokenCiphertext" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "webhookSecretCiphertext" TEXT;

CREATE TABLE "LearningTask" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "studentMembershipId" TEXT NOT NULL,
  "externalCourseId" TEXT,
  "provider" "IntegrationProvider",
  "externalId" TEXT,
  "externalSubmissionId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "status" "LearningTaskStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),
  "grade" DOUBLE PRECISION,
  "maximumGrade" DOUBLE PRECISION,
  "teacherFeedback" TEXT,
  "resourceUrl" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "studentMembershipId" TEXT NOT NULL,
  "sessionKeyHash" TEXT NOT NULL,
  "subject" TEXT,
  "taskId" TEXT,
  "questionCount" INTEGER NOT NULL DEFAULT 1,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "repeatedHelpSignal" BOOLEAN NOT NULL DEFAULT false,
  "riskLevel" "AiRiskLevel" NOT NULL DEFAULT 'NONE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnonymousQuery" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "accessTokenHash" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "AnonymousQueryStatus" NOT NULL DEFAULT 'OPEN',
  "assignedRole" "MembershipRole",
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnonymousQuery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnonymousQueryMessage" (
  "id" TEXT NOT NULL,
  "queryId" TEXT NOT NULL,
  "authorKind" "AnonymousMessageAuthor" NOT NULL,
  "responderId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnonymousQueryMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSyncJob" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "direction" "SyncDirection" NOT NULL DEFAULT 'PULL',
  "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "cursor" TEXT,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "recipient" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "providerId" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataRetentionPolicy" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "taskRetentionDays" INTEGER NOT NULL DEFAULT 730,
  "aiUsageRetentionDays" INTEGER NOT NULL DEFAULT 90,
  "queryRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "auditRetentionDays" INTEGER NOT NULL DEFAULT 730,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemErrorLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT,
  "requestId" TEXT,
  "source" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningTask_studentMembershipId_provider_externalId_key" ON "LearningTask"("studentMembershipId", "provider", "externalId");
CREATE INDEX "LearningTask_schoolId_groupId_status_idx" ON "LearningTask"("schoolId", "groupId", "status");
CREATE INDEX "LearningTask_studentMembershipId_dueAt_idx" ON "LearningTask"("studentMembershipId", "dueAt");
CREATE INDEX "LearningTask_provider_externalSubmissionId_idx" ON "LearningTask"("provider", "externalSubmissionId");
CREATE INDEX "AiUsageEvent_schoolId_groupId_createdAt_idx" ON "AiUsageEvent"("schoolId", "groupId", "createdAt");
CREATE INDEX "AiUsageEvent_studentMembershipId_createdAt_idx" ON "AiUsageEvent"("studentMembershipId", "createdAt");
CREATE INDEX "AiUsageEvent_sessionKeyHash_createdAt_idx" ON "AiUsageEvent"("sessionKeyHash", "createdAt");
CREATE UNIQUE INDEX "AnonymousQuery_publicReference_key" ON "AnonymousQuery"("publicReference");
CREATE UNIQUE INDEX "AnonymousQuery_accessTokenHash_key" ON "AnonymousQuery"("accessTokenHash");
CREATE INDEX "AnonymousQuery_schoolId_status_createdAt_idx" ON "AnonymousQuery"("schoolId", "status", "createdAt");
CREATE INDEX "AnonymousQuery_groupId_status_createdAt_idx" ON "AnonymousQuery"("groupId", "status", "createdAt");
CREATE INDEX "AnonymousQueryMessage_queryId_createdAt_idx" ON "AnonymousQueryMessage"("queryId", "createdAt");
CREATE INDEX "AnonymousQueryMessage_responderId_idx" ON "AnonymousQueryMessage"("responderId");
CREATE INDEX "IntegrationSyncJob_schoolId_provider_status_idx" ON "IntegrationSyncJob"("schoolId", "provider", "status");
CREATE INDEX "IntegrationSyncJob_connectionId_createdAt_idx" ON "IntegrationSyncJob"("connectionId", "createdAt");
CREATE INDEX "EmailDelivery_recipient_createdAt_idx" ON "EmailDelivery"("recipient", "createdAt");
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE UNIQUE INDEX "DataRetentionPolicy_schoolId_key" ON "DataRetentionPolicy"("schoolId");
CREATE INDEX "SystemErrorLog_schoolId_createdAt_idx" ON "SystemErrorLog"("schoolId", "createdAt");
CREATE INDEX "SystemErrorLog_code_createdAt_idx" ON "SystemErrorLog"("code", "createdAt");

ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_studentMembershipId_fkey" FOREIGN KEY ("studentMembershipId") REFERENCES "SchoolMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_externalCourseId_fkey" FOREIGN KEY ("externalCourseId") REFERENCES "ExternalCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_studentMembershipId_fkey" FOREIGN KEY ("studentMembershipId") REFERENCES "SchoolMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnonymousQuery" ADD CONSTRAINT "AnonymousQuery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnonymousQuery" ADD CONSTRAINT "AnonymousQuery_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnonymousQueryMessage" ADD CONSTRAINT "AnonymousQueryMessage_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "AnonymousQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnonymousQueryMessage" ADD CONSTRAINT "AnonymousQueryMessage_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncJob" ADD CONSTRAINT "IntegrationSyncJob_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncJob" ADD CONSTRAINT "IntegrationSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemErrorLog" ADD CONSTRAINT "SystemErrorLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
