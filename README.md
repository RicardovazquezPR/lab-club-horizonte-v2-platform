# Club de Estudiantes Horizonte (sitio de prueba)

Sitio web estático de 7 páginas para un club de estudiantes (v2: calendario, inscripción con cupos y resumen con CSV; DEV0003). Sin servidor, sin base de datos y sin dependencias: HTML, CSS y un único archivo de JavaScript.

Todos los datos (nombres del equipo, correo, aula, horario y actividades) son ficticios.

## Cómo abrirlo

Versión publicada: https://ricardovazquezpr.github.io/lab-club-horizonte-v2-platform/

Las páginas v1 abren con doble clic en `index.html` (`file://`). El calendario, la inscripción y el resumen leen `datos/actividades.json` con `fetch`, así que necesitan HTTP (GitHub Pages o el servidor local de abajo).

Si prefieres servirlo por HTTP: `python3 -m http.server 8080` dentro de esta carpeta y abre `http://127.0.0.1:8080/`.

## Qué contiene

- `index.html`: portada con acceso a las otras páginas.
- `quienes-somos.html`: misión, valores y equipo (4 personas con nombre y cargo).
- `actividades.html`: próximas actividades con título, fecha, hora y lugar. Se muestran ordenadas de la más próxima a la más lejana y las que ya pasaron se ocultan solas.
- `contacto.html`: correo, aula y horario de reunión, y un formulario con validación.
- `css/estilos.css`: estilos de todo el sitio, adaptados a móvil (probado a 375 px) y a pantalla grande (1280 px).
- `js/app.js`: ordenar y ocultar actividades por fecha, y validar el formulario.
- `calendario.html`: calendario con vista de mes y de lista, filtro por categoría y descarga de `.ics` por actividad (`js/calendario.js` lógica, `js/calendario-ui.js` DOM).
- `inscripcion.html`: formulario validado con plazas disponibles y estado «Agotada» (`js/inscripcion.js`, `js/inscripcion-ui.js`). Las inscripciones se guardan en `localStorage`.
- `resumen.html`: inscripciones por actividad y exportación a CSV (`js/exportar.js`, `js/resumen-ui.js`).
- `datos/actividades.json`: las actividades del calendario (8 de ejemplo en noviembre de 2026, 4 categorías, una con cupo 2).
- `.github/workflows/pruebas.yml`: GitHub Actions corre `npm test` con cada push.
- `pruebas/`: pruebas automáticas de la lógica (necesitan Node, no son necesarias para usar el sitio).

## Cómo cambiar los datos

- Actividades del calendario: edita `datos/actividades.json`. Campos obligatorios: `id`, `titulo`, `categoria`, `fecha` (AAAA-MM-DD), `hora_inicio`, `hora_fin` (HH:MM), `lugar`, `cupo` (entero). Una actividad incompleta se omite y la consola avisa; un JSON roto muestra un mensaje en la página. Las categorías salen del JSON.

- Actividades: en `actividades.html`, cada actividad es un bloque `article`. Cambia a la vez `data-fecha` (formato `AAAA-MM-DD`), el atributo `datetime` y el texto de `time`, y `data-hora`. Si una `data-fecha` no se entiende, la actividad se deja visible en lugar de ocultarla.
- Equipo, correo, aula y horario: edita directamente `quienes-somos.html` y `contacto.html`.

## Cómo probarlo

Con Node 22 instalado, desde esta carpeta:

    npm test

Ejecuta las pruebas de calendario, inscripción, CSV, páginas e integración (`node --test`) y las de fechas y contacto de la v1. Sale con error si alguna falla. GitHub Actions hace lo mismo con cada push.

## Límites conocidos

- El formulario de contacto **no envía el mensaje a nadie**: valida los campos y muestra «Mensaje recibido». Para recibir mensajes de verdad haría falta un servicio aparte.
- La fecha de «hoy» es la del navegador de quien visita la página, no la del servidor.
- Con JavaScript desactivado se ven todas las actividades (sin ordenar ni filtrar) y el formulario no valida.
- La comprobación del correo es básica (`usuario@dominio.ext`, sin espacios); no cubre todos los casos del estándar.
- El diseño solo se ha comprobado en Chromium (Chrome).
- (v2) Las inscripciones y los cupos viven en el `localStorage` de cada navegador: no se sincronizan entre dispositivos, por lo que el cupo se controla por navegador y no de forma global. No se envían correos de confirmación.
- (v2) El `.ics` usa hora local flotante y solo se ha comprobado por formato (RFC 5545), no importándolo en Google Calendar ni en iOS.
- (v2) El CSV usa `;` como separador, UTF-8 con BOM y CRLF, pensado para Excel en español; no se ha comprobado abriéndolo en Excel.
- (v2) La accesibilidad se ha revisado con pruebas estáticas y Chromium; no se ha medido con Lighthouse.
