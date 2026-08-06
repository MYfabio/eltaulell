import PortalShell from "@/app/components/portal-shell";
import QueriesClient from "@/app/consultes/queries-client";
import { listAnonymousInbox } from "@/lib/anonymous-queries";
import { listAccessibleBoards } from "@/lib/access-control";
import { requireDemoPermission } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function QueriesPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.SUBMIT_ANONYMOUS_QUERY);
  const staff = can(viewer, PERMISSIONS.VIEW_ANONYMOUS_INBOX);
  const [groups, initialQueries] = await Promise.all([
    listAccessibleBoards(viewer),
    staff ? listAnonymousInbox(viewer) : Promise.resolve([]),
  ]);
  return (
    <PortalShell
      active="queries"
      description={staff
        ? "Respon, deriva o tanca peticions sense revelar la identitat de l'alumne."
        : "Demana ajuda amb un codi privat. La consulta no desa el teu usuari ni el teu nom."}
      eyebrow={`${viewer.school.toUpperCase()} · PRIVACITAT`}
      title={staff ? "Bandeja de consultes anònimes" : "Consulta anònima"}
      viewer={viewer}
    >
      <QueriesClient groups={groups} initialQueries={initialQueries} staff={staff} />
    </PortalShell>
  );
}
