// Verifica que cada URL del sitio viejo responda en dist/: página real o redirección 301 válida.
// Uso: npm run build && npm run verify
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const errors = [];
const ok = [];

// 1) URLs viejas: lista versionada + export de WordPress (si está disponible localmente).
const old = new Set(
  readFileSync('scripts/urls-sitio-viejo.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
);
let fromXml = 0;
if (existsSync('migracion')) {
  for (const f of readdirSync('migracion').filter((f) => f.endsWith('.xml'))) {
    const xml = readFileSync(join('migracion', f), 'utf8');
    for (const item of xml.split('<item>').slice(1)) {
      const type = item.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]>/)?.[1];
      const status = item.match(/<wp:status><!\[CDATA\[(.*?)\]\]>/)?.[1];
      const slug = item.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]>/)?.[1];
      if (status !== 'publish' || !slug) continue;
      const path = { page: slug === 'home' ? '/' : `/${slug}/`, post: `/${slug}/`, wpdmpro: `/download/${slug}/` }[type];
      if (path && !old.has(path)) { old.add(path); fromXml++; }
    }
  }
}

// 2) Redirecciones de dist/_redirects.
const redirects = new Map();
if (existsSync(join(DIST, '_redirects'))) {
  for (const line of readFileSync(join(DIST, '_redirects'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [from, to, status] = t.split(/\s+/);
    redirects.set(from, { to, status: Number(status) });
  }
}

const fileFor = (path) => {
  const clean = path.split('#')[0].split('?')[0];
  if (clean.endsWith('/')) return join(DIST, clean, 'index.html');
  return join(DIST, clean);
};
const resolves = (path) => existsSync(fileFor(path)) && statSync(fileFor(path)).isFile();

for (const path of [...old].sort()) {
  if (resolves(path)) { ok.push(`200  ${path}`); continue; }
  const r = redirects.get(path);
  if (!r) { errors.push(`SIN RESPUESTA: ${path} (no hay página ni redirección)`); continue; }
  if (r.status !== 301) errors.push(`REDIRECCIÓN NO 301: ${path} → ${r.to} (${r.status})`);
  else if (!resolves(r.to)) errors.push(`REDIRECCIÓN ROTA: ${path} → ${r.to} (destino inexistente)`);
  else ok.push(`301  ${path} → ${r.to}`);
}

// 3) Toda redirección debe apuntar a algo que exista.
for (const [from, r] of redirects) if (!resolves(r.to)) errors.push(`_redirects roto: ${from} → ${r.to}`);

// 4) Páginas esperadas, 404, robots y sitemap.
for (const need of ['404.html', 'robots.txt', 'sitemap-index.xml', '_headers']) if (!existsSync(join(DIST, need))) errors.push(`Falta dist/${need}`);

// 5) Links internos de cada HTML (href/src a rutas del sitio) deben resolver.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
let links = 0;
for (const f of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    links++;
    const p = m[1];
    if (p.startsWith('//')) continue;
    if (!resolves(p) && !redirects.has(p) && !existsSync(join(DIST, p))) errors.push(`Link roto en ${f.replace(DIST + '/', '')}: ${p}`);
  }
}

console.log(ok.join('\n'));
console.log(`\n${old.size} URLs viejas (${fromXml} extra desde XML) · ${links} links internos revisados · ${redirects.size} redirecciones`);
if (errors.length) { console.error('\nERRORES:\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1); }
console.log('✓ Todas las URLs del sitio viejo responden en dist/');
