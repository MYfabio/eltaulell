# Full de ruta d'El Taulell

## Fase 0 — Base multi-centre

Estat: completada a nivell inicial.

- Next.js, TypeScript, PostgreSQL i Prisma.
- Centres, grups, membres, rols, taulers i auditoria.
- Desplegament a Railway i domini propi.
- Administració general de plataforma validada en local: alta de centres,
  coordinació inicial, plans, límits, suspensió i auditoria global.

## Fase 1 — Tauler operatiu i permisos

Estat: en validació local.

- Entrada directa al tauler segons el perfil.
- Gestió de persones i grups per coordinació.
- Enquestes creades per tutoria i coordinació.
- Propostes de delegació pendents d'aprovació.
- Vot únic per persona, tancament i publicació de resultats.
- Càrrega d'imatges i PDF per tutoria i delegació.
- Eliminació de fitxers per tutoria i coordinació.
- Revisió completa de cada recorregut de rol.
- Autorització central per centre i grup, amb la matrícula activa com a font de
  veritat i bloqueig explícit de grups no assignats.
- Post-its persistents a PostgreSQL, amb creació, edició, arxivament i auditoria.
- Proves automàtiques inicials de rols, grups i separació entre centres.

- Invitacions d'alumnat amb enllaç i codi temporal, limitades al grup de la
  tutoria, amb caducitat, límit d'usos, revocació i auditoria.

Abans de tancar la fase 1, ja hi ha una demostració local de:

- Supervisió global amb filtres i mode observador de només lectura.
- Panell tutorial per alumne i matèria, amb alertes de bloqueig.
- Historial de Tutoria IA limitat a perfils autoritzats.
- Tasques personals, recursos plegables i quatre temes visuals.

Les tasques personals, els indicadors i l'historial de Tutoria IA encara
necessiten models persistents i una política de conservació abans de passar a
producció.

## Fase 2 - Identitat i seguretat de centre

Estat: pendent.

- Accés real amb Google Workspace for Education.
- Alta controlada per domini, invitació i estat de membre.
- Sessions persistents, revocació i recuperació d'accés.
- Registre d'auditoria per a les accions sensibles.
- Accés real de l'administració general amb autenticació reforçada i sense
  comptes de demostració en producció.

## Fase 3 — Tutoria i convivència

Estat: disseny funcional parcial.

- Consultes anònimes persistents amb bústia de tutoria.
- Circuit de resposta, derivació i tancament sense perdre l'anonimat.
- Calendari de grup i centre.
- Seguiment de participació amb indicadors no punitius.

## Fase 4 — Google Classroom

Estat: interfície informativa; integració real pendent.

- Flux de selecció de curs i revisió d'alumnat preparat a la interfície de
  tutoria, sense simular cap importació mentre l'OAuth no estigui autoritzat.
- Autorització del domini per una persona administradora de Workspace.
- Vinculació de grups d'El Taulell amb cursos de Classroom.
- Lectura d'avisos, tasques, dates i enllaços.
- Sincronització programada i gestió d'errors de permisos.

La integració final de Classroom també haurà d'incloure el lliurament mitjançant
`courses.courseWork.studentSubmissions.turnIn` i la sincronització inversa de
l'estat. La versió local només simula aquest canvi i no envia cap lliurament.

## Fase 5 - Moodle i iEduca

Estat: interfície informativa; integració real pendent.

- Confirmar que el Moodle del centre ofereix serveis web autoritzats.
- Configurar token o OAuth de servei sense reutilitzar enllaços temporals
  d'inici de sessió.
- Vincular cursos, activitats, recursos i dates amb cada grup.
- Definir el paper d'iEduca i les dades que es poden compartir legalment.

## Fase 6 — Assistent orientador

Estat: demostració d'interfície; servei real pendent.

- Orientar amb preguntes i passos curts, sense donar la resposta final.
- Limitar les dades enviades al model i excloure informació sensible.
- Protocol de seguretat per a consultes de convivència o risc.
- Historial, supervisió i configuració per centre.

L'historial de Tutoria IA requerirà consentiment o base jurídica adequada,
retenció limitada, auditoria i una separació clara entre el resum visible per
coordinació i el contingut complet visible per la tutoria autoritzada.

## Fase 7 - Pilot i escalabilitat

Estat: pendent.

- Proves automatitzades de permisos i separació multi-centre.
- Accessibilitat, rendiment, còpies de seguretat i recuperació.
- Pilot amb un grup, després amb un centre i finalment amb diversos centres.
- Mètriques de servei, suport i documentació d'administració.

## Prioritat immediata

1. Revisar en local el nou panell d'administració general.
2. Persistir les tasques personals, els indicadors i l'historial de Tutoria IA.
3. Preparar l'accés real amb Google Workspace i la protecció reforçada del
   compte d'administració general.
4. Preparar una pull request i desplegar només després de l'aprovació.
