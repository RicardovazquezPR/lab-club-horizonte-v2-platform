/* DEV0003 REQ-005, REQ-006, REQ-009: capa DOM de inscripcion.html. La logica esta en js/inscripcion.js.
   Antes: no existia. Si se quita: el formulario se ve pero no valida ni guarda.
   Los errores se pintan junto a cada campo (aria-describedby) y el foco va al primero que falla. */
(function () {
  'use strict';
  var C = window.Calendario, I = window.Inscripcion, doc = document;
  var el = function (id) { return doc.getElementById(id); };
  var CAMPOS = ['nombre', 'correo', 'estudiante'];
  var acts = [];

  function actual() { return acts.filter(function (a) { return a.id === el('actividad').value; })[0]; }

  function pintarPlazas() {
    var a = actual();
    if (!a) { return; }
    var p = I.plazasDisponibles(a, I.leerInscripciones(window.localStorage));
    var agotada = p <= 0;
    el('plazas').textContent = agotada ? 'Agotada: ya no quedan plazas.' : 'Plazas disponibles: ' + p + ' de ' + a.cupo + '.';
    el('plazas').className = 'plazas' + (agotada ? ' agotada' : '');
    el('enviar').disabled = agotada;
    CAMPOS.forEach(function (c) { el(c).disabled = agotada; });
  }

  function limpiarErrores() {
    CAMPOS.forEach(function (c) {
      el('error-' + c).textContent = ''; el('error-' + c).hidden = true; el(c).removeAttribute('aria-invalid');
    });
    el('error-general').hidden = true;
  }

  function mostrarErrores(errores) {
    var primero = null;
    CAMPOS.forEach(function (c) {
      if (errores[c]) {
        el('error-' + c).textContent = errores[c]; el('error-' + c).hidden = false;
        el(c).setAttribute('aria-invalid', 'true');
        if (!primero) { primero = el(c); }
      }
    });
    if (primero) { primero.focus(); }
  }

  function enviar(ev) {
    ev.preventDefault();
    limpiarErrores();
    el('exito-inscripcion').hidden = true;
    var a = actual();
    if (!a) { return; }
    var v = {};
    CAMPOS.forEach(function (c) { v[c] = el(c).value; });
    var r = I.inscribir(window.localStorage, a, v);
    if (!r.ok) {
      mostrarErrores(r.errores);
      if (r.mensaje) { el('error-general').textContent = r.mensaje; el('error-general').hidden = false; }
      pintarPlazas();
      return;
    }
    el('form-inscripcion').reset();
    el('actividad').value = a.id;
    el('exito-inscripcion').textContent = 'Inscripción registrada en «' + a.titulo + '».';
    el('exito-inscripcion').hidden = false;
    pintarPlazas();
  }

  function iniciar(texto) {
    var r = C.parsearActividades(texto);
    if (r.error || !r.actividades.length) {
      el('mensaje-carga').textContent = r.error || 'No hay actividades disponibles para inscribirse.';
      el('mensaje-carga').hidden = false;
      el('enviar').disabled = true;
      return;
    }
    acts = C.ordenar(r.actividades);
    el('actividad').innerHTML = acts.map(function (a) {
      return '<option value="' + C.escaparHtml(a.id) + '">' + C.escaparHtml(a.titulo + ' · ' + a.fecha) + '</option>';
    }).join('');
    var pedida = new URLSearchParams(window.location.search).get('actividad');
    if (pedida && acts.some(function (a) { return a.id === pedida; })) { el('actividad').value = pedida; }
    pintarPlazas();
  }

  doc.addEventListener('DOMContentLoaded', function () {
    el('form-inscripcion').addEventListener('submit', enviar);
    el('actividad').addEventListener('change', function () { limpiarErrores(); el('exito-inscripcion').hidden = true; pintarPlazas(); });
    el('form-inscripcion').addEventListener('input', function () { el('exito-inscripcion').hidden = true; });
    fetch('datos/actividades.json').then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.text();
    }).then(iniciar).catch(function (e) {
      el('mensaje-carga').textContent = 'No se pudo cargar la lista de actividades (' + e.message + ').';
      el('mensaje-carga').hidden = false;
      el('enviar').disabled = true;
    });
  });
})();
