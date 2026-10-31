// DEV0003 REQ-009, REQ-011: comprobaciones estaticas de las paginas (sin navegador).
// No sustituyen a Lighthouse ni a la prueba con teclado real: miden lo que se puede medir con Node.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const NUEVAS = ['calendario.html', 'inscripcion.html', 'resumen.html'];
const TODAS = ['index.html', 'quienes-somos.html', 'actividades.html', 'contacto.html'].concat(NUEVAS);

test('REQ-011 existen las tres paginas nuevas y el menu de las 7 las enlaza', () => {
  NUEVAS.forEach((p) => assert.ok(fs.existsSync(path.join(RAIZ, p)), p));
  TODAS.forEach((p) => NUEVAS.forEach((n) => assert.ok(leer(p).includes('href="' + n + '"'), p + ' sin enlace a ' + n)));
});
test('REQ-009 cada pagina tiene lang="es", viewport, title y un solo h1', () => {
  TODAS.forEach((p) => {
    const h = leer(p);
    assert.match(h, /<html lang="es">/, p);
    assert.match(h, /<meta name="viewport"/, p);
    assert.match(h, /<title>[^<]+<\/title>/, p);
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, p + ' h1');
  });
});
test('REQ-009 todo campo de formulario tiene una etiqueta label for asociada', () => {
  ['inscripcion.html', 'contacto.html'].forEach((p) => {
    const h = leer(p);
    const campos = [...h.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(campos.length >= 3, p);
    campos.forEach((id) => assert.ok(new RegExp('<label[^>]*for="' + id + '"').test(h), p + ': falta label para ' + id));
  });
});
test('REQ-009 los mensajes de error de los formularios estan enlazados con aria-describedby', () => {
  const h = leer('inscripcion.html');
  ['nombre', 'correo', 'estudiante'].forEach((c) => {
    assert.match(h, new RegExp('id="' + c + '"[^>]*aria-describedby="error-' + c + '"'));
    assert.match(h, new RegExp('id="error-' + c + '"'));
  });
});
test('REQ-009 las paginas nuevas tienen enlace de salto, nav con nombre accesible y main', () => {
  NUEVAS.forEach((p) => {
    const h = leer(p);
    assert.match(h, /class="salto" href="#contenido"/, p);
    assert.match(h, /<main id="contenido">/, p);
    assert.match(h, /<nav class="menu" aria-label="[^"]+"/, p);
    assert.match(h, /aria-current="page"/, p);
  });
});
test('REQ-009 los botones de las vistas del calendario exponen su estado con aria-pressed', () => {
  const h = leer('calendario.html');
  assert.match(h, /id="ver-mes"[^>]*aria-pressed="true"/);
  assert.match(h, /id="ver-lista"[^>]*aria-pressed="false"/);
  assert.match(h, /<th scope="col">/);
});
test('REQ-009 el CSS adapta a movil y define foco visible', () => {
  const c = leer('css/estilos.css');
  assert.match(c, /@media \(max-width: 39\.99rem\)/);
  assert.match(c, /:focus-visible/);
});
test('REQ-011 ninguna pagina carga recursos externos (todo funciona en Pages sin terceros)', () => {
  TODAS.forEach((p) => assert.ok(!/(src|href)="https?:\/\//.test(leer(p)), p));
});
test('REQ-009/011 cada script y hoja de estilo referenciados existen en el repositorio', () => {
  TODAS.forEach((p) => {
    [...leer(p).matchAll(/(?:src|href)="((?:js|css|datos)\/[^"]+)"/g)].forEach((m) => assert.ok(fs.existsSync(path.join(RAIZ, m[1])), p + ' -> ' + m[1]));
  });
});
test('REQ-011 .nojekyll presente y el flujo de Actions corre con push', () => {
  assert.ok(fs.existsSync(path.join(RAIZ, '.nojekyll')));
  const y = leer('.github/workflows/pruebas.yml');
  assert.match(y, /on:\s*\n\s+push:/);
  assert.match(y, /npm test/);
});
