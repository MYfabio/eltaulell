CREATE TABLE "GroupInvite" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdById" TEXT,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 30,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupInvite_codeHash_key" ON "GroupInvite"("codeHash");
CREATE INDEX "GroupInvite_schoolId_createdAt_idx" ON "GroupInvite"("schoolId", "createdAt");
CREATE INDEX "GroupInvite_groupId_active_expiresAt_idx" ON "GroupInvite"("groupId", "active", "expiresAt");
CREATE INDEX "GroupInvite_createdById_idx" ON "GroupInvite"("createdById");

ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
