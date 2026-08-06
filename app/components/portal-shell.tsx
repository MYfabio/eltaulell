import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

type PortalShellProps = {
  viewer: DemoViewer;
  active: "board" | "coordination" | "tutoring" | "student" | "calendar" | "queries" | "integrations";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function PortalShell({
  viewer,
  active,
  eyebrow,
  title,
  description,
  children,
}: PortalShellProps) {
  return (
    <main className="portal-page">
      <header className="portal-topbar">
        <Link className="portal-brand" href="/taulell">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <nav aria-label="Navegació del portal">
          <Link className={active === "board" ? "active" : ""} href="/taulell">
            Tauler
          </Link>
          {can(viewer, PERMISSIONS.MANAGE_SCHOOL) && (
            <Link
              className={active === "coordination" ? "active" : ""}
              href="/coordinacio"
            >
              Coordinació
            </Link>
          )}
          {can(viewer, PERMISSIONS.VIEW_GROUP_DASHBOARD) && (
            <Link
              className={active === "tutoring" ? "active" : ""}
              href="/tutoria"
            >
              Grup
            </Link>
          )}
          {can(viewer, PERMISSIONS.VIEW_OWN_SPACE) && (
            <Link
              className={active === "student" ? "active" : ""}
              href="/alumnat"
            >
              El meu espai
            </Link>
          )}
          <Link className={active === "calendar" ? "active" : ""} href="/calendari">
            Calendari
          </Link>
          {can(viewer, PERMISSIONS.SUBMIT_ANONYMOUS_QUERY) && (
            <Link className={active === "queries" ? "active" : ""} href="/consultes">
              Consultes
            </Link>
          )}
          {can(viewer, PERMISSIONS.MANAGE_INTEGRATIONS) && (
            <Link
              className={active === "integrations" ? "active" : ""}
              href="/integracions"
            >
              Integracions
            </Link>
          )}
        </nav>
        <div className="portal-user">
          <span>{viewer.initials}</span>
          <div>
            <strong>{viewer.name}</strong>
            <small>{viewer.roleLabel}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Sortir</button>
          </form>
        </div>
      </header>

      <section className="portal-heading">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </section>

      <div className="portal-content">{children}</div>
    </main>
  );
}
