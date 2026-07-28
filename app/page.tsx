const cards = [
  ["Suro de classe", "Post-its, avisos i idees del grup."],
  ["Consultes anònimes", "Un canal segur per preguntar i demanar ajuda."],
  ["Calendari", "Tasques, activitats i dates importants."],
  ["Integracions", "Enllaços preparats per a Classroom i Moodle."]
];

export default function Home() {
  return (
    <main>
      <nav><strong>El Taulell</strong><span>Espai educatiu multi-centre</span></nav>
      <section className="hero">
        <p className="eyebrow">PROTOTIP INICIAL</p>
        <h1>Tot el que passa a la classe, en un sol taulell.</h1>
        <p>Una plataforma respectuosa per a alumnat, delegats i tutors. L&apos;assistent orienta el procés, sense donar les respostes.</p>
        <div className="actions"><button>Entrar al taulell</button><button className="secondary">Veure el calendari</button></div>
      </section>
      <section className="cards">
        {cards.map(([title, description]) => <article key={title}><h2>{title}</h2><p>{description}</p><a href="#">Properament →</a></article>)}
      </section>
      <section className="roles"><p className="eyebrow">ROLS</p><h2>Cada veu té el seu espai.</h2><div><span>Tutor/a</span><span>Delegat/da</span><span>Alumne/a</span></div></section>
    </main>
  );
}
