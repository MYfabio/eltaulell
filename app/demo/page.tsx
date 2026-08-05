import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_VIEWERS, isDemoAccessEnabled } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

const roleDetails = [
  {
    role: "Coordinació",
    marker: "C",
    summary: "Té la visió global del centre.",
    detail: "Gestiona persones, grups, permisos i integracions, i consulta els taulells en mode observador.",
  },
  {
    role: "Tutoria",
    marker: "T",
    summary: "Acompanya i modera el seu grup.",
    detail: "Publica tasques, valida consultes, revisa el progrés i rep indicadors anònims d'ús de l'assistent.",
  },
  {
    role: "Delegació",
    marker: "D",
    summary: "Dona veu i dinamisme a la classe.",
    detail: "Organitza post-its, proposa activitats i crea consultes dins del seu grup, sempre amb moderació.",
  },
  {
    role: "Alumnat",
    marker: "A",
    summary: "Treballa des del seu taulell.",
    detail: "Organitza tasques, participa en consultes i demana orientació a l'assistent sense rebre respostes fetes.",
  },
];

const contactMessages = {
  sent: "Sol·licitud rebuda. Et contactarem per preparar l'accés a la demo.",
  invalid: "Revisa les dades del formulari i torna-ho a provar.",
  limited: "S'han enviat massa sol·licituds. Torna-ho a provar més tard.",
};

export default async function DemoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string | string[] }>;
}) {
  if (!isDemoAccessEnabled()) notFound();
  const student = DEMO_VIEWERS.find((viewer) => viewer.role === "STUDENT");
  if (!student) notFound();
  const params = await searchParams;
  const contact = Array.isArray(params.contact) ? params.contact[0] : params.contact;
  const contactMessage = contact && Object.hasOwn(contactMessages, contact)
    ? contactMessages[contact as keyof typeof contactMessages]
    : null;

  return (
    <main className="access-page demo-access-page">
      <header className="access-header">
        <Link className="portal-brand" href="/">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <Link className="demo-back-link" href="/acces">
          Tornar a l'accés real
        </Link>
      </header>

      <section className="access-hero demo-hero">
        <p>DEMO PÚBLICA · PERFIL D'ALUMNE</p>
        <h1>Descobreix El Taulell des de l'aula.</h1>
        <span>
          Entra directament en un taulell d'alumne amb dades de prova. No cal
          registrar-se i cap acció afecta centres reals.
        </span>
      </section>

      <section className="student-demo-entry">
        <div className="student-demo-avatar">{student.initials}</div>
        <div>
          <span>ACCÉS IMMEDIAT</span>
          <h2>Prova el taulell d'un alumne</h2>
          <p>
            Organitza els post-its, revisa les tasques i explora l'assistent
            d'orientació tal com ho faria un estudiant.
          </p>
        </div>
        <form action="/api/auth/demo" method="post">
          <input name="userId" type="hidden" value={student.id} />
          <button type="submit">Entrar a la demo d'alumne</button>
        </form>
      </section>

      <section className="demo-roles-section">
        <header>
          <p>ROLS I PERMISOS</p>
          <h2>Què fa cada persona?</h2>
          <span>Cada rol veu només les funcions i els grups que necessita.</span>
        </header>
        <div className="demo-role-explainers">
          {roleDetails.map((item) => (
            <article key={item.role}>
              <div>{item.marker}</div>
              <span>{item.role}</span>
              <h3>{item.summary}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-contact-section" id="sollicitar-demo">
        <div>
          <p>DEMO COMPLETA PER A CENTRES</p>
          <h2>Vols provar un altre rol?</h2>
          <span>
            Envia'ns les teves dades i prepararem un accés individual amb el
            perfil que vulguis valorar. Rebràs un enllaç segur per crear la teva
            pròpia contrasenya.
          </span>
          <small>
            No incloguis noms ni informació d'alumnes. Les dades s'utilitzen
            només per gestionar aquesta sol·licitud i s'eliminen al cap de 90 dies.
          </small>
        </div>
        <form action="/api/demo-requests" method="post">
          <label>
            Nom i cognoms
            <input maxLength={100} name="name" required />
          </label>
          <label>
            Correu professional
            <input autoComplete="email" maxLength={180} name="email" required type="email" />
          </label>
          <label>
            Centre educatiu
            <input maxLength={140} name="schoolName" required />
          </label>
          <label>
            Perfil que vols provar
            <select defaultValue="TUTOR" name="requestedRole">
              <option value="COORDINATOR">Coordinació</option>
              <option value="TUTOR">Tutoria</option>
              <option value="DELEGATE">Delegació</option>
              <option value="STUDENT">Alumnat</option>
            </select>
          </label>
          <label className="demo-contact-message">
            Què t'interessa valorar? (opcional)
            <textarea maxLength={800} name="message" rows={4} />
          </label>
          <label className="demo-contact-consent">
            <input name="privacyAccepted" required type="checkbox" />
            <span>Accepto que El Taulell utilitzi aquestes dades per respondre la sol·licitud.</span>
          </label>
          <label className="demo-contact-trap" aria-hidden="true">
            Web
            <input autoComplete="off" name="website" tabIndex={-1} />
          </label>
          {contactMessage && (
            <p className={`demo-contact-status ${contact === "sent" ? "success" : "error"}`} role="status">
              {contactMessage}
            </p>
          )}
          <button type="submit">Sol·licitar una demo</button>
        </form>
      </section>
    </main>
  );
}
