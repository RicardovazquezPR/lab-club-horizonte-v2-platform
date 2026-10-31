/* DEV0003 REQ-001..REQ-004 y REQ-009: calendario de actividades.
   Antes: las actividades estaban escritas dentro de actividades.html. Ahora: se leen de datos/actividades.json.
   Las funciones puras van primero y se exportan para probarlas con Node; el DOM va al final.
   Si se quita: calendario.html queda sin logica y las pruebas de pruebas/calendario.test.js fallan. */
(function (global) {
  'use strict';

  var CAMPOS_OBLIGATORIOS = ['id', 'titulo', 'categoria', 'fecha', 'hora_inicio', 'hora_fin', 'lugar', 'cupo'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function esFechaIso(t) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
    if (!m) { return false; }
    var f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return f.getFullYear() === Number(m[1]) && f.getMonth() === Number(m[2]) - 1 && f.getDate() === Number(m[3]);
  }
  function esHora(t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(t || ''); }

  /* Devuelve la lista de problemas de una actividad; vacia = valida. */
  function validarActividad(a) {
    var p = [];
    if (!a || typeof a !== 'object') { return ['no es un objeto']; }
    CAMPOS_OBLIGATORIOS.forEach(function (c) {
      if (a[c] === undefined || a[c] === null || String(a[c]).trim() === '') { p.push('falta ' + c); }
    });
    if (!p.length) {
      if (!esFechaIso(a.fecha)) { p.push('fecha invalida'); }
      if (!esHora(a.hora_inicio)) { p.push('hora_inicio invalida'); }
      if (!esHora(a.hora_fin)) { p.push('hora_fin invalida'); }
      if (!(Number.isInteger(a.cupo) && a.cupo >= 0)) { p.push('cupo invalido'); }
    }
    return p;
  }

  /* Texto JSON -> {actividades, avisos, error}. Nunca lanza: un JSON roto da error legible. */
  function parsearActividades(texto) {
    var datos;
    try { datos = JSON.parse(texto); }
    catch (e) { return { actividades: [], avisos: [], error: 'El fichero de actividades tiene un error de formato (' + e.message + ').' }; }
    if (!Array.isArray(datos)) { return { actividades: [], avisos: [], error: 'El fichero de actividades debe ser una lista.' }; }
    var vistos = {}, ok = [], avisos = [];
    datos.forEach(function (a, i) {
      var p = validarActividad(a);
      if (!p.length && vistos[a.id]) { p.push('id repetido'); }
      if (p.length) { avisos.push('Actividad ' + (i + 1) + ' omitida: ' + p.join(', ')); return; }
      vistos[a.id] = true;
      ok.push(a);
    });
    return { actividades: ok, avisos: avisos, error: '' };
  }

  function ordenar(acts) {
    return acts.slice().sort(function (a, b) {
      var ka = a.fecha + ' ' + a.hora_inicio, kb = b.fecha + ' ' + b.hora_inicio;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }

  /* Categorias salen del JSON, nunca de una lista escrita a mano. */
  function categorias(acts) {
    var set = {};
    acts.forEach(function (a) { set[a.categoria] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }

  /* Sin categorias seleccionadas se muestran todas. */
  function filtrar(acts, cats) {
    if (!cats || !cats.length) { return acts.slice(); }
    return acts.filter(function (a) { return cats.indexOf(a.categoria) !== -1; });
  }

  function iso(y, m0, d) {
    return y + '-' + String(m0 + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  /* Cuadricula del mes (semanas que empiezan en lunes): [[{fecha, dentro, actividades}]]. */
  function construirMes(anio, mes0, acts) {
    var primero = new Date(anio, mes0, 1);
    var desfase = (primero.getDay() + 6) % 7;
    var dias = new Date(anio, mes0 + 1, 0).getDate();
    var total = Math.ceil((desfase + dias) / 7) * 7;
    var semanas = [], fila = [];
    for (var i = 0; i < total; i++) {
      var f = new Date(anio, mes0, 1 - desfase + i);
      var fi = iso(f.getFullYear(), f.getMonth(), f.getDate());
      fila.push({ fecha: fi, dia: f.getDate(), dentro: f.getMonth() === mes0,
        actividades: ordenar(acts.filter(function (a) { return a.fecha === fi; })) });
      if (fila.length === 7) { semanas.push(fila); fila = []; }
    }
    return semanas;
  }

  function mesSiguiente(anio, mes0, delta) {
    var d = new Date(anio, mes0 + delta, 1);
    return { anio: d.getFullYear(), mes0: d.getMonth() };
  }

  function etiquetaMes(anio, mes0) { return MESES[mes0] + ' de ' + anio; }

  /* Primer mes (>= desde) con actividades, o null. Ayuda cuando el mes actual esta vacio. */
  function proximoMesConActividades(acts, anio, mes0) {
    var desde = iso(anio, mes0, 1);
    var futuras = ordenar(acts).filter(function (a) { return a.fecha >= desde; });
    if (!futuras.length) { return null; }
    var f = futuras[0].fecha;
    return { anio: Number(f.slice(0, 4)), mes0: Number(f.slice(5, 7)) - 1 };
  }

  function escaparHtml(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- .ics (RFC 5545) ---- */
  function escaparIcs(t) {
    return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  /* Pliega lineas a 75 octetos UTF-8 como pide la RFC: CRLF + espacio. */
  function plegar(linea) {
    var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    var largo = function (s) { return enc ? enc.encode(s).length : s.length; };
    if (largo(linea) <= 75) { return linea; }
    var partes = [], actual = '', limite = 75;
    Array.from(linea).forEach(function (ch) {
      if (largo(actual + ch) > limite) { partes.push(actual); actual = ch; limite = 74; }
      else { actual += ch; }
    });
    partes.push(actual);
    return partes.join('\r\n ');
  }
  function fechaHoraIcs(fecha, hora) { return fecha.replace(/-/g, '') + 'T' + hora.replace(':', '') + '00'; }
  function sello(ahora) {
    var d = ahora || new Date();
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0') +
      'T' + String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0') + String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
  }
  /* Hora local "flotante" (sin zona): el evento cae a la misma hora en el dispositivo de quien lo importa. */
  function generarIcs(a, ahora) {
    var lineas = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Club Horizonte//Calendario//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + escaparIcs(a.id) + '@club-horizonte.example',
      'DTSTAMP:' + sello(ahora),
      'DTSTART:' + fechaHoraIcs(a.fecha, a.hora_inicio),
      'DTEND:' + fechaHoraIcs(a.fecha, a.hora_fin),
      'SUMMARY:' + escaparIcs(a.titulo),
      'LOCATION:' + escaparIcs(a.lugar)
    ];
    if (a.descripcion) { lineas.push('DESCRIPTION:' + escaparIcs(a.descripcion)); }
    lineas.push('END:VEVENT', 'END:VCALENDAR');
    return lineas.map(plegar).join('\r\n') + '\r\n';
  }

  var api = {
    CAMPOS_OBLIGATORIOS: CAMPOS_OBLIGATORIOS, esFechaIso: esFechaIso, esHora: esHora, validarActividad: validarActividad,
    parsearActividades: parsearActividades, ordenar: ordenar, categorias: categorias, filtrar: filtrar,
    construirMes: construirMes, mesSiguiente: mesSiguiente, etiquetaMes: etiquetaMes,
    proximoMesConActividades: proximoMesConActividades, escaparHtml: escaparHtml, escaparIcs: escaparIcs,
    generarIcs: generarIcs
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.Calendario = api;
})(typeof window !== 'undefined' ? window : globalThis);
