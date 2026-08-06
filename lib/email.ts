import "server-only";

import { db } from "@/lib/db";

type EmailInput = {
  to: string;
  subject: string;
  template: string;
  text: string;
  html: string;
  userId?: string;
};

function providerConfigured() {
  return Boolean(process.env.EMAIL_HTTP_ENDPOINT?.trim() && process.env.EMAIL_HTTP_TOKEN?.trim());
}

export function isEmailConfigured() {
  return providerConfigured();
}

export async function sendSystemEmail(input: EmailInput) {
  const delivery = await db.emailDelivery.create({
    data: {
      userId: input.userId || null,
      recipient: input.to.toLowerCase(),
      template: input.template,
      subject: input.subject,
      status: "PENDING",
    },
  });
  if (!providerConfigured()) {
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: "EMAIL_PROVIDER_NOT_CONFIGURED" },
    });
    return { sent: false, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" } as const;
  }

  try {
    const response = await fetch(process.env.EMAIL_HTTP_ENDPOINT!.trim(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_HTTP_TOKEN!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM || "El Taulell <no-reply@aulaia.cat>",
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { id?: string; messageId?: string } | null;
    if (!response.ok) throw new Error(`EMAIL_HTTP_${response.status}`);
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerId: payload?.id || payload?.messageId || null,
        sentAt: new Date(),
        errorMessage: null,
      },
    });
    return { sent: true } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "EMAIL_SEND_FAILED";
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return { sent: false, reason: message } as const;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}

export async function sendInvitationEmail(input: {
  to: string;
  schoolName: string;
  activationUrl: string;
  userId?: string;
}) {
  const school = escapeHtml(input.schoolName);
  const url = escapeHtml(input.activationUrl);
  return sendSystemEmail({
    to: input.to,
    userId: input.userId,
    template: "ACCOUNT_INVITATION",
    subject: `Invitació a El Taulell · ${input.schoolName}`,
    text: `El centre ${input.schoolName} t'ha convidat a El Taulell. Activa el compte: ${input.activationUrl}`,
    html: `<h1>Benvingut/da a El Taulell</h1><p>El centre <strong>${school}</strong> t'ha convidat a la plataforma.</p><p><a href="${url}">Activar el compte</a></p><p>L'enllaç caduca al cap de set dies.</p>`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  userId: string;
}) {
  const url = escapeHtml(input.resetUrl);
  return sendSystemEmail({
    to: input.to,
    userId: input.userId,
    template: "PASSWORD_RESET",
    subject: "Restableix la contrasenya d'El Taulell",
    text: `Pots crear una contrasenya nova des d'aquest enllaç: ${input.resetUrl}`,
    html: `<h1>Restabliment de contrasenya</h1><p>Hem rebut una petició per canviar la teva contrasenya.</p><p><a href="${url}">Crear una contrasenya nova</a></p><p>Si no ho has demanat, ignora aquest correu.</p>`,
  });
}

export async function sendSystemNoticeEmail(input: {
  to: string;
  title: string;
  message: string;
  userId?: string;
}) {
  return sendSystemEmail({
    to: input.to,
    userId: input.userId,
    template: "SYSTEM_NOTICE",
    subject: `El Taulell · ${input.title}`,
    text: input.message,
    html: `<h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.message)}</p>`,
  });
}
