/* DEV0003 REQ-008, REQ-009: capa DOM de resumen.html. Agrupacion y CSV estan en js/exportar.js.
   Antes: no existia. Si se quita: la pagina muestra solo el boton, sin tablas ni descarga.
   Todo texto de usuario se escapa antes de entrar al DOM. */
(function () {
  'use strict';
  var C = window.Calendario, I = window.Inscripcion, E = window.Exportar, doc = document;
  var el = function (id) { return doc.getElementById(id); };
  var esc = C.escaparHtml;
  var acts = [];

  function pintar() {
    var ins = I.leerInscripciones(window.localStorage);
    var grupos = E.resumenPorActividad(acts, ins);
    el('total').textContent = 'Total de inscripciones: ' + ins.length + '.';
    el('resumen').innerHTML = grupos.map(function (g) {
      var a = g.actividad;
      var cabecera = '<h2>' + esc(a.titulo) + '</h2><p>' + (g.conocida ? esc(a.fecha) + ' · ' : '') +
        'Plazas ocupadas: <strong>' + g.ocupadas + '</strong>' + (g.conocida ? ' · Plazas disponibles: <strong>' + g.disponibles + '</strong> (cupo ' + esc(a.cupo) + ')' : '') + '</p>';
      if (!g.inscritos.length) { return '<section>' + cabecera + '<p>Sin inscripciones.</p></section>'; }
      return '<section>' + cabecera + '<div class="tabla-mes"><table class="tabla-resumen"><caption class="solo-lectores">Inscritos en ' + esc(a.titulo) + '</caption>' +
        '<thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Número de estudiante</th><th scope="col">Fecha de inscripción</th></tr></thead><tbody>' +
        g.inscritos.map(function (i) {
          return '<tr><td>' + esc(i.nombre) + '</td><td>' + esc(i.correo) + '</td><td>' + esc(i.estudiante) + '</td><td>' + esc(i.fecha_inscripcion) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }).join('');
  }

  function descargar() {
    var csv = E.generarCsv(acts, I.leerInscripciones(window.localStorage));
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url; a.download = 'inscripciones-club-horizonte.csv';
    doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  doc.addEventListener('DOMContentLoaded', function () {
    el('exportar-csv').addEventListener('click', descargar);
    fetch('datos/actividades.json').then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.text();
    }).then(function (t) {
      var r = C.parsearActividades(t);
      if (r.error) { throw new Error(r.error); }
      acts = r.actividades;
      pintar();
    }).catch(function (e) {
      el('mensaje-carga').textContent = 'No se pudo cargar la lista de actividades (' + e.message + ').';
      el('mensaje-carga').hidden = false;
      el('exportar-csv').disabled = true;
    });
  });
})();
