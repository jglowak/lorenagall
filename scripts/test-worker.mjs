// Tests del Worker (POST /api/contacto). Uso: npm test
// Node >= 22.6 con --experimental-strip-types (ver script "test" en package.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { escapeHtml } from '../src/worker.ts';

const env = {
  ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
  RESEND_API_KEY: 're_test',
  CONTACT_TO: 'destino@example.com',
  CONTACT_FROM: 'Web Lorena Gall <contacto@lorenagall.com.ar>',
  TURNSTILE_SECRET: 'secret',
};
const URL_ = 'https://sitio.test/api/contacto';
const valid = { nombre: 'Ana Pérez', email: 'ana@example.com', mensaje: 'Hola, me encantó Falsa coral.', turnstileToken: 'tok', website: '' };

const req = (body, init = {}) =>
  new Request(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://sitio.test', ...(init.headers ?? {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });

/** Simula Turnstile y Resend. */
function mockFetch({ turnstile = { success: true }, turnstileStatus = 200, resendStatus = 200, throwTurnstile = false } = {}) {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('siteverify')) {
      if (throwTurnstile) throw new Error('network');
      return new Response(JSON.stringify(turnstile), { status: turnstileStatus });
    }
    if (String(url).includes('api.resend.com')) return new Response(JSON.stringify({ id: 'x' }), { status: resendStatus });
    throw new Error('fetch inesperado: ' + url);
  };
  return { calls, restore: () => (globalThis.fetch = orig) };
}
const run = async (r, m = {}) => { const mock = mockFetch(m); try { const res = await worker.fetch(r, env); return { res, body: await res.json(), calls: mock.calls }; } finally { mock.restore(); } };

test('envío OK: 200, Reply-To = email del visitante, destino y remitente de env', async () => {
  const { res, body, calls } = await run(req(valid));
  assert.equal(res.status, 200); assert.deepEqual(body, { ok: true });
  const resend = calls.find((c) => c.url.includes('resend'));
  const sent = JSON.parse(resend.opts.body);
  assert.equal(sent.reply_to, 'ana@example.com');
  assert.deepEqual(sent.to, ['destino@example.com']);
  assert.equal(sent.from, env.CONTACT_FROM);
  assert.equal(resend.opts.headers.Authorization, 'Bearer re_test');
  assert.match(sent.html, /Ana Pérez/);
});

test('escapa HTML en el cuerpo del mail', async () => {
  const { calls } = await run(req({ ...valid, nombre: '<b>Ana</b>', mensaje: '<script>alert(1)</script> & "hola"' }));
  const sent = JSON.parse(calls.find((c) => c.url.includes('resend')).opts.body);
  assert.ok(!sent.html.includes('<script>')); assert.ok(!sent.html.includes('<b>Ana'));
  assert.match(sent.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;hola&quot;/);
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});

test('el asunto es fijo: el nombre con saltos de línea no inyecta cabeceras', async () => {
  const { calls } = await run(req({ ...valid, nombre: 'Ana\r\nBcc: x@y.com' }));
  const sent = JSON.parse(calls.find((c) => c.url.includes('resend')).opts.body);
  assert.ok(!sent.subject.includes('Bcc')); assert.ok(!/[\r\n]/.test(sent.html.match(/Nombre:<\/strong> ([^<]*)/)[1]));
});

test('validación: 422 con errores por campo', async () => {
  const { res, body, calls } = await run(req({ nombre: '', email: 'no-es-mail', mensaje: 'hi', turnstileToken: 'tok' }));
  assert.equal(res.status, 422); assert.equal(body.error, 'validation');
  assert.deepEqual(Object.keys(body.fields).sort(), ['email', 'mensaje', 'nombre']);
  assert.equal(calls.length, 0, 'no debe llamar a Turnstile ni Resend');
});

test('límites de largo: nombre, email y mensaje', async () => {
  const a = await run(req({ ...valid, nombre: 'x'.repeat(101) })); assert.equal(a.res.status, 422); assert.ok(a.body.fields.nombre);
  const b = await run(req({ ...valid, email: 'a'.repeat(250) + '@e.com' })); assert.equal(b.res.status, 422); assert.ok(b.body.fields.email);
  const c = await run(req({ ...valid, mensaje: 'x'.repeat(5001) })); assert.equal(c.res.status, 422); assert.ok(c.body.fields.mensaje);
  const ok = await run(req({ ...valid, mensaje: 'x'.repeat(5000) })); assert.equal(ok.res.status, 200);
});

test('honeypot completo: responde 200 pero NO envía nada', async () => {
  const { res, body, calls } = await run(req({ ...valid, website: 'http://spam.example' }));
  assert.equal(res.status, 200); assert.equal(body.ok, true); assert.equal(calls.length, 0);
});

test('Turnstile inválido → 403 captcha y no envía mail', async () => {
  const { res, body, calls } = await run(req(valid), { turnstile: { success: false } });
  assert.equal(res.status, 403); assert.equal(body.error, 'captcha');
  assert.ok(!calls.some((c) => c.url.includes('resend')));
});

test('sin token de Turnstile → 403', async () => {
  const { res, body } = await run(req({ ...valid, turnstileToken: '' }));
  assert.equal(res.status, 403); assert.equal(body.error, 'captcha');
});

test('Turnstile caído → 503 con Retry-After', async () => {
  const { res, body } = await run(req(valid), { throwTurnstile: true });
  assert.equal(res.status, 503); assert.equal(body.error, 'captcha_unavailable'); assert.ok(res.headers.get('Retry-After'));
});

test('Resend falla → 502', async () => {
  const { res, body } = await run(req(valid), { resendStatus: 422 });
  assert.equal(res.status, 502); assert.equal(body.error, 'send_failed');
});

test('método distinto de POST → 405 con Allow', async () => {
  const { res } = await run(new Request(URL_, { method: 'GET' }));
  assert.equal(res.status, 405); assert.equal(res.headers.get('Allow'), 'POST');
});

test('origen cruzado → 403', async () => {
  const { res, body } = await run(req(valid, { headers: { Origin: 'https://evil.test' } }));
  assert.equal(res.status, 403); assert.equal(body.error, 'forbidden_origin');
});

test('content-type incorrecto → 415; JSON inválido → 400; cuerpo enorme → 413', async () => {
  assert.equal((await run(req('a=b', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }))).res.status, 415);
  assert.equal((await run(req('{no json'))).res.status, 400);
  assert.equal((await run(req('[1,2]'))).res.status, 400);
  assert.equal((await run(req(JSON.stringify({ ...valid, mensaje: 'x'.repeat(30000) })))).res.status, 413);
});

test('configuración faltante → 500', async () => {
  const mock = mockFetch();
  try {
    const res = await worker.fetch(req(valid), { ...env, RESEND_API_KEY: '' });
    assert.equal(res.status, 500);
  } finally { mock.restore(); }
});

test('otras rutas /api/* → 404 JSON; rutas no-API caen a los assets', async () => {
  const a = await run(new Request('https://sitio.test/api/otra', { method: 'POST' }));
  assert.equal(a.res.status, 404);
  const b = await worker.fetch(new Request('https://sitio.test/rapaz/'), env);
  assert.equal(await b.text(), 'asset');
});
