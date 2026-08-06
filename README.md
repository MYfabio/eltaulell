# El Taulell

Aplicació educativa multi-centre que concentra el taulell de classe, les tasques,
les consultes anònimes, el calendari i els accessos a les eines educatives en un
únic espai.

## Funcions principals

- Dades reals de tasques, qualificacions, progrés i ús agregat de la Tutoria IA a
  PostgreSQL, sempre vinculades al centre, grup i alumne autenticats.
- Perfils de SuperAdmin, coordinació, tutoria, delegació i alumnat amb permisos i
  aïllament estricte entre centres.
- SuperAdmin protegit amb contrasenya xifrada, TOTP, bloqueig d'intents, sessions
  revocables i llista opcional d'IP autoritzades.
- OAuth 2.0 de Google i serveis per sincronitzar Classroom i Google Calendar.
- Tutor IA socràtic amb límit diari, detecció de risc i estadístiques anònimes;
  no conserva els prompts ni les respostes de l'alumnat.
- Consultes anònimes amb resposta, derivació i tancament sense desar la identitat
  de l'alumne al tiquet.
- Calendari amb creació, edició i eliminació d'esdeveniments.
- Connectors configurables per a Moodle i iEduca, amb cursos, recursos i
  activitats estructurats.
- Invitacions, recuperació de contrasenya i avisos mitjançant un proveïdor de
  correu transaccional HTTP.
- Privacitat, termes RGPD, conservació i esborrat de dades, còpies xifrades,
  registre d'errors i monitorització.

## Posada en marxa local

1. Copia `.env.example` a `.env` i configura `DATABASE_URL`, `AUTH_SECRET` i
   `DATA_ENCRYPTION_KEY`.
2. Executa `npm install`.
3. Executa `npm run db:generate` i `npm run db:migrate`.
4. Executa `npm run dev` i obre <http://127.0.0.1:3000/acces>.

Per revisar la interfície sense PostgreSQL ni serveis externs:

```powershell
npm.cmd run local
```

La vista local utilitza dades temporals, no modifica producció i les elimina en
reiniciar el servidor. La demostració pública s'activa de manera separada amb
`DEMO_ACCESS_ENABLED=1`.

## Configuració de producció

Railway ha de disposar d'un servei PostgreSQL i d'un Bucket privat compatible
amb S3. Totes les variables necessàries estan documentades a `.env.example`:

- identitat, URL pública i dades legals;
- compte SuperAdmin i secret TOTP;
- xifrat de tokens i de còpies de seguretat;
- Google OAuth, Classroom i Calendar;
- OpenAI per a la Tutoria IA;
- Moodle i iEduca;
- correu transaccional;
- treballs programats i observabilitat.

Les contrasenyes, tokens i claus reals no s'han de guardar mai al repositori. A
cada desplegament s'han d'aplicar les migracions abans d'arrencar l'aplicació:

```powershell
npm.cmd run db:deploy
npm.cmd run start
```

## Operació i manteniment

- `GET /api/health`: estat del servei i de PostgreSQL.
- `POST /api/ops/retention`: aplica la política de conservació i esborrat.
- `POST /api/ops/backup`: crea una còpia xifrada per centre al Bucket privat.

Els dos treballs operatius requereixen `Authorization: Bearer <CRON_SECRET>` i
s'han de programar des de Railway. Els errors sensibles es redacten abans de
desar-los i, si es configura `OTEL_EXPORTER_OTLP_ENDPOINT`, també s'exporten al
sistema de monitorització.

## Proves

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
```

`test:e2e` aixeca una vista local i comprova l'accés, el taulell, la privacitat,
la protecció de la Tutoria IA, el calendari, el rendiment bàsic i el bloqueig de
peticions d'un altre origen. També pot provar un servidor ja iniciat definint
`E2E_BASE_URL`.

La suite unitària cobreix permisos, sessions, xifrat, TOTP, accessibilitat,
seguretat de la IA i separació de dades entre centres.

## Serveis externs

El codi queda preparat encara que les credencials no estiguin configurades. Per
activar cada integració cal proporcionar les claus de l'organització a Railway.
En particular, les rutes d'iEduca són configurables perquè depenen del contracte
d'API habilitat per cada proveïdor o centre.
