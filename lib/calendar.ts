import "server-only";

import { getViewerAccessContext } from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

type CalendarRow = {
  id: string;
  schoolId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  provider: string | null;
  externalId: string | null;
};

function serializeEvent(event: CalendarRow) {
  return {
    id: event.id,
    groupId: event.groupId,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    source: event.provider || "EL_TAULELL",
    editable: !event.provider,
  };
}

export async function listCalendarEvents(viewer: DemoViewer, from?: Date, to?: Date) {
  const access = await getViewerAccessContext(viewer);
  const rows = await db.calendarEvent.findMany({
    where: {
      schoolId: access.schoolId,
      ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { startsAt: "asc" },
  }) as CalendarRow[];
  return rows
    .filter((event) => event.groupId === null || access.role === "COORDINATOR" || access.groupIds.includes(event.groupId))
    .map(serializeEvent);
}

async function validateManagedGroup(viewer: DemoViewer, groupId: string | null) {
  if (!can(viewer, PERMISSIONS.MANAGE_CALENDAR)) throw new Error("CALENDAR_FORBIDDEN");
  const access = await getViewerAccessContext(viewer);
  if (groupId) {
    const group = await db.group.findFirst({ where: { id: groupId, schoolId: access.schoolId } });
    if (!group || (access.role !== "COORDINATOR" && !access.groupIds.includes(groupId))) {
      throw new Error("CALENDAR_GROUP_FORBIDDEN");
    }
  }
  return access;
}

export async function createCalendarEvent(
  viewer: DemoViewer,
  input: { groupId: string | null; title: string; description?: string; startsAt: Date; endsAt?: Date | null },
) {
  const access = await validateManagedGroup(viewer, input.groupId);
  const event = await db.calendarEvent.create({
    data: {
      schoolId: access.schoolId,
      groupId: input.groupId,
      title: input.title,
      description: input.description || null,
      startsAt: input.startsAt,
      endsAt: input.endsAt || null,
      provider: null,
      externalId: null,
    },
  }) as CalendarRow;
  return serializeEvent(event);
}

async function requireManagedEvent(viewer: DemoViewer, id: string) {
  const access = await validateManagedGroup(viewer, null);
  const event = await db.calendarEvent.findFirst({ where: { id, schoolId: access.schoolId } }) as CalendarRow | null;
  if (!event || event.provider || (event.groupId && access.role !== "COORDINATOR" && !access.groupIds.includes(event.groupId))) {
    throw new Error("CALENDAR_EVENT_NOT_FOUND");
  }
  return { access, event };
}

export async function updateCalendarEvent(
  viewer: DemoViewer,
  id: string,
  input: { groupId?: string | null; title?: string; description?: string; startsAt?: Date; endsAt?: Date | null },
) {
  const { event } = await requireManagedEvent(viewer, id);
  if (input.groupId !== undefined) await validateManagedGroup(viewer, input.groupId);
  const updated = await db.calendarEvent.update({
    where: { id },
    data: {
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    },
  }) as CalendarRow;
  return serializeEvent(updated || event);
}

export async function deleteCalendarEvent(viewer: DemoViewer, id: string) {
  const { access } = await requireManagedEvent(viewer, id);
  const result = await db.calendarEvent.deleteMany({ where: { id, schoolId: access.schoolId } });
  if (result.count !== 1) throw new Error("CALENDAR_EVENT_NOT_FOUND");
}
