// DEV0003 REQ-001..REQ-004: pruebas de js/calendario.js. Uso: node --test pruebas/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../js/calendario.js');

const base = { id: 'x1', titulo: 'T', categoria: 'A', fecha: '2026-11-05', hora_inicio: '10:00', hora_fin: '11:00', lugar: 'L', cupo: 3 };
const con = (o) => Object.assign({}, base, o);

test('REQ-001 el JSON publicado tiene 8 actividades validas, 4 categorias y una con cupo 2', () => {
  const r = C.parsearActividades(fs.readFileSync(path.join(__dirname, '..', 'datos', 'actividades.json'), 'utf8'));
  assert.strictEqual(r.error, '');
  assert.deepStrictEqual(r.avisos, []);
  assert.strictEqual(r.actividades.length, 8);
  assert.deepStrictEqual(C.categorias(r.actividades), ['Académica', 'Cultural', 'Deportiva', 'Voluntariado']);
  assert.strictEqual(r.actividades.filter(a => a.cupo === 2).length, 1);
  assert.ok(r.actividades.every(a => a.fecha.startsWith('2026-11')));
});
test('REQ-001 añadir o quitar una actividad en el JSON cambia el resultado sin tocar codigo', () => {
  const dos = C.parsearActividades(JSON.stringify([base, con({ id: 'x2' })]));
  const una = C.parsearActividades(JSON.stringify([base]));
  assert.strictEqual(dos.actividades.length, 2);
  assert.strictEqual(una.actividades.length, 1);
});
test('REQ-001 JSON con error de formato da mensaje claro y no lanza', () => {
  const r = C.parsearActividades('[{"id": ');
  assert.match(r.error, /error de formato/);
  assert.deepStrictEqual(r.actividades, []);
  assert.match(C.parsearActividades('{"a":1}').error, /debe ser una lista/);
});
test('REQ-001 actividad sin campos obligatorios se omite y se avisa', () => {
  C.CAMPOS_OBLIGATORIOS.forEach((campo) => {
    const a = con({}); delete a[campo];
    const r = C.parsearActividades(JSON.stringify([a, con({ id: 'ok' })]));
    assert.strictEqual(r.actividades.length, 1, campo);
    assert.match(r.avisos[0], new RegExp('falta ' + campo));
  });
});
test('REQ-001 valores invalidos: fecha, hora, cupo negativo e id repetido', () => {
  const r = C.parsearActividades(JSON.stringify([
    con({ id: 'a', fecha: '2026-02-30' }), con({ id: 'b', hora_inicio: '25:00' }), con({ id: 'c', cupo: -1 }),
    con({ id: 'd', cupo: '5' }), con({ id: 'e' }), con({ id: 'e' })]));
  assert.strictEqual(r.actividades.length, 1);
  assert.strictEqual(r.avisos.length, 5);
  assert.match(r.avisos[4], /id repetido/);
});
test('REQ-002 vista de lista ordena por fecha y hora ascendente sin mutar', () => {
  const ent = [con({ id: '3', fecha: '2026-11-09' }), con({ id: '2', hora_inicio: '12:00' }), con({ id: '1', hora_inicio: '08:00' })];
  const sal = C.ordenar(ent);
  assert.deepStrictEqual(sal.map(a => a.id), ['1', '2', '3']);
  assert.strictEqual(ent[0].id, '3');
});
test('REQ-002 vista de mes: noviembre de 2026 empieza en domingo, 6 semanas, lunes primero', () => {
  const m = C.construirMes(2026, 10, [con({ id: 'n', fecha: '2026-11-05' })]);
  assert.strictEqual(m.length, 6);
  assert.ok(m.every(s => s.length === 7));
  assert.strictEqual(m[0][0].fecha, '2026-10-26');
  assert.strictEqual(m[0][6].fecha, '2026-11-01');
  assert.strictEqual(m[0][6].dentro, true);
  assert.strictEqual(m[0][0].dentro, false);
  const dia = m.flat().find(d => d.fecha === '2026-11-05');
  assert.strictEqual(dia.actividades.length, 1);
});
test('REQ-002 las dos vistas muestran las mismas actividades', () => {
  const acts = C.parsearActividades(fs.readFileSync(path.join(__dirname, '..', 'datos', 'actividades.json'), 'utf8')).actividades;
  const enMes = C.construirMes(2026, 10, acts).flat().filter(d => d.dentro).flatMap(d => d.actividades).map(a => a.id).sort();
  assert.deepStrictEqual(enMes, C.ordenar(acts).map(a => a.id).sort());
});
test('REQ-002 navegar al mes anterior y siguiente cruza el año', () => {
  assert.deepStrictEqual(C.mesSiguiente(2026, 11, 1), { anio: 2027, mes0: 0 });
  assert.deepStrictEqual(C.mesSiguiente(2027, 0, -1), { anio: 2026, mes0: 11 });
  assert.strictEqual(C.etiquetaMes(2026, 10), 'noviembre de 2026');
});
test('REQ-002 mes de febrero bisiesto tiene 29 dias dentro del mes', () => {
  assert.strictEqual(C.construirMes(2028, 1, []).flat().filter(d => d.dentro).length, 29);
});
test('REQ-002 proximo mes con actividades desde octubre es noviembre; sin futuras es null', () => {
  const acts = [con({ fecha: '2026-11-05' })];
  assert.deepStrictEqual(C.proximoMesConActividades(acts, 2026, 9), { anio: 2026, mes0: 10 });
  assert.strictEqual(C.proximoMesConActividades(acts, 2027, 0), null);
});
test('REQ-003 filtro por una o varias categorias y quitar filtros muestra todas', () => {
  const acts = [con({ id: '1', categoria: 'A' }), con({ id: '2', categoria: 'B' }), con({ id: '3', categoria: 'C' })];
  assert.deepStrictEqual(C.filtrar(acts, ['A']).map(a => a.id), ['1']);
  assert.deepStrictEqual(C.filtrar(acts, ['A', 'C']).map(a => a.id), ['1', '3']);
  assert.strictEqual(C.filtrar(acts, []).length, 3);
  assert.strictEqual(C.filtrar(acts, null).length, 3);
});
test('REQ-003 las categorias salen del JSON: una nueva categoria aparece sola', () => {
  assert.deepStrictEqual(C.categorias([con({ categoria: 'Zeta' }), con({ categoria: 'Árbol' })]), ['Árbol', 'Zeta']);
});
test('REQ-004 .ics: estructura, CRLF, fecha, hora, lugar y titulo', () => {
  const ics = C.generarIcs(con({ id: 'ev', titulo: 'Taller, de; prueba', lugar: 'Aula 1, B', descripcion: 'a\nb' }), new Date(Date.UTC(2026, 9, 31, 8, 5, 9)));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'todas las lineas terminan en CRLF');
  assert.match(ics, /\r\nDTSTART:20261105T100000\r\n/);
  assert.match(ics, /\r\nDTEND:20261105T110000\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20261031T080509Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Taller\\, de\\; prueba\r\n/);
  assert.match(ics, /\r\nLOCATION:Aula 1\\, B\r\n/);
  assert.match(ics, /\r\nDESCRIPTION:a\\nb\r\n/);
  assert.match(ics, /\r\nUID:ev@club-horizonte.example\r\n/);
});
test('REQ-004 .ics: lineas largas se pliegan a 75 octetos', () => {
  const ics = C.generarIcs(con({ titulo: 'ñ'.repeat(120) }), new Date(0));
  ics.split('\r\n').forEach(l => assert.ok(Buffer.byteLength(l) <= 75, l.length));
  assert.ok(ics.includes('\r\n '));
});
test('REQ-009 escaparHtml neutraliza etiquetas del JSON', () => {
  assert.strictEqual(C.escaparHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});
