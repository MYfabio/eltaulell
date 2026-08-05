# El Taulell

Aplicació educativa multi-centre que reuneix el tauler de classe, les consultes,
el calendari i els accessos a les eines educatives en un únic espai.

## Estat actual

El projecte inclou una base multi-centre amb quatre perfils —coordinació,
tutoria, delegació i alumnat—, permisos per rol, gestió de persones i grups,
enquestes moderades i fitxers del tauler. El pilot ja disposa d'accés real amb
invitació, contrasenya xifrada, sessió persistent i entrada directa segons el
perfil. L'autenticació institucional amb Google Workspace i les connexions amb
Classroom i Moodle encara formen part del full de ruta.

Tutoria i coordinació també poden crear invitacions temporals per grup amb un
enllaç i un codi separat, limitar-ne els usos i revocar-les. La importació de
l'alumnat des de Classroom es mostra com a flux preparat, però no llegeix dades
reals fins que el centre completi l'autorització OAuth de Google.

La vista local inclou una administració general separada dels rols de centre.
Permet donar d'alta centres amb la seva coordinació inicial, definir plans i
límits, suspendre o reactivar l'accés i consultar una auditoria global. Aquest
accés de demostració no s'exposa en producció sense activar-lo explícitament.
En donar d'alta un centre o una persona es genera un enllaç d'activació d'un sol
ús. La persona crea la seva contrasenya i el compte només passa a actiu després
de completar aquest pas.

La demostració pública es pot activar amb `DEMO_ACCESS_ENABLED=1`. L'accés real
continua a `/acces` i mostra un enllaç separat cap a `/demo`, on els quatre perfils
de prova utilitzen exclusivament el centre de demostració.

Consulta [PROJECT.md](./PROJECT.md) per entendre l'abast i les decisions del
projecte, i [ROADMAP.md](./ROADMAP.md) per veure què està fet i què falta.

## Vista local ràpida

La manera recomanada de revisar canvis abans de publicar-los és:

```powershell
npm.cmd run local
```

Després, obre <http://127.0.0.1:3000/acces>.

Des de la pantalla d'accés pots entrar a **Administració general** i revisar el
panell de centres a <http://127.0.0.1:3000/administracio-plataforma>.

Aquesta vista crea dades de demostració en memòria. No necessita PostgreSQL, no
modifica Railway i totes les dades locals desapareixen quan es reinicia el
servidor.

## Desenvolupament amb PostgreSQL

1. Copia `.env.example` a `.env` i configura `DATABASE_URL`.
2. Executa `npm install`.
3. Executa `npm run db:generate` i `npm run db:migrate`.
4. Executa `npm run dev`.

L'endpoint `GET /api/health` permet verificar el desplegament.

Els post-its, les enquestes, els vots i les metadades dels fitxers es desen a PostgreSQL. En
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
