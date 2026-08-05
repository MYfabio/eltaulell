ALTER TABLE "Session"
  ADD COLUMN "schoolMembershipId" TEXT,
  ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_schoolMembershipId_fkey"
  FOREIGN KEY ("schoolMembershipId") REFERENCES "SchoolMembership"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Session_schoolMembershipId_expiresAt_idx"
  ON "Session"("schoolMembershipId", "expiresAt");

CREATE INDEX "Session_revokedAt_expiresAt_idx"
  ON "Session"("revokedAt", "expiresAt");
