CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'INVITED', 'CLOSED');

CREATE TABLE "DemoRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "requestedRole" "MembershipRole" NOT NULL DEFAULT 'STUDENT',
  "message" TEXT,
  "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
  "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
  "invitationExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemoRequest_status_createdAt_idx"
  ON "DemoRequest"("status", "createdAt");

CREATE INDEX "DemoRequest_email_createdAt_idx"
  ON "DemoRequest"("email", "createdAt");
