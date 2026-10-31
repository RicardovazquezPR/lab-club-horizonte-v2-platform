// DEV0003 REQ-008: pruebas de js/exportar.js. Uso: node --test pruebas/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/exportar.js');

const acts = [
  { id: 'b', titulo: 'Charla "final"; sí', fecha: '2026-11-17', hora_inicio: '18:30', cupo: 3 },
  { id: 'a', titulo: 'Taller', fecha: '2026-11-03', hora_inicio: '17:00', cupo: 2 },
  { id: 'c', titulo: 'Sin inscritos', fecha: '2026-11-20', hora_inicio: '16:00', cupo: 5 },
];
const ins = [
  { actividad: 'b', nombre: 'Ñandú Pérez', correo: 'n@x.com', estudiante: '7', fecha_inscripcion: '2026-11-01T10:00:00.000Z' },
  { actividad: 'a', nombre: 'Ana', correo: 'ana@x.com', estudiante: '1', fecha_inscripcion: '2026-11-01T09:00:00.000Z' },
  { actividad: 'a', nombre: 'Beto', correo: 'beto@x.com', estudiante: '2', fecha_inscripcion: '2026-11-01T08:00:00.000Z' },
];

test('REQ-008 resumen agrupa por actividad con plazas ocupadas y disponibles, ordenado por fecha', () => {
  const g = E.resumenPorActividad(acts, ins);
  assert.deepStrictEqual(g.map(x => x.actividad.id), ['a', 'b', 'c']);
  assert.deepStrictEqual(g.map(x => [x.ocupadas, x.disponibles]), [[2, 0], [1, 2], [0, 5]]);
  assert.deepStrictEqual(g[0].inscritos.map(i => i.nombre), ['Beto', 'Ana']); // por fecha de inscripcion
});
test('REQ-008 inscripciones de una actividad que ya no esta en el JSON no se pierden', () => {
  const g = E.resumenPorActividad(acts, ins.concat([{ actividad: 'zz', nombre: 'X', correo: 'x@x.com', estudiante: '9', fecha_inscripcion: '2026-11-02T00:00:00.000Z' }]));
  assert.strictEqual(g[g.length - 1].conocida, false);
  assert.strictEqual(g[g.length - 1].ocupadas, 1);
  assert.match(E.generarCsv(acts, [{ actividad: 'zz', nombre: 'X', correo: 'x@x.com', estudiante: '9', fecha_inscripcion: 'f' }]), /zz \(actividad/);
});
test('REQ-008 el CSV empieza con BOM UTF-8 y trae las 6 columnas pedidas en orden', () => {
  const csv = E.generarCsv(acts, ins);
  assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
  assert.strictEqual(csv.slice(1).split('\r\n')[0], 'Actividad;Fecha;Nombre;Correo;Número de estudiante;Fecha de inscripción');
});
test('REQ-008 el CSV tiene una fila por inscripcion, CRLF y acentos intactos', () => {
  const csv = E.generarCsv(acts, ins);
  const lineas = csv.slice(1).split('\r\n');
  assert.strictEqual(lineas.length, 5); // cabecera + 3 + final vacio
  assert.strictEqual(lineas[4], '');
  assert.ok(lineas.some(l => l.includes('Ñandú Pérez')));
  assert.ok(lineas[1].startsWith('Taller;2026-11-03;Beto;beto@x.com;2;'));
  assert.ok(!/[^\r]\n/.test(csv));
});
test('REQ-008 comillas y separadores dentro de un valor se escapan segun RFC 4180', () => {
  assert.strictEqual(E.escaparCsv('Charla "final"; sí'), '"Charla ""final""; sí"');
  assert.strictEqual(E.escaparCsv('a\nb'), '"a\nb"');
  assert.strictEqual(E.escaparCsv(null), '');
  assert.strictEqual(E.escaparCsv(5), '5');
});
test('REQ-008 valores que empiezan por = + - @ se neutralizan contra inyeccion de formulas', () => {
  for (const v of ['=SUMA(A1)', '+1', '-1', '@cmd', '\tx']) {
    assert.ok(E.escaparCsv(v).startsWith("'"), v);
  }
  assert.strictEqual(E.escaparCsv('normal=1'), 'normal=1');
});
test('REQ-008 sin inscripciones el CSV solo trae la cabecera', () => {
  const csv = E.generarCsv(acts, []);
  assert.strictEqual(csv.slice(1), 'Actividad;Fecha;Nombre;Correo;Número de estudiante;Fecha de inscripción\r\n');
});
