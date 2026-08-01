import Link from "next/link";
import { getDemoViewer } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  const viewer = await getDemoViewer();

  return (
    <main className="permission-page">
      <section className="permission-card">
        <span className="permission-lock" aria-hidden="true">T</span>
        <p className="panel-label">ACCÉS PROTEGIT</p>
        <h1>Aquest espai no correspon al teu perfil.</h1>
        <p>
          {viewer
            ? `Has entrat com a ${viewer.roleLabel.toLowerCase()}. Només veuràs les funcions autoritzades per aquest rol.`
            : "Inicia sessió amb un perfil per continuar."}
        </p>
        <div className="permission-actions">
          <Link href={viewer ? "/taulell" : "/acces"}>
            {viewer ? "Tornar al tauler" : "Anar a l’accés"}
          </Link>
          {viewer && <Link href="/acces">Canviar de perfil</Link>}
        </div>
      </section>
    </main>
  );
}
