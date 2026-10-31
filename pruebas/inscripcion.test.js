// DEV0003 REQ-005, REQ-006, REQ-007: pruebas de js/inscripcion.js. Uso: node --test pruebas/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const I = require('../js/inscripcion.js');

function almacenFalso() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}
const act = { id: 'a1', cupo: 2 };
const datos = (o) => Object.assign({ nombre: 'Ana Pérez', correo: 'ana@correo.com', estudiante: 'E-1001' }, o);

test('REQ-005 con todo vacio devuelve un error por campo', () => {
  const e = I.validarInscripcion({ nombre: '', correo: '', estudiante: '' });
  assert.deepStrictEqual(Object.keys(e).sort(), ['correo', 'estudiante', 'nombre']);
});
test('REQ-005 solo espacios cuenta como vacio y valores ausentes no rompen', () => {
  assert.strictEqual(Object.keys(I.validarInscripcion({ nombre: '   ', correo: ' ', estudiante: '\t' })).length, 3);
  assert.strictEqual(Object.keys(I.validarInscripcion(undefined)).length, 3);
});
test('REQ-005 correo con formato invalido da error solo en correo', () => {
  for (const malo of ['ana', 'ana@', '@x.com', 'ana@x', 'a na@x.com', 'ana@@x.com', 'ana@x..com']) {
    const e = I.validarInscripcion(datos({ correo: malo }));
    assert.deepStrictEqual(Object.keys(e), ['correo'], malo);
    assert.match(e.correo, /formato/);
  }
});
test('REQ-005 datos validos no dan errores', () => {
  assert.deepStrictEqual(I.validarInscripcion(datos()), {});
  assert.deepStrictEqual(I.validarInscripcion(datos({ correo: 'a.b+c@sub.dominio.es' })), {});
});
test('REQ-005 con campos invalidos no se guarda nada', () => {
  const s = almacenFalso();
  const r = I.inscribir(s, act, datos({ nombre: '' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motivo, 'validacion');
  assert.strictEqual(s._m.size, 0);
});
test('REQ-005 el mismo correo no puede inscribirse dos veces (sin distinguir mayusculas ni espacios)', () => {
  const s = almacenFalso();
  assert.ok(I.inscribir(s, { id: 'a1', cupo: 5 }, datos()).ok);
  const r = I.inscribir(s, { id: 'a1', cupo: 5 }, datos({ correo: '  ANA@correo.com ', nombre: 'Otra' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motivo, 'duplicada');
  assert.ok(r.errores.correo);
  assert.strictEqual(I.leerInscripciones(s).length, 1);
});
test('REQ-005 el mismo correo si puede inscribirse en otra actividad', () => {
  const s = almacenFalso();
  assert.ok(I.inscribir(s, { id: 'a1', cupo: 5 }, datos()).ok);
  assert.ok(I.inscribir(s, { id: 'a2', cupo: 5 }, datos()).ok);
});
test('REQ-006 plazas = cupo menos inscripciones de esa actividad', () => {
  const lista = [{ actividad: 'a1', correo: 'x@y.co' }, { actividad: 'a2', correo: 'x@y.co' }];
  assert.strictEqual(I.plazasDisponibles({ id: 'a1', cupo: 3 }, lista), 2);
  assert.strictEqual(I.plazasDisponibles({ id: 'a2', cupo: 1 }, lista), 0);
  assert.strictEqual(I.plazasDisponibles({ id: 'a3', cupo: 4 }, lista), 4);
});
test('REQ-006 cupo 2: dos inscripciones lo agotan y la tercera se bloquea', () => {
  const s = almacenFalso();
  assert.strictEqual(I.plazasDisponibles(act, I.leerInscripciones(s)), 2);
  assert.ok(I.inscribir(s, act, datos({ correo: 'a@x.com' })).ok);
  assert.strictEqual(I.plazasDisponibles(act, I.leerInscripciones(s)), 1);
  assert.ok(I.inscribir(s, act, datos({ correo: 'b@x.com' })).ok);
  assert.strictEqual(I.plazasDisponibles(act, I.leerInscripciones(s)), 0);
  const r = I.inscribir(s, act, datos({ correo: 'c@x.com' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motivo, 'agotada');
  assert.strictEqual(I.leerInscripciones(s).length, 2);
});
test('REQ-006 las plazas nunca bajan de cero aunque haya mas inscripciones que cupo', () => {
  const lista = [1, 2, 3].map((n) => ({ actividad: 'a1', correo: n + '@x.co' }));
  assert.strictEqual(I.plazasDisponibles({ id: 'a1', cupo: 2 }, lista), 0);
});
test('REQ-007 las inscripciones se guardan y se recuperan con otro lector (recarga)', () => {
  const s = almacenFalso();
  const r = I.inscribir(s, act, datos(), new Date('2026-11-01T10:00:00Z'));
  assert.ok(r.ok);
  const leidas = I.leerInscripciones(s); // como tras recargar: solo se lee del almacen
  assert.deepStrictEqual(leidas, [{ actividad: 'a1', nombre: 'Ana Pérez', correo: 'ana@correo.com', estudiante: 'E-1001', fecha_inscripcion: '2026-11-01T10:00:00.000Z' }]);
  assert.ok(s._m.has(I.CLAVE));
});
test('REQ-007 un valor corrupto en el almacen da lista vacia, no excepcion', () => {
  const s = almacenFalso();
  s.setItem(I.CLAVE, '{no es json');
  assert.deepStrictEqual(I.leerInscripciones(s), []);
  s.setItem(I.CLAVE, '{"a":1}');
  assert.deepStrictEqual(I.leerInscripciones(s), []);
  assert.deepStrictEqual(I.leerInscripciones(null), []);
});
test('REQ-007 si el navegador no deja guardar, se informa y no se pierde el estado', () => {
  const s = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const r = I.inscribir(s, act, datos());
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motivo, 'almacenamiento');
});
