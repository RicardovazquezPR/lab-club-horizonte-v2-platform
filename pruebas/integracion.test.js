// DEV0003 REQ-001..REQ-008: flujo completo en Node con el JSON real: cargar, filtrar, inscribir hasta agotar y exportar.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../js/calendario.js');
const I = require('../js/inscripcion.js');
const E = require('../js/exportar.js');

const almacen = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const acts = C.parsearActividades(fs.readFileSync(path.join(__dirname, '..', 'datos', 'actividades.json'), 'utf8')).actividades;

test('flujo: la actividad de cupo 2 se agota, el calendario lo refleja y el CSV trae solo a los inscritos', () => {
  const s = almacen();
  const foto = acts.find((a) => a.cupo === 2);
  const filtradas = C.filtrar(acts, [foto.categoria]);
  assert.ok(filtradas.some((a) => a.id === foto.id));
  assert.ok(filtradas.every((a) => a.categoria === foto.categoria));
  const alta = (n, c) => I.inscribir(s, foto, { nombre: n, correo: c, estudiante: '10' + n.length }, new Date('2026-11-01T10:00:00Z'));
  assert.ok(alta('Ana', 'ana@x.com').ok);
  assert.ok(alta('Luis', 'luis@x.com').ok);
  assert.strictEqual(alta('Eva', 'eva@x.com').motivo, 'agotada');
  const lista = I.leerInscripciones(s);
  assert.strictEqual(I.plazasDisponibles(foto, lista), 0);
  const csv = E.generarCsv(acts, lista).slice(1).split('\r\n').filter(Boolean);
  assert.strictEqual(csv.length, 3);
  assert.ok(csv.every((l, i) => i === 0 || l.startsWith(foto.titulo + ';' + foto.fecha + ';')));
  const resumen = E.resumenPorActividad(acts, lista).find((g) => g.actividad.id === foto.id);
  assert.deepStrictEqual([resumen.ocupadas, resumen.disponibles], [2, 0]);
});
test('flujo: las demas actividades siguen con todas sus plazas', () => {
  const s = almacen();
  acts.forEach((a) => assert.strictEqual(I.plazasDisponibles(a, I.leerInscripciones(s)), a.cupo));
});
