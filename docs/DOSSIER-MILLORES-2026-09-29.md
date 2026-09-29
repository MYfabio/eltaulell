# El Taulell — dossier de revisión y mejoras

29/09/2026. Revisión hecha al traer el proyecto de `Documents\Codex` a `APPS\eltaulell`.
Solo lectura: no se ha tocado producción, la base de datos ni ninguna rama.

## 1. Estado en una frase

La app está en línea en eltaulell.aulaia.cat. Lo que hay en `main` compila, pasa sus 21 tests y es exactamente lo que sirve Railway (commit `bc8cc4c`, 16/08). La base es sólida: varios centros separados entre sí, roles comprobados en el servidor, sesiones revocables y adjuntos privados. Hay dos cosas que conviene resolver antes de enseñarla a más centros: la IA y los secretos. En móvil se ve bien (comprobado a 375 px).

## 2. Qué funciona

- **Varios centros.** Cada centro tiene sus datos separados, con tests que lo comprueban. La administración de la plataforma (altas, planes, límites, suspensión, auditoría) está aparte de la de cada centro.
- **Cuatro roles:** Coordinación, Tutoría, Delegación y Alumnado. Los permisos se comprueban siempre en el servidor.
- **Acceso.** Hay acceso piloto con correo y contraseña cifrada, bloqueo tras varios intentos, invitaciones de un solo uso y recuperación de contraseña. El acceso con Google está programado y arreglado en los PR #21 y #22. La administración de la plataforma pide un segundo factor (código TOTP).
- **El taulell.** Post-its, encuestas (aprobación, voto único, cierre) y adjuntos (imagen o PDF, en un bucket privado y descargables solo con permiso).
- **Otras funciones:** calendario, consultas anónimas, tareas del alumnado, invitaciones de grupo por código y conectores con Moodle e iEduca (con el secreto cifrado).
- **Tutoría IA** con filtro de riesgo y respuesta de urgencia, límite diario y sin guardar conversaciones.
- **Demo pública** de alumno en `/demo`, bien acotada: en producción solo deja entrar con el rol de alumno.

## 3. Lo que no funciona o está a medias

| # | Qué | Dónde | Efecto |
| - | --- | --- | --- |
| 1 | **La Tutoría IA no funciona en producción.** Llama a OpenAI con un modelo que no existe (`gpt-5.6-sol`) y en Railway no hay `OPENAI_API_KEY`. | `lib/ai-tutor.ts:61-76` | El botón «Pregunta al Taulell» falla. |
| 2 | **La versión con Gemini (Vertex AI) no está fusionada.** Además trae HSTS, cookies centralizadas y página de cookies. | rama `agent/vertex-gemini-cookies` | Es la solución al punto 1, pero se quedó sin fusionar el 16/08. |
| 3 | **La demo tiene fechas fijas de agosto.** Una tarea «pendiente» vence el 17/08, en el pasado. | datos de la demo | La demo parece abandonada. |
| 4 | **Google Classroom no está conectado:** el botón dice «Pendent de credencials de Google Cloud» y la entrega de tareas es simulada. | `app/integracions/integrations-client.tsx:28` | La portada promete «integracions educatives». |
| 5 | **La documentación está desfasada.** `PROJECT.md` (del 3–5/08) da por pendientes cosas que ya existen, y el ROADMAP no refleja lo fusionado. | `PROJECT.md`, `ROADMAP.md` | Confunde a cualquier sesión nueva. |
| 6 | **En el catálogo de aulaia.cat sale «en construcción» y sin enlace**, aunque está en línea con demo. | `aulaia-cat/data/apps.json` | Se pierde visibilidad. |

## 4. Seguridad

Bien resuelto: protección CSRF por origen, `X-Frame-Options`, `nosniff`, cookies `httpOnly`/`secure`, adjuntos `no-store`, secretos de conectores cifrados y ningún secreto escrito en el código. En Railway, `AUTH_SECRET` está bien definido (64 caracteres) y la demo de administración de plataforma está apagada.

Pendiente:
1. **Secretos de repuesto débiles.** Si falta `AUTH_SECRET`, tres módulos usan en su lugar la cadena de conexión de la base de datos o un texto fijo (`lib/board-store.ts:229`, `lib/group-invites.ts:42`, `lib/ai-tutor.ts:37`). Hoy no pasa porque la variable existe, pero conviene que la app se niegue a arrancar sin ella.
2. **Falta CSP.** HSTS llega con la rama del punto 3.2.
3. **Adjuntos:** el tipo de fichero se valida solo con lo que dice el navegador. Hay que comprobar también los primeros bytes (que un PDF sea de verdad un PDF).
4. **Copias de seguridad:** `CRON_SECRET` no está definida en Railway, así que no hay ninguna tarea de backup o retención programada que pueda ejecutarse. Hay que decidir si se quiere.

## 5. Ramas

Hay unas 20 ramas `agent/*` de Codex. En resumen:
- **Fusionar:** `agent/vertex-gemini-cookies`, después de ponerla al día con `main` y configurar las credenciales de Vertex.
- **Revisar a mano, probablemente descartar:** `direct-board-workflow` y `role-specific-entry-navigation`. `main` ya lo resuelve de otra forma.
- **Borrar, porque ya están en `main` o son copias:** `empty-board-state`, `remove-single-access-label`, `unify-centre-admin-login`, `fix-google-oauth-*` y `backup/polls-attachments-before-rebase-20260802`.

La antigua copia de Codex (`Documents\Codex\2026-07-28\...\eltaulell-implementation`) no se ha borrado. Todas sus ramas están ya en `APPS\eltaulell` como `codex-local/*`, así que se puede borrar cuando quieras.

## 6. Integración gráfica con aulaia.cat

El diseño de El Taulell es bueno y tiene personalidad propia: corcho, post-its, títulos en Georgia y la paleta azul marino (`#1d3557`) con naranja (`#f49a50`) sobre crema. **No propongo cambiarlo a los colores de aulaia.cat.** Cada app del catálogo tiene su identidad (Museu Apagat, La Claqueta, Kipuk…), y el paraguas las une por estructura, no por color.

Lo que sí haría para que se note que es de la familia aulaia:
1. **Un pie común** con «Un projecte d'aulaia.cat», enlace al catálogo, privacidad y contacto, igual que en las otras apps.
2. **Entrada con Google como opción principal**, igual que las demás apps, y la contraseña piloto como alternativa. El código ya está.
3. **Cargar Inter de verdad** con `next/font`. Ahora depende de que el ordenador la tenga instalada, y en muchos Chromebooks del centro no está.
4. **Colores en variables CSS** (`:root`), para poder ajustar la paleta y el modo oscuro sin tocar 7.000 líneas de CSS repartidas en cuatro ficheros.

## 7. Plan propuesto, por orden

| Orden | Tarea | Impacto | Esfuerzo | ¿Necesita a Fabio? |
| - | --- | - | - | - |
| 1 | Fechas de la demo relativas a hoy | Medio | Bajo | No |
| 2 | Pasar la ficha del catálogo a «en línia» con enlace y captura | Medio | Bajo | Confirmar |
| 3 | Poner al día y fusionar `vertex-gemini-cookies` y activar Gemini | Alto | Medio | Sí: credenciales de Vertex en Railway |
| 4 | Obligar `AUTH_SECRET` y quitar los repuestos débiles | Alto | Bajo | No |
| 5 | CSP y validación de adjuntos por contenido | Medio | Bajo | No |
| 6 | Pie común aulaia, Inter con `next/font`, variables de color | Medio | Medio | No |
| 7 | Actualizar PROJECT.md y ROADMAP.md; borrar ramas viejas | Medio | Bajo | Confirmar el borrado |
| 8 | Tests de las rutas de API (adjuntos, votos, invitaciones) con base de datos local | Alto | Medio | No |
| 9 | Classroom real, decidir las copias de seguridad (`CRON_SECRET`) | Medio | Medio | Sí: Google Cloud |

Aviso general, también para las demás apps: Railway deja de aceptar `railway.toml` el **01/12/2026**. Hay que migrarlo con `railway config migrate`.
