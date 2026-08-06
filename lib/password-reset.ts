import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { passwordIsStrongEnough } from "@/lib/account-auth";
import { createPasswordHash } from "@/lib/credential-policy";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_DURATION_MS = 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl() {
  return (process.env.APP_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  }) as { id: string; email: string } | null;
  if (!user) return;
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + RESET_DURATION_MS),
    },
  });
  const resetUrl = `${baseUrl()}/restablir-contrasenya?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl, userId: user.id });
}

export async function resetPassword(token: string, password: string) {
  if (!passwordIsStrongEnough(password)) return { error: "WEAK_PASSWORD" } as const;
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: { id: true } } },
  }) as { id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null;
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return { error: "INVALID_TOKEN" } as const;
  }
  await db.$transaction(async (transaction) => {
    await transaction.passwordCredential.upsert({
      where: { userId: record.userId },
      update: {
        passwordHash: createPasswordHash(password),
        failedAttempts: 0,
        lockedUntil: null,
        passwordSetAt: new Date(),
      },
      create: { userId: record.userId, passwordHash: createPasswordHash(password) },
    });
    await transaction.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await transaction.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
  return { success: true } as const;
}
