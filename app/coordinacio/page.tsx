import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import { DEMO_VIEWERS, requireDemoPermission } from "@/lib/demo-auth";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CoordinationPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_SCHOOL);

  return (
    <PortalShell
      active="coordination"
      description="Gestiona el centre, els grups, les persones i els permisos des d’un únic espai."
      eyebrow={`${viewer.school.toUpperCase()} · CURS 2026–2027`}
      title="Coordinació del centre"
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">PERSONES ACTIVES</p>
          <div className="metric">
            <strong>486</strong>
            <span>+18 aquest curs</span>
          </div>
          <p>42 tutors i docents · 432 alumnes · 12 coordinadors i suport.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">GRUPS</p>
          <div className="metric">
            <strong>21</strong>
            <span>Tots operatius</span>
          </div>
          <p>ESO, Batxillerat i cicles. Cada grup té el seu tauler i calendari.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">CENTRES</p>
          <div className="metric">
            <strong>1</strong>
            <span>Preparat per créixer</span>
          </div>
          <p>El model permet afegir centres nous mantenint les dades separades.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">USUARIS DE PROVA</p>
          <h2>Perfils i permisos</h2>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Grup</th>
                <th>Permisos principals</th>
                <th>Estat</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_VIEWERS.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.name}</strong>
                    <br />
                    <small>{person.email}</small>
                  </td>
                  <td>{person.roleLabel}</td>
                  <td>{person.groupName}</td>
                  <td>
                    <div className="permission-chips">
                      {person.permissions.slice(0, 3).map((permission) => (
                        <span key={permission}>{PERMISSION_LABELS[permission]}</span>
                      ))}
                      {person.permissions.length > 3 && (
                        <span>+{person.permissions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td><span className="status-pill">Actiu</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ACCIONS RÀPIDES</p>
          <h2>Administració</h2>
          <div className="action-list">
            <button disabled type="button">Convidar persones · amb Google</button>
            <Link href="/tutoria">Revisar els grups</Link>
            <Link href="/integracions">Configurar integracions</Link>
          </div>
        </article>

        <article className="portal-panel full">
          <p className="panel-label">ARQUITECTURA MULTI-CENTRE</p>
          <h2>Dades separades i permisos per pertinença</h2>
          <p>
            Una mateixa persona pot pertànyer a més d’un centre amb rols
            diferents. Les consultes, grups, taulers i integracions sempre
            queden vinculats al centre corresponent.
          </p>
        </article>

        <article className="portal-panel full">
          <p className="panel-label">CONTROL D’ACCÉS</p>
          <h2>Els permisos es comproven dues vegades</h2>
          <div className="security-points">
            <p><strong>Interfície</strong><span>Cada perfil només veu les accions que pot utilitzar.</span></p>
            <p><strong>Servidor</strong><span>Les rutes i operacions rebutgen qualsevol accés no autoritzat.</span></p>
            <p><strong>Centre</strong><span>El rol sempre queda vinculat a la pertinença del centre corresponent.</span></p>
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
