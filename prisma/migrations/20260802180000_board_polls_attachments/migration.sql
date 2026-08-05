CREATE TYPE "BoardPollStatus" AS ENUM ('PENDING_APPROVAL', 'OPEN', 'CLOSED', 'PUBLISHED');

CREATE TABLE "BoardPoll" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "anonymous" BOOLEAN NOT NULL DEFAULT true,
  "status" "BoardPollStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "closesAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdByRole" TEXT NOT NULL,
  "validatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BoardPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "BoardPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardPollVote" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "voterKey" TEXT NOT NULL,
  "voterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardPollVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardAttachment" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "caption" TEXT,
  "storageKey" TEXT,
  "storageProvider" TEXT NOT NULL DEFAULT 'POSTGRESQL',
  "content" BYTEA,
  "uploadedById" TEXT,
  "uploadedByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BoardAttachment_storage_check" CHECK ("storageKey" IS NOT NULL OR "content" IS NOT NULL)
);

CREATE INDEX "BoardPoll_boardId_status_createdAt_idx" ON "BoardPoll"("boardId", "status", "createdAt");
CREATE INDEX "BoardPoll_createdById_idx" ON "BoardPoll"("createdById");
CREATE INDEX "BoardPoll_validatedById_idx" ON "BoardPoll"("validatedById");
CREATE UNIQUE INDEX "BoardPollOption_pollId_position_key" ON "BoardPollOption"("pollId", "position");
CREATE INDEX "BoardPollOption_pollId_idx" ON "BoardPollOption"("pollId");
CREATE UNIQUE INDEX "BoardPollVote_pollId_voterKey_key" ON "BoardPollVote"("pollId", "voterKey");
CREATE INDEX "BoardPollVote_optionId_idx" ON "BoardPollVote"("optionId");
CREATE INDEX "BoardPollVote_voterId_idx" ON "BoardPollVote"("voterId");
CREATE UNIQUE INDEX "BoardAttachment_storageKey_key" ON "BoardAttachment"("storageKey");
CREATE INDEX "BoardAttachment_boardId_createdAt_idx" ON "BoardAttachment"("boardId", "createdAt");
CREATE INDEX "BoardAttachment_uploadedById_idx" ON "BoardAttachment"("uploadedById");

ALTER TABLE "BoardPoll" ADD CONSTRAINT "BoardPoll_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardPoll" ADD CONSTRAINT "BoardPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardPoll" ADD CONSTRAINT "BoardPoll_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardPollOption" ADD CONSTRAINT "BoardPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "BoardPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardPollVote" ADD CONSTRAINT "BoardPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "BoardPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardPollVote" ADD CONSTRAINT "BoardPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "BoardPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardPollVote" ADD CONSTRAINT "BoardPollVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardAttachment" ADD CONSTRAINT "BoardAttachment_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardAttachment" ADD CONSTRAINT "BoardAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
