import { redirect } from "next/navigation";
import PortalShell from "@/app/components/portal-shell";
import DemoRequestsClient from "@/app/coordinacio/sollicituds-demo/requests-client";
import { isConfiguredCentreAdminEmail } from "@/lib/centre-admin-auth";
import { requireDemoPermission } from "@/lib/demo-auth";
import { listDemoRequests } from "@/lib/demo-requests";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DemoRequestsPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_SCHOOL);
  if (!isConfiguredCentreAdminEmail(viewer.email)) redirect("/sense-permis");
  const requests = await listDemoRequests();

  return (
    <PortalShell
      active="coordination"
      description="Revisa els contactes rebuts i genera un accés individual al centre de demostració."
      eyebrow="DEMO COMERCIAL · ACCÉS RESTRINGIT"
      title="Sol·licituds de demo"
      viewer={viewer}
    >
      <DemoRequestsClient initialRequests={requests} />
    </PortalShell>
  );
}
