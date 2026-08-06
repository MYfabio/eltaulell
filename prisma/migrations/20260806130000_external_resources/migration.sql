CREATE TABLE "ExternalResource" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "externalCourseId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceType" TEXT NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalResource_provider_externalId_key" ON "ExternalResource"("provider", "externalId");
CREATE INDEX "ExternalResource_schoolId_groupId_provider_idx" ON "ExternalResource"("schoolId", "groupId", "provider");
CREATE INDEX "ExternalResource_externalCourseId_idx" ON "ExternalResource"("externalCourseId");

ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_externalCourseId_fkey" FOREIGN KEY ("externalCourseId") REFERENCES "ExternalCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
