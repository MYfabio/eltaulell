import Link from "next/link";

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sent = (await searchParams).sent === "1";
  return <main className="access-page"><header className="access-header"><Link className="portal-brand" href="/"><span>T</span><strong>El Taulell</strong></Link></header><section className="access-hero"><p>SEGURETAT DEL COMPTE</p><h1>Recupera la contrasenya.</h1><span>Si el correu té un compte actiu, rebràs un enllaç d'una hora. La resposta no confirma si l'adreça existeix.</span></section><section className="account-access-card"><div><h2>Envia'm l'enllaç</h2>{sent && <p role="status">Petició registrada. Revisa el correu i la carpeta de correu brossa.</p>}</div><form action="/api/auth/password-reset/request" method="post"><label>Correu electrònic<input autoComplete="email" name="email" required type="email" /></label><button type="submit">Enviar enllaç segur</button><Link href="/acces">Tornar a l'accés</Link></form></section></main>;
}
