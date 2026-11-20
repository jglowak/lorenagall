/**
 * Worker de Lorena Gall. Con `assets.run_worker_first = ["/api/*"]` solo recibe las
 * rutas /api/*; el resto lo sirven directamente los assets estáticos (dist/).
 *
 * POST /api/contacto → valida, verifica Turnstile y envía el mail con Resend (fetch, sin SDK).
 */

interface Env {
  /** Binding de assets estáticos (wrangler.jsonc → assets.binding). */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  RESEND_API_KEY: string;
  /** Casilla que recibe los mensajes (NO se expone en el HTML). */
  CONTACT_TO: string;
  /** Remitente, p. ej. "Web Lorena Gall <contacto@lorenagall.com.ar>" o onboarding@resend.dev. */
  CONTACT_FROM: string;
  TURNSTILE_SECRET: string;
}

const LIMITS = { nombre: 100, email: 254, mensaje: 5000, minMensaje: 5, body: 20_000 } as const;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const SUBJECT = 'Nuevo mensaje enviado desde lorenagall.com.ar';

type Field = 'nombre' | 'email' | 'mensaje';
type Fields = Partial<Record<Field, string>>;

const json = (status: number, body: Record<string, unknown>, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Quita saltos de línea y caracteres de control (evita inyección de cabeceras). */
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();

function validate(input: Record<string, unknown>): { ok: true; data: Record<Field, string> } | { ok: false; fields: Fields } {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const nombre = oneLine(str(input.nombre));
  const email = oneLine(str(input.email));
  const mensaje = str(input.mensaje).replace(/\r\n?/g, '\n').trim();
  const fields: Fields = {};

  if (!nombre) fields.nombre = 'Escribí tu nombre.';
  else if (nombre.length > LIMITS.nombre) fields.nombre = `El nombre no puede superar los ${LIMITS.nombre} caracteres.`;

  if (!email) fields.email = 'Escribí tu email.';
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) fields.email = 'Revisá el email: parece que no es válido.';

  if (mensaje.length < LIMITS.minMensaje) fields.mensaje = `Escribí tu mensaje (mínimo ${LIMITS.minMensaje} caracteres).`;
  else if (mensaje.length > LIMITS.mensaje) fields.mensaje = `El mensaje no puede superar los ${LIMITS.mensaje} caracteres.`;

  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, data: { nombre, email, mensaje } };
}

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<'ok' | 'invalid' | 'unavailable'> {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return 'unavailable';
    const out = (await res.json()) as { success?: boolean };
    return out.success ? 'ok' : 'invalid';
  } catch {
    return 'unavailable';
  }
}

async function sendMail(env: Env, d: Record<Field, string>): Promise<boolean> {
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111">',
    `<p><strong>Nombre:</strong> ${escapeHtml(d.nombre)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(d.email)}</p>`,
    '<p><strong>Mensaje:</strong></p>',
    `<p style="white-space:pre-wrap;margin:0">${escapeHtml(d.mensaje)}</p>`,
    '</div>',
  ].join('');
  const text = `Nombre: ${d.nombre}\nEmail: ${d.email}\n\nMensaje:\n${d.mensaje}\n`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: d.email,
        subject: SUBJECT,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Se registra solo el estado y el código de error de Resend; nunca el contenido del mensaje.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      console.error('resend_failed', res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error('resend_error', err instanceof Error ? err.name : 'unknown');
    return false;
  }
}

async function contacto(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
  }

  // Solo se acepta desde el mismo sitio (los navegadores siempre envían Origin en POST con fetch).
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json(403, { ok: false, error: 'forbidden_origin' });
  }

  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > LIMITS.body) return json(413, { ok: false, error: 'payload_too_large' });

  const raw = await request.text();
  if (raw.length > LIMITS.body) return json(413, { ok: false, error: 'payload_too_large' });

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('shape');
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  // Honeypot: un bot lo completó. Se responde "ok" para no darle pistas y no se envía nada.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return json(200, { ok: true });
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM || !env.TURNSTILE_SECRET) {
    console.error('config_missing');
    return json(500, { ok: false, error: 'server_misconfigured' });
  }

  const v = validate(input);
  if (!v.ok) return json(422, { ok: false, error: 'validation', fields: v.fields });

  const token = typeof input.turnstileToken === 'string' ? input.turnstileToken : '';
  if (!token || token.length > 2048) return json(403, { ok: false, error: 'captcha' });
  const captcha = await verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP'));
  if (captcha === 'invalid') return json(403, { ok: false, error: 'captcha' });
  if (captcha === 'unavailable') return json(503, { ok: false, error: 'captcha_unavailable' }, { 'Retry-After': '30' });

  const sent = await sendMail(env, v.data);
  return sent ? json(200, { ok: true }) : json(502, { ok: false, error: 'send_failed' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contacto' || pathname === '/api/contacto/') return contacto(request, env);
    if (pathname.startsWith('/api/')) return json(404, { ok: false, error: 'not_found' });
    // Seguridad extra: si algún día se quita run_worker_first, el resto sigue yendo a los assets.
    return env.ASSETS.fetch(request);
  },
};
