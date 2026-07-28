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

## Railway

1. Crea un projecte nou i afegeix un servei PostgreSQL.
2. Connecta aquest repositori.
3. Railway injectarà `DATABASE_URL`; afegeix també `AUTH_SECRET`.
4. A la primera publicació, executa `npm run db:deploy` com a comanda de migració.
