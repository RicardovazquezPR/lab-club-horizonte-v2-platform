/* DEV0003 REQ-002..REQ-004, REQ-009: capa DOM del calendario. Toda la logica esta en js/calendario.js.
   Antes: no existia. Si se quita: calendario.html muestra los controles pero ninguna actividad.
   Todo texto que viene del JSON se escapa con Calendario.escaparHtml antes de entrar al DOM. */
(function () {
  'use strict';
  var C = window.Calendario;
  var I = window.Inscripcion; // opcional: da las plazas disponibles
  var doc = document;
  var el = function (id) { return doc.getElementById(id); };
  var esc = C.escaparHtml;

  var estado = { acts: [], cats: [], vista: 'mes', anio: 0, mes0: 0, seleccion: null };

  function plazas(a) {
    return I ? I.plazasDisponibles(a, I.leerInscripciones(window.localStorage)) : a.cupo;
  }
  function textoPlazas(a) {
    var p = plazas(a);
    return p > 0 ? p + ' plazas disponibles' : 'Agotada';
  }
  function horaTexto(a) { return a.hora_inicio + ' a ' + a.hora_fin; }
  function fechaLarga(f) {
    var p = f.split('-');
    return Number(p[2]) + ' de ' + C.etiquetaMes(Number(p[0]), Number(p[1]) - 1);
  }

  function visibles() { return C.ordenar(C.filtrar(estado.acts, estado.cats)); }

  function botonActividad(a) {
    return '<button type="button" class="evento cat-' + (C.categorias(estado.acts).indexOf(a.categoria) % 4) +
      '" data-id="' + esc(a.id) + '"><span class="hora">' + esc(a.hora_inicio) + '</span> ' +
      '<span class="texto-evento">' + esc(a.titulo) + '</span></button>';
  }

  function pintarMes() {
    var lista = visibles();
    el('titulo-mes').textContent = C.etiquetaMes(estado.anio, estado.mes0);
    var semanas = C.construirMes(estado.anio, estado.mes0, lista);
    var html = '';
    var total = 0;
    semanas.forEach(function (s) {
      html += '<tr>';
      s.forEach(function (d) {
        if (d.dentro) { total += d.actividades.length; }
        html += '<td class="' + (d.dentro ? '' : 'fuera') + '"><span class="num-dia">' + d.dia + '</span>' +
          (d.dentro ? d.actividades.map(botonActividad).join('') : '') + '</td>';
      });
      html += '</tr>';
    });
    doc.querySelector('#tabla-mes tbody').innerHTML = html;
    el('mes-vacio').hidden = total !== 0;
    var prox = C.proximoMesConActividades(lista, estado.anio, estado.mes0);
    el('ir-proximo').hidden = !prox || total !== 0;
  }

  function pintarLista() {
    var lista = visibles();
    el('lista').innerHTML = lista.map(function (a) {
      return '<li class="item-lista"><button type="button" class="evento" data-id="' + esc(a.id) + '">' +
        '<strong>' + esc(a.titulo) + '</strong> · ' + esc(fechaLarga(a.fecha)) + ', ' + esc(horaTexto(a)) +
        ' · ' + esc(a.categoria) + ' · ' + esc(textoPlazas(a)) + '</button></li>';
    }).join('');
    el('lista-vacia').hidden = lista.length !== 0;
  }

  function pintarDetalle() {
    var a = estado.acts.filter(function (x) { return x.id === estado.seleccion; })[0];
    el('detalle').hidden = !a;
    if (!a) { return; }
    el('detalle-contenido').innerHTML =
      '<h3>' + esc(a.titulo) + '</h3>' +
      '<dl class="datos"><dt>Categoría</dt><dd>' + esc(a.categoria) + '</dd>' +
      '<dt>Fecha</dt><dd>' + esc(fechaLarga(a.fecha)) + '</dd>' +
      '<dt>Hora</dt><dd>' + esc(horaTexto(a)) + '</dd>' +
      '<dt>Lugar</dt><dd>' + esc(a.lugar) + '</dd>' +
      '<dt>Plazas</dt><dd>' + esc(textoPlazas(a)) + ' (cupo ' + esc(a.cupo) + ')</dd>' +
      (a.descripcion ? '<dt>Descripción</dt><dd>' + esc(a.descripcion) + '</dd>' : '') + '</dl>' +
      '<p><button type="button" class="boton" id="descargar-ics">Añadir a mi calendario (.ics)</button> ' +
      '<a class="boton enlace-boton" href="inscripcion.html?actividad=' + encodeURIComponent(a.id) + '">Inscribirme</a></p>';
    el('descargar-ics').addEventListener('click', function () { descargarIcs(a); });
  }

  function descargarIcs(a) {
    var blob = new Blob([C.generarIcs(a)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var enlace = doc.createElement('a');
    enlace.href = url;
    enlace.download = a.id + '.ics';
    doc.body.appendChild(enlace);
    enlace.click();
    doc.body.removeChild(enlace);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function pintar() {
    el('vista-mes').hidden = estado.vista !== 'mes';
    el('vista-lista').hidden = estado.vista !== 'lista';
    el('ver-mes').setAttribute('aria-pressed', String(estado.vista === 'mes'));
    el('ver-lista').setAttribute('aria-pressed', String(estado.vista === 'lista'));
    if (estado.vista === 'mes') { pintarMes(); } else { pintarLista(); }
    pintarDetalle();
  }

  function pintarFiltros() {
    el('lista-categorias').innerHTML = C.categorias(estado.acts).map(function (c, i) {
      return '<label class="filtro"><input type="checkbox" name="categoria" value="' + esc(c) + '" id="cat-' + i + '"> ' + esc(c) + '</label>';
    }).join('');
  }

  function alElegirActividad(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-id]') : null;
    if (!b) { return; }
    estado.seleccion = b.getAttribute('data-id');
    pintarDetalle();
    el('detalle').scrollIntoView({ block: 'nearest' });
  }

  function mover(delta) {
    var m = C.mesSiguiente(estado.anio, estado.mes0, delta);
    estado.anio = m.anio; estado.mes0 = m.mes0;
    pintar();
  }

  function iniciar(texto) {
    var r = C.parsearActividades(texto);
    r.avisos.forEach(function (a) { if (window.console) { console.warn(a); } });
    if (r.error) {
      el('mensaje-calendario').textContent = r.error + ' Avisa a la directiva del club.';
      el('mensaje-calendario').hidden = false;
      return;
    }
    estado.acts = r.actividades;
    var hoy = new Date();
    estado.anio = hoy.getFullYear(); estado.mes0 = hoy.getMonth();
    pintarFiltros();
    pintar();
  }

  function cargar() {
    fetch('datos/actividades.json').then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.text();
    }).then(iniciar).catch(function (e) {
      el('mensaje-calendario').textContent = 'No se pudo cargar el fichero de actividades (' + e.message +
        '). Si abriste la página desde el disco, sírvela por HTTP o usa la versión publicada.';
      el('mensaje-calendario').hidden = false;
    });
  }

  doc.addEventListener('DOMContentLoaded', function () {
    el('mes-anterior').addEventListener('click', function () { mover(-1); });
    el('mes-siguiente').addEventListener('click', function () { mover(1); });
    el('ver-mes').addEventListener('click', function () { estado.vista = 'mes'; pintar(); });
    el('ver-lista').addEventListener('click', function () { estado.vista = 'lista'; pintar(); });
    el('ir-proximo').addEventListener('click', function () {
      var p = C.proximoMesConActividades(visibles(), estado.anio, estado.mes0);
      if (p) { estado.anio = p.anio; estado.mes0 = p.mes0; pintar(); }
    });
    el('filtros').addEventListener('change', function () {
      estado.cats = Array.prototype.map.call(doc.querySelectorAll('#lista-categorias input:checked'), function (i) { return i.value; });
      pintar();
    });
    el('quitar-filtros').addEventListener('click', function () {
      Array.prototype.forEach.call(doc.querySelectorAll('#lista-categorias input'), function (i) { i.checked = false; });
      estado.cats = [];
      pintar();
    });
    el('vista-mes').addEventListener('click', alElegirActividad);
    el('vista-lista').addEventListener('click', alElegirActividad);
    cargar();
  });
})();
