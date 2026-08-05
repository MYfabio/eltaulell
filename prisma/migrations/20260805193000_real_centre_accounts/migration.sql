-- Add password credentials for centre accounts. Passwords are never stored in
-- clear text; the application writes salted scrypt hashes to this table.
CREATE TABLE "PasswordCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "passwordSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordCredential_userId_key"
  ON "PasswordCredential"("userId");
CREATE INDEX "PasswordCredential_lockedUntil_idx"
  ON "PasswordCredential"("lockedUntil");

ALTER TABLE "PasswordCredential"
  ADD CONSTRAINT "PasswordCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Older bootstrap code could create the sample 3r B board inside a real school.
-- Remove only unmistakable sample posts and an otherwise empty sample group.
DELETE FROM "PostIt" AS post
USING "Board" AS board, "Group" AS school_group, "School" AS school
WHERE post."boardId" = board."id"
  AND board."groupId" = school_group."id"
  AND school_group."schoolId" = school."id"
  AND school."slug" <> 'institut-can-roca'
  AND (
    post."id" LIKE '%-welcome-notice'
    OR post."id" LIKE '%-math-task'
    OR post."id" LIKE '%-sports-activity'
    OR post."id" LIKE '%-history-material'
  );

DELETE FROM "Group" AS school_group
WHERE school_group."name" = '3r B'
  AND school_group."stage" = '3r ESO'
  AND school_group."academicYear" = '2026-2027'
  AND EXISTS (
    SELECT 1 FROM "School" AS school
    WHERE school."id" = school_group."schoolId"
      AND school."slug" <> 'institut-can-roca'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "GroupMembership" AS member
    WHERE member."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Board" AS board
    JOIN "PostIt" AS post ON post."boardId" = board."id"
    WHERE board."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "CalendarEvent" AS event
    WHERE event."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "ExternalCourse" AS course
    WHERE course."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "GroupInvite" AS invite
    WHERE invite."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Board" AS board
    JOIN "BoardPoll" AS poll ON poll."boardId" = board."id"
    WHERE board."groupId" = school_group."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Board" AS board
    JOIN "BoardAttachment" AS attachment ON attachment."boardId" = board."id"
    WHERE board."groupId" = school_group."id"
  );
