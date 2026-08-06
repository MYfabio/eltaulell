import PortalShell from "@/app/components/portal-shell";
import CalendarClient from "@/app/calendari/calendar-client";
import { listAccessibleBoards } from "@/lib/access-control";
import { listCalendarEvents } from "@/lib/calendar";
import { requireDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const viewer = await requireDemoViewer();
  const [events, groups] = await Promise.all([
    listCalendarEvents(viewer, new Date(Date.now() - 30 * 24 * 60 * 60_000)),
    listAccessibleBoards(viewer),
  ]);
  return (
    <PortalShell
      active="calendar"
      description="Agenda del centre i del grup, amb esdeveniments propis i sincronitzats."
      eyebrow={`${viewer.school.toUpperCase()} · AGENDA`}
      title="Calendari"
      viewer={viewer}
    >
      <CalendarClient canManage={can(viewer, PERMISSIONS.MANAGE_CALENDAR)} groups={groups} initialEvents={events} />
    </PortalShell>
  );
}
