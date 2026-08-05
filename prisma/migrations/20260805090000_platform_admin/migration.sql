CREATE TYPE "SchoolPlan" AS ENUM ('PILOT', 'STANDARD');

ALTER TABLE "School"
ADD COLUMN "plan" "SchoolPlan" NOT NULL DEFAULT 'PILOT',
ADD COLUMN "maxUsers" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "maxGroups" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE "PlatformAdmin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformAuditLog" (
  "id" TEXT NOT NULL,
  "platformAdminId" TEXT,
  "schoolId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAdmin_userId_key" ON "PlatformAdmin"("userId");
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");
CREATE INDEX "PlatformAuditLog_platformAdminId_idx" ON "PlatformAuditLog"("platformAdminId");
CREATE INDEX "PlatformAuditLog_schoolId_createdAt_idx" ON "PlatformAuditLog"("schoolId", "createdAt");

ALTER TABLE "PlatformAdmin"
ADD CONSTRAINT "PlatformAdmin_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog"
ADD CONSTRAINT "PlatformAuditLog_platformAdminId_fkey"
FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog"
ADD CONSTRAINT "PlatformAuditLog_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
