/* DEV0003 REQ-005, REQ-006, REQ-007: inscripcion con validacion, cupos y almacenamiento local.
   Antes: no habia inscripcion. Ahora: las inscripciones viven en localStorage (clave CLAVE) y
   plazas disponibles = cupo del JSON menos inscripciones guardadas de esa actividad.
   El almacenamiento se inyecta (storage) para probarlo en Node con un doble.
   Si se quita: inscripcion.html y resumen.html pierden la logica y pruebas/inscripcion.test.js falla. */
(function (global) {
  'use strict';

  var CLAVE = 'club-horizonte-inscripciones-v1';

  /* Formato minimo usuario@dominio.ext, sin espacios (mismo criterio que el formulario de contacto). */
  function esCorreoValido(t) { return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(t || ''); }

  function normalizarCorreo(t) { return String(t || '').trim().toLowerCase(); }

  /* {campo: mensaje} solo con los campos que fallan. Todos obligatorios; solo espacios = vacio. */
  function validarInscripcion(v) {
    var e = {};
    var nombre = String((v && v.nombre) || '').trim();
    var correo = String((v && v.correo) || '').trim();
    var est = String((v && v.estudiante) || '').trim();
    if (!nombre) { e.nombre = 'Escribe tu nombre completo.'; }
    if (!correo) { e.correo = 'Escribe tu correo electrónico.'; }
    else if (!esCorreoValido(correo)) { e.correo = 'El correo no tiene un formato válido.'; }
    if (!est) { e.estudiante = 'Escribe tu número de estudiante.'; }
    return e;
  }

  /* Lee la lista; un valor corrupto o ausente da lista vacia en vez de romper la pagina. */
  function leerInscripciones(storage) {
    try {
      var crudo = storage && storage.getItem(CLAVE);
      var d = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(d) ? d.filter(function (x) { return x && x.actividad && x.correo; }) : [];
    } catch (e) { return []; }
  }

  function guardarInscripciones(storage, lista) {
    storage.setItem(CLAVE, JSON.stringify(lista));
  }

  function inscritos(actId, lista) {
    return lista.filter(function (i) { return i.actividad === actId; }).length;
  }

  function plazasDisponibles(act, lista) {
    return Math.max(0, act.cupo - inscritos(act.id, lista));
  }

  function yaInscrito(actId, correo, lista) {
    var c = normalizarCorreo(correo);
    return lista.some(function (i) { return i.actividad === actId && normalizarCorreo(i.correo) === c; });
  }

  /* Intenta inscribir. Devuelve {ok, errores, motivo, inscripcion}. Orden de comprobaciones:
     campos -> agotada -> duplicada -> guardado (que puede fallar si el navegador lo bloquea). */
  function inscribir(storage, act, valores, ahora) {
    var errores = validarInscripcion(valores);
    if (Object.keys(errores).length) { return { ok: false, errores: errores, motivo: 'validacion' }; }
    var lista = leerInscripciones(storage);
    if (plazasDisponibles(act, lista) <= 0) {
      return { ok: false, errores: {}, motivo: 'agotada', mensaje: 'La actividad está agotada.' };
    }
    if (yaInscrito(act.id, valores.correo, lista)) {
      return { ok: false, errores: { correo: 'Ese correo ya está inscrito en esta actividad.' }, motivo: 'duplicada' };
    }
    var ins = {
      actividad: act.id,
      nombre: String(valores.nombre).trim(),
      correo: String(valores.correo).trim(),
      estudiante: String(valores.estudiante).trim(),
      fecha_inscripcion: (ahora || new Date()).toISOString()
    };
    try { guardarInscripciones(storage, lista.concat([ins])); }
    catch (e) {
      return { ok: false, errores: {}, motivo: 'almacenamiento', mensaje: 'No se pudo guardar la inscripción en este navegador.' };
    }
    return { ok: true, errores: {}, motivo: '', inscripcion: ins };
  }

  var api = {
    CLAVE: CLAVE, esCorreoValido: esCorreoValido, validarInscripcion: validarInscripcion, leerInscripciones: leerInscripciones,
    guardarInscripciones: guardarInscripciones, inscritos: inscritos, plazasDisponibles: plazasDisponibles,
    yaInscrito: yaInscrito, inscribir: inscribir
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.Inscripcion = api;
})(typeof window !== 'undefined' ? window : globalThis);
