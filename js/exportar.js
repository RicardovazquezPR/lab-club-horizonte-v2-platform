/* DEV0003 REQ-008: resumen de inscripciones por actividad y exportacion a CSV.
   Antes: no habia resumen ni exportacion. Ahora: resumenPorActividad agrupa; generarCsv produce
   texto con BOM UTF-8 (acentos correctos en Excel), separador ";" (lo que espera Excel en espanol) y CRLF.
   Las celdas que empiezan por = + - @ se neutralizan para que Excel no las ejecute como formula.
   Si se cambia el separador: Excel en configuracion regional espanola dejaria todo en una sola columna. */
(function (global) {
  'use strict';

  var SEPARADOR = ';';
  var BOM = '\uFEFF';
  var COLUMNAS = ['Actividad', 'Fecha', 'Nombre', 'Correo', 'Número de estudiante', 'Fecha de inscripción'];

  function escaparCsv(valor) {
    var t = valor === null || valor === undefined ? '' : String(valor);
    if (/^[=+\-@\t\r]/.test(t)) { t = "'" + t; }
    if (/[";\r\n]/.test(t)) { t = '"' + t.replace(/"/g, '""') + '"'; }
    return t;
  }

  /* Orden de actividades: fecha y hora; las que ya no estan en el JSON, al final, por id. */
  function resumenPorActividad(acts, inscripciones) {
    var ordenadas = acts.slice().sort(function (a, b) {
      var ka = a.fecha + ' ' + a.hora_inicio, kb = b.fecha + ' ' + b.hora_inicio;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    var ids = {};
    var grupos = ordenadas.map(function (a) {
      ids[a.id] = true;
      var ins = inscripciones.filter(function (i) { return i.actividad === a.id; })
        .sort(function (x, y) { return x.fecha_inscripcion < y.fecha_inscripcion ? -1 : x.fecha_inscripcion > y.fecha_inscripcion ? 1 : 0; });
      return { actividad: a, conocida: true, inscritos: ins, ocupadas: ins.length, disponibles: Math.max(0, a.cupo - ins.length) };
    });
    var huerfanas = {};
    inscripciones.forEach(function (i) { if (!ids[i.actividad]) { (huerfanas[i.actividad] = huerfanas[i.actividad] || []).push(i); } });
    Object.keys(huerfanas).sort().forEach(function (id) {
      grupos.push({ actividad: { id: id, titulo: id + ' (actividad ya no está en el JSON)', fecha: '', cupo: 0 }, conocida: false,
        inscritos: huerfanas[id], ocupadas: huerfanas[id].length, disponibles: 0 });
    });
    return grupos;
  }

  function generarCsv(acts, inscripciones) {
    var filas = [COLUMNAS.map(escaparCsv).join(SEPARADOR)];
    resumenPorActividad(acts, inscripciones).forEach(function (g) {
      g.inscritos.forEach(function (i) {
        filas.push([g.actividad.titulo, g.actividad.fecha, i.nombre, i.correo, i.estudiante, i.fecha_inscripcion]
          .map(escaparCsv).join(SEPARADOR));
      });
    });
    return BOM + filas.join('\r\n') + '\r\n';
  }

  var api = { SEPARADOR: SEPARADOR, BOM: BOM, COLUMNAS: COLUMNAS, escaparCsv: escaparCsv, resumenPorActividad: resumenPorActividad, generarCsv: generarCsv };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.Exportar = api;
})(typeof window !== 'undefined' ? window : globalThis);
