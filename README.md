# El Taulell

Aplicació educativa multi-centre per centralitzar el suro de classe, consultes anònimes, calendari i accessos a eines educatives.

## Stack inicial

- Next.js amb TypeScript i App Router
- PostgreSQL amb Prisma
- Preparat per desplegar a Railway

## Desenvolupament local

1. Copia `.env.example` a `.env` i configura `DATABASE_URL`.
2. Executa `npm install`.
3. Executa `npm run db:generate` i `npm run db:migrate`.
4. Executa `npm run dev`.

L'endpoint `GET /api/health` permet verificar el desplegament.

Les enquestes, els vots i els fitxers del taulell es desen a PostgreSQL. Els
fitxers admesos tenen un límit de 5 MB i cada taulell pot conservar fins a 30
fitxers en aquesta fase pilot.

## Railway

1. Crea un projecte nou i afegeix un servei PostgreSQL.
2. Connecta aquest repositori.
3. Railway injectarà `DATABASE_URL`; afegeix també `AUTH_SECRET`.
4. Railway executa `npm run db:deploy` abans de cada publicació per aplicar les migracions pendents.
