import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const functions = [
  {
    number: "01",
    title: "Suro digital",
    text: "Avisos, tasques, activitats i idees de classe ordenades en un espai visual i compartit.",
  },
  {
    number: "02",
    title: "Consultes anònimes",
    text: "Un canal discret perquè l’alumnat pugui expressar dubtes o demanar ajuda amb més confiança.",
  },
  {
    number: "03",
    title: "Calendari comú",
    text: "Dates, lliuraments i activitats visibles per a tot el grup, sense perdre informació pel camí.",
  },
  {
    number: "04",
    title: "Rols ben definits",
    text: "Vistes i permisos adaptats per a coordinació, tutoria, delegació i alumnat.",
  },
  {
    number: "05",
    title: "Classroom i Moodle",
    text: "Connexions preparades per reunir cursos i tasques sense substituir les plataformes del centre.",
  },
  {
    number: "06",
    title: "Assistent orientador",
    text: "Ajuda a pensar el següent pas, fa preguntes i deriva al tutor quan cal; mai no fa la feina per l’alumne.",
  },
];

const audiences = [
  {
    label: "Centres educatius",
    text: "Escoles, instituts i centres de formació que volen una eina adaptable a diversos grups i seus.",
  },
  {
    label: "Equips educatius",
    text: "Coordinació i tutories amb una visió més clara dels avisos, les necessitats i el seguiment.",
  },
  {
    label: "Alumnat",
    text: "Delegats i estudiants amb més veu, participació i autonomia dins d’un entorn segur.",
  },
];

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="El Taulell, inici">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>

        <nav aria-label="Navegació principal">
          <a href="#que-es">Què és</a>
          <a href="#funcions">Funcions</a>
          <a href="#convivencia">Convivència</a>
          <a href="#destinataris">Per a qui</a>
        </nav>

        <Link className="landing-access" href="/acces">
          Accedir <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">
            Plataforma educativa multi-centre
          </p>
          <h1 id="landing-title">
            La vida del centre,
            <br />
            <em>clara i compartida.</em>
          </h1>
          <p className="landing-lead">
            Un únic espai per escoltar l’alumnat, coordinar la tutoria i
            tenir a mà tot el que passa a classe.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" href="/acces">
              Provar els perfils <span aria-hidden="true">→</span>
            </Link>
            <a className="landing-secondary" href="#que-es">
              Descobrir El Taulell
            </a>
          </div>
          <p className="landing-demo-note">
            Demostració oberta per a coordinació, tutoria, delegació i alumnat
          </p>
        </div>

        <div className="landing-visual">
          <div className="landing-image-frame">
            <Image
              src="/og.png"
              alt="El Taulell representat com un suro de classe amb notes de colors"
              width={1733}
              height={909}
              priority
              sizes="(max-width: 900px) 92vw, 52vw"
            />
          </div>
          <aside className="landing-quote">
            <span aria-hidden="true">“</span>
            <p>Una eina digital amb l’escalf d’un espai de classe.</p>
          </aside>
        </div>
      </section>

      <section className="landing-trust" aria-label="Principis del projecte">
        <p><strong>01</strong> Multi-centre</p>
        <p><strong>02</strong> Rols i permisos</p>
        <p><strong>03</strong> Privacitat des del disseny</p>
        <p><strong>04</strong> Integracions educatives</p>
      </section>

      <section className="landing-intro landing-section" id="que-es">
        <div>
          <p className="landing-kicker">Què és El Taulell?</p>
          <h2>Un punt de trobada per a tota la comunitat educativa.</h2>
        </div>
        <div className="landing-intro-copy">
          <p>
            El Taulell recupera la senzillesa del suro de classe i la porta a
            un entorn digital pensat per a centres educatius. La informació
            important deixa d’estar dispersa i cada persona hi accedeix segons
            el seu rol.
          </p>
          <p>
            No substitueix la relació humana ni les eines oficials del centre:
            les connecta i facilita que tutors, equips i alumnat comparteixin
            informació útil en el moment adequat.
          </p>
        </div>
      </section>

      <section className="landing-functions landing-section" id="funcions">
        <div className="landing-section-heading">
          <p className="landing-kicker">Tot en un mateix lloc</p>
          <h2>Menys soroll. Més acompanyament.</h2>
          <p>
            Funcions quotidianes que ajuden el centre a comunicar, escoltar i
            actuar amb més claredat.
          </p>
        </div>

        <div className="landing-function-grid">
          {functions.map((item) => (
            <article className="landing-function-card" key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-wellbeing" id="convivencia">
        <div className="landing-wellbeing-copy">
          <p className="landing-kicker">Convivència i benestar</p>
          <h2>Detectar abans. Acompanyar millor.</h2>
          <p>
            El Taulell pot complementar el Projecte de convivència del centre:
            dona veu a l’alumnat, facilita l’escolta primerenca i ordena el
            seguiment tutorial sense convertir una situació personal en una
            simple dada.
          </p>
          <ul>
            <li>Participació i sentiment de pertinença.</li>
            <li>Canals clars per demanar orientació o ajuda.</li>
            <li>Continuïtat entre detecció, derivació i seguiment.</li>
          </ul>
          <a
            href="https://xtec.gencat.cat/ca/centres/projeducatiu/convivencia/documentacio/"
            target="_blank"
            rel="noreferrer"
          >
            Consultar el Projecte de convivència de la XTEC
            <span aria-hidden="true"> ↗</span>
          </a>
        </div>

        <div className="landing-flow" aria-label="Circuit d’acompanyament">
          <div className="landing-flow-card landing-flow-main">
            <span className="landing-flow-icon" aria-hidden="true">T</span>
            <p>Assistent de tutoria</p>
            <h3>Orienta, però no respon per tu.</h3>
            <small>
              Fa preguntes, proposa recursos i ajuda a identificar quan és
              millor parlar amb una persona adulta de confiança.
            </small>
          </div>
          <ol>
            <li><strong>1</strong><span>Escoltar</span></li>
            <li><strong>2</strong><span>Orientar</span></li>
            <li><strong>3</strong><span>Derivar</span></li>
            <li><strong>4</strong><span>Fer seguiment</span></li>
          </ol>
          <p className="landing-safety">
            L’assistent no diagnostica, no pren decisions i no substitueix
            tutors, orientadors ni protocols del centre.
          </p>
        </div>
      </section>

      <section className="landing-audience landing-section" id="destinataris">
        <div className="landing-section-heading">
          <p className="landing-kicker">A qui s’adreça?</p>
          <h2>Una mateixa comunitat, experiències diferents.</h2>
        </div>
        <div className="landing-audience-grid">
          {audiences.map((item, index) => (
            <article key={item.label}>
              <span>0{index + 1}</span>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-framework landing-section">
        <div>
          <p className="landing-kicker">Marc educatiu de referència</p>
          <h2>Creat per sumar al projecte de centre.</h2>
        </div>
        <div className="landing-resource-list">
          <a
            href="https://xtec.gencat.cat/ca/centres/projeducatiu/convivencia/documentacio/"
            target="_blank"
            rel="noreferrer"
          >
            <span>Projecte de convivència</span>
            <strong>XTEC ↗</strong>
          </a>
          <a
            href="https://xtec.gencat.cat/web/.content/curriculum/orientacioeducativa/Documents/20180925-transversal-GENCAT.EDUCACIO.pdf"
            target="_blank"
            rel="noreferrer"
          >
            <span>Orientació educativa i acció tutorial</span>
            <strong>Departament d’Educació ↗</strong>
          </a>
          <a
            href="https://educacio.gencat.cat/ca/arees-actuacio/families/ajudem-fills/acompanyem-emocions/benestar-emocional-protector/"
            target="_blank"
            rel="noreferrer"
          >
            <span>Benestar emocional i clima escolar</span>
            <strong>Generalitat de Catalunya ↗</strong>
          </a>
        </div>
        <p className="landing-framework-note">
          El Taulell és una eina de suport. Cada centre defineix el seu projecte,
          els seus protocols i els responsables de cada actuació.
        </p>
      </section>

      <section className="landing-cta">
        <div>
          <p className="landing-kicker">Comença per veure-ho en acció</p>
          <h2>Un taulell. Tota la classe. Un centre més connectat.</h2>
        </div>
        <Link className="landing-primary landing-primary-light" href="/acces">
          Entrar a la demostració <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <p>Una plataforma educativa multi-centre en desenvolupament.</p>
        <Link href="/privacitat">Privacitat</Link>
        <Link href="/termes">Termes d'ús</Link>
        <Link href="/acces">Accés als perfils</Link>
      </footer>
    </main>
  );
}
