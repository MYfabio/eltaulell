import "server-only";
import { dominiDe, enviarAvis, rolComu } from "@/lib/avisos";

import { db } from "@/lib/db";
import { issueAccountInvitation } from "@/lib/account-auth";
import type { AppRole } from "@/lib/permissions";

/**
 * Alta i baixa de persones des de l'administració de plataforma. Funcions de
 * servei: la pantalla les crida per a una persona i el canvi de curs
 * automatitzat les podrà cridar en bloc. Són idempotents (repetir-les no
 * duplica res ni dona error inesperat).
 *
 * L'auditoria (PlatformAuditLog) guarda el rol i recomptes, mai nom ni correu.
 */

const GROUP_ROLE: Partial<Record<AppRole, "TUTOR" | "DELEGATE" | "STUDENT">> = {
  TUTOR: "TUTOR",
  DELEGATE: "DELEGATE",
  STUDENT: "STUDENT",
};

export type AltaPreviaInput = {
  schoolId: string;
  name: string;
  email: string;
  role: AppRole;
  groupId?: string | null;
};

export type AltaPreviaResult =
  | { status: "created"; membershipId: string; userId: string; token: string; expiresAt: Date; schoolName: string }
  | { status: "exists" | "school_not_found" | "group_required" | "invalid_group" };

/**
 * Crea la persona al centre com a INVITED, amb el seu grup si en cal, i la
 * invitació per activar el compte (a El Taulell s'entra amb contrasenya). Si el
 * correu ja existeix a la plataforma, no es toca res.
 */
export async function altaPrevia(input: AltaPreviaInput, platformAdminId: string): Promise<AltaPreviaResult> {
  const email = input.email.trim().toLowerCase();
  const school = await db.school.findFirst({ where: { id: input.schoolId } });
  if (!school) return { status: "school_not_found" };
  const groupRole = GROUP_ROLE[input.role];
  const groupId = groupRole ? input.groupId || null : null;
  if (groupRole && !groupId) return { status: "group_required" };
  if (groupId) {
    const group = await db.group.findFirst({ where: { id: groupId, schoolId: school.id } });
    if (!group) return { status: "invalid_group" };
  }
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return { status: "exists" };

  try {
    return await db.$transaction(async (transaction) => {
      // L'usuari no existeix (comprovat abans); upsert per si dues altes coincideixen.
      const user = await transaction.user.upsert({
        where: { email },
        update: {},
        create: { name: input.name.trim(), email },
      });
      const existing = await transaction.schoolMembership.findUnique({
        where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      });
      if (existing) throw Object.assign(new Error("ALREADY_MEMBER"), { code: "P2002" });
      const membership = await transaction.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          role: input.role,
          status: "INVITED",
          groupMemberships: groupId && groupRole ? { create: { groupId, role: groupRole } } : undefined,
        },
      });
      const invitation = await issueAccountInvitation(transaction, { schoolId: school.id, email, role: input.role });
      await transaction.platformAuditLog.create({
        data: {
          platformAdminId,
          schoolId: school.id,
          action: "USER_PREREGISTERED",
          entityType: "SchoolMembership",
          entityId: membership.id,
          metadata: { role: input.role },
        },
      });
      void enviarAvis({ tipus: "alta.solicitud", centre: dominiDe(email), datos: { rol: rolComu(input.role) } });
      return {
        status: "created" as const,
        membershipId: membership.id as string,
        userId: user.id as string,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        schoolName: school.name as string,
      };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { status: "exists" };
    throw error;
  }
}

export type BaixaMode = "suspendre" | "reactivar" | "esborrar";

export type BaixaResult =
  | { status: "ok"; mode: BaixaMode; userDeleted: boolean; learningTasks: number }
  | { status: "not_found" | "self" | "platform_admin" | "last_coordinator" };

/**
 * Baixa d'una pertinença al centre.
 * - suspendre: no pot entrar i se li tanquen les sessions; tot es conserva.
 * - reactivar: torna a ACTIVE (o a INVITED si encara no havia activat el compte).
 * - esborrar: s'esborra la pertinença i el que és seu (grups, sessions, les seves
 *   tasques i l'ús d'IA) i, si no és de cap altre centre, el compte. Els
 *   missatges, enquestes i fitxers del tauler es queden sense autor.
 * Mai sobre qui actua, una administració de plataforma ni l'última coordinació activa.
 */
export async function baixa(
  membershipId: string,
  mode: BaixaMode,
  actor: { platformAdminId: string; userId: string },
): Promise<BaixaResult> {
  const membership = await db.schoolMembership.findFirst({ where: { id: membershipId }, include: { user: true } });
  if (!membership) return { status: "not_found" };
  if (membership.userId === actor.userId) return { status: "self" };
  if (await db.platformAdmin.findFirst({ where: { userId: membership.userId } })) return { status: "platform_admin" };

  if (mode !== "reactivar" && membership.role === "COORDINATOR" && membership.status === "ACTIVE") {
    const coordinators = await db.schoolMembership.count({
      where: { schoolId: membership.schoolId, role: "COORDINATOR", status: "ACTIVE" },
    });
    if (coordinators <= 1) return { status: "last_coordinator" };
  }

  if (mode === "suspendre" || mode === "reactivar") {
    let status: "SUSPENDED" | "ACTIVE" | "INVITED" = "SUSPENDED";
    if (mode === "reactivar") {
      const credential = await db.passwordCredential.findUnique({ where: { userId: membership.userId } });
      status = credential ? "ACTIVE" : "INVITED";
    }
    await db.$transaction(async (transaction) => {
      await transaction.schoolMembership.update({ where: { id: membership.id }, data: { status } });
      if (status !== "ACTIVE") {
        await transaction.session.updateMany({
          where: { schoolMembershipId: membership.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await transaction.platformAuditLog.create({
        data: {
          platformAdminId: actor.platformAdminId,
          schoolId: membership.schoolId,
          action: mode === "suspendre" ? "USER_SUSPENDED" : "USER_REACTIVATED",
          entityType: "SchoolMembership",
          entityId: membership.id,
          metadata: { role: membership.role },
        },
      });
    });
    const centreAvis = dominiDe(membership.user.email);
    if (mode === "reactivar") void enviarAvis({ tipus: "alta.validada", centre: centreAvis, datos: { rol: rolComu(membership.role) } });
    else void enviarAvis({ tipus: "baixa", centre: centreAvis, datos: { rol: rolComu(membership.role) } });
    return { status: "ok", mode, userDeleted: false, learningTasks: 0 };
  }

  const tasks = await db.learningTask.findMany({ where: { studentMembershipId: membership.id }, select: { id: true } });
  const email = String(membership.user.email).toLowerCase();
  const userDeleted = await db.$transaction(async (transaction) => {
    await transaction.invitation.deleteMany({ where: { schoolId: membership.schoolId, email } });
    await transaction.schoolMembership.delete({ where: { id: membership.id } });
    const others = await transaction.schoolMembership.count({ where: { userId: membership.userId } });
    if (others === 0) await transaction.user.delete({ where: { id: membership.userId } });
    await transaction.platformAuditLog.create({
      data: {
        platformAdminId: actor.platformAdminId,
        schoolId: membership.schoolId,
        action: "USER_DELETED",
        entityType: "SchoolMembership",
        entityId: membership.id,
        metadata: { role: membership.role, userDeleted: others === 0, learningTasks: tasks.length },
      },
    });
    return others === 0;
  });
  void enviarAvis({ tipus: "baixa", centre: dominiDe(email), datos: { rol: rolComu(membership.role) } });
  return { status: "ok", mode, userDeleted, learningTasks: tasks.length };
}
