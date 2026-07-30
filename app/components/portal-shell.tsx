import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoViewer } from "@/lib/demo-auth";

type PortalShellProps = {
  viewer: DemoViewer;
  active: "board" | "coordination" | "tutoring" | "student" | "integrations";
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
          {viewer.role === "COORDINATOR" && (
            <Link
              className={active === "coordination" ? "active" : ""}
              href="/coordinacio"
            >
              Coordinació
            </Link>
          )}
          {["COORDINATOR", "TUTOR", "DELEGATE"].includes(viewer.role) && (
            <Link
              className={active === "tutoring" ? "active" : ""}
              href="/tutoria"
            >
              Grup
            </Link>
          )}
          <Link
            className={active === "student" ? "active" : ""}
            href="/alumnat"
          >
            El meu espai
          </Link>
          {viewer.role === "COORDINATOR" && (
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
          <Link href="/api/auth/logout">Sortir</Link>
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
