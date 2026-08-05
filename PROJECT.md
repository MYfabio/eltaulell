# Projecte El Taulell

## Visió

El Taulell és un espai digital de tutoria i convivència per a centres
educatius. Ha de permetre que cada grup trobi, en entrar, la informació i les
accions que li corresponen sense haver de navegar per diverses plataformes.

La finalitat no és substituir Classroom, Moodle o les eines institucionals,
sinó oferir una porta d'entrada comuna que faciliti l'acompanyament tutorial,
la participació de l'alumnat i la coordinació del centre.

## Principis del producte

- Multi-centre: les dades d'un centre i d'un grup sempre queden separades.
- Accés directe: tutoria, delegació i alumnat entren primer al seu tauler.
- Permisos mínims: cada perfil només pot veure i modificar allò que necessita.
- Moderació senzilla: la tutoria valida propostes i resultats des del mateix
  tauler.
- Privacitat: les consultes anònimes i els vots no han d'exposar l'alumnat.
- Orientació educativa: l'assistent ajuda a pensar i avançar, però no dona la
  resposta final ni substitueix la tutoria.
- Revisió abans de publicar: cada funció es prova en local abans d'arribar a
  Railway.

## Perfils i responsabilitats

| Perfil | Abast | Funcions principals |
| --- | --- | --- |
| Coordinació | Tots els grups del centre | Gestionar persones, rols i grups; veure tots els taulers; moderar contingut; consultar l'auditoria; configurar integracions. |
| Tutoria | Els grups assignats | Publicar i moderar el tauler; crear enquestes; validar propostes de delegació; publicar resultats; adjuntar i eliminar fitxers; gestionar el calendari i les consultes del grup. |
| Delegació | El seu grup | Proposar activitats i enquestes; adjuntar imatges o PDF; representar el grup. Les enquestes necessiten validació de tutoria. |
| Alumnat | El seu grup | Llegir el tauler; votar; enviar consultes anònimes; consultar el seu espai i utilitzar l'assistent orientador. |

## Arquitectura

- Interfície i API: Next.js 15, App Router i TypeScript.
- Dades de producció: PostgreSQL amb Prisma.
- Fitxers de producció: Railway Bucket privat, amb accés comprovat des de
  l'aplicació.
- Desplegament: Railway amb migracions de base de dades abans de publicar.
- Vista local ràpida: base temporal en memòria per revisar el producte sense
  tocar producció. Les dades es reinicien en tancar el servidor.

## Estat a 3 d'agost de 2026

Implementat o preparat:

- Estructura multi-centre, grups, membres i taulers a PostgreSQL.
- Administració general de plataforma separada dels rols de centre, amb alta
  de centres, coordinació inicial, plans, límits, suspensió i auditoria global.
- Matriu de permisos per a coordinació, tutoria, delegació i alumnat.
- Perfils de demostració i navegació adaptada al rol.
- Administració bàsica de persones, rols, estats i grups.
- Enquestes amb aprovació, votació, tancament i publicació de resultats.
- Imatges i PDF amb previsualització, límits i eliminació per tutoria o
  coordinació.
- Emmagatzematge privat de fitxers a Railway Bucket.
- Invitacions d'alumnat per grup amb enllaç, codi temporal, caducitat, límit
  d'usos, revocació, permisos de tutoria i auditoria.
- Vista local ràpida per revisar canvis abans de publicar.

Prototipat i validat només en local el 4 d'agost de 2026:

- Supervisió global de coordinació amb filtres per etapa, grup, matèria,
  tutoria i alumne, més un mode observador que no permet modificar dades.
- Seguiment tutorial per alumne i matèria, alertes de possible bloqueig i
  historial de converses amb el Tutor IA reservat als perfils autoritzats.
- Flux visual de tasques de l'alumnat amb els estats pendent, en curs,
  lliurada i qualificada.
- Recursos plegables i quatre estils de taulell: pissarra blanca, guix, suro i
  mode digital fosc.
- Dades demostratives estructurades per provar els fluxos. Encara no es
  consideren persistència de producció ni dades sincronitzades.

Validat en local el 5 d'agost de 2026:

- Alta d'un centre amb coordinació inicial i dades separades.
- Actualització de pla i límits de persones i grups.
- Suspensió i reactivació del centre amb bloqueig efectiu dels seus perfils.
- Registre de les accions a l'auditoria global de plataforma.

Pendent d'implementació real:

- Autenticació de centre amb Google Workspace.
- Autenticació real i reforçada de l'administració general de plataforma.
- Autorització OAuth i importació real de cursos i alumnat des de Google Classroom.
- Persistència PostgreSQL dels nous indicadors, tasques i historials de Tutoria
  IA, amb política de conservació i accés definida pel centre.
- Connexió amb Moodle o iEduca mitjançant una API autoritzada.
- Consultes anònimes persistents i circuit complet de resposta.
- Calendari persistent i sincronitzat.
- Assistent educatiu amb regles, proteccions i seguiment d'ús.
- Proves automatitzades, accessibilitat i pilot amb dades reals anonimitzades.

## Flux de treball

1. Es defineix una funció petita i verificable.
2. Es desenvolupa en una branca local.
3. Es prova amb tots els perfils afectats a la vista local.
4. Es revisen permisos, errors i separació entre grups i centres.
5. Es crea una pull request de revisió.
6. Només després de l'aprovació s'incorpora i es desplega a Railway.

## Criteri per considerar una funció acabada

Una funció està acabada quan funciona amb el perfil correcte, queda bloquejada
per als perfils sense permís, persisteix correctament en PostgreSQL, mostra
errors entenedors, es pot provar en local i passa les comprovacions abans de
publicar-se.
