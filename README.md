# El Taulell

Aplicació educativa multi-centre que reuneix el tauler de classe, les consultes,
el calendari i els accessos a les eines educatives en un únic espai.

## Estat actual

El projecte inclou una base multi-centre amb quatre perfils —coordinació,
tutoria, delegació i alumnat—, permisos per rol, gestió de persones i grups,
enquestes moderades i fitxers del tauler. L'accés actual és de demostració;
l'autenticació real amb Google Workspace, Classroom i Moodle encara forma part
del full de ruta.

Consulta [PROJECT.md](./PROJECT.md) per entendre l'abast i les decisions del
projecte, i [ROADMAP.md](./ROADMAP.md) per veure què està fet i què falta.

## Vista local ràpida

La manera recomanada de revisar canvis abans de publicar-los és:

```powershell
npm.cmd run local
```

Després, obre <http://127.0.0.1:3000/acces>.

Aquesta vista crea dades de demostració en memòria. No necessita PostgreSQL, no
modifica Railway i totes les dades locals desapareixen quan es reinicia el
servidor.

## Desenvolupament amb PostgreSQL

1. Copia `.env.example` a `.env` i configura `DATABASE_URL`.
2. Executa `npm install`.
3. Executa `npm run db:generate` i `npm run db:migrate`.
4. Executa `npm run dev`.

L'endpoint `GET /api/health` permet verificar el desplegament.

Les enquestes, els vots i les metadades dels fitxers es desen a PostgreSQL. En
producció, el contingut dels fitxers es desa en un Railway Bucket privat i es
serveix des de l'API després de validar l'accés al grup. Els fitxers admesos
tenen un límit de 5 MB i cada tauler pot conservar fins a 30 fitxers en aquesta
fase pilot.

## Railway

1. Crea un projecte i afegeix un servei PostgreSQL i un Railway Bucket.
2. Connecta aquest repositori.
3. Railway injecta `DATABASE_URL`; afegeix també `AUTH_SECRET` i connecta les
   variables del Bucket (`BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`,
   `REGION` i `ENDPOINT`) al servei web.
4. Railway executa `npm run db:deploy` abans de cada publicació per aplicar les
   migracions pendents.

Cap canvi es publica directament: primer es revisa en local, després es prepara
una pull request i només s'incorpora a producció quan ha estat validat.
