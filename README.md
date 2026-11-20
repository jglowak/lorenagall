# lorenagall.com.ar

Sitio de la escritora Lorena Gall. **Astro estático** (sin CMS, sin base de datos, sin SSR) desplegado en
**Cloudflare Workers con static assets**. Un único Worker (`src/worker.ts`) atiende `POST /api/contacto`;
todo lo demás son archivos estáticos de `dist/`.

```
src/content/resenas/*.md   Reseñas (Content Collection, schema zod en src/content.config.ts)
src/data/                  Datos de libros y del sitio (textos copiados del WordPress original)
src/pages/                 Páginas. Las reseñas propias salen de src/pages/[slug].astro (en la raíz)
src/assets/                Imágenes optimizadas por astro:assets (portadas, foto de la autora, og por defecto)
public/descargas/          Ebooks (.mobi/.pdf/.epub) con link directo
public/_redirects          301 desde URLs del WordPress anterior
src/worker.ts              Formulario de contacto (Turnstile + honeypot + Resend)
wrangler.jsonc             Config de Workers (assets = dist, 404-page, run_worker_first = /api/*)
scripts/                   verify-urls (URLs viejas → dist) y tests del Worker
```

## Correr en local

Requiere Node 22 (`.node-version`).

```bash
npm install
cp .env.example .env            # variables de BUILD (SITE_URL, NOINDEX, Turnstile sitekey, analytics)
npm run dev                     # http://localhost:4321 (sin /api/contacto)
```

Para probar **todo junto** (assets + redirecciones + `_headers` + formulario) con el Worker real:

```bash
cp .dev.vars.example .dev.vars  # variables de RUNTIME del Worker (RESEND_API_KEY, CONTACT_TO, ...)
npm run cf:dev                  # = npm run build && wrangler dev  → http://127.0.0.1:8787
```

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run build` | Genera `dist/` (sitemap, robots.txt y `_headers` incluidos) |
| `npm run verify` | Comprueba que cada URL del sitio viejo responde en `dist/` (200 o 301 válido) y que no hay links internos rotos |
| `npm test` | Tests del Worker (validación, Turnstile, honeypot, escape de HTML, códigos HTTP) |
| `npm run check` | `astro check` (tipos) |

> `wrangler dev` y `npm run dev` **no** leen las mismas variables: las `PUBLIC_*`, `SITE_URL` y `NOINDEX`
> se resuelven al **build** (`.env` o "Build variables" en Cloudflare); `RESEND_API_KEY`, `CONTACT_*` y
> `TURNSTILE_SECRET` las lee el **Worker en runtime** (`.dev.vars` o "Variables and secrets" en Cloudflare).

## Cómo agregar una reseña

Creá un archivo en `src/content/resenas/` (el nombre del archivo es el slug de la URL).

**Reseña propia** (genera la página `/<slug>/` en la raíz del sitio; sin `url`):

```md
---
titulo: "Falsa Coral, por Nombre Apellido"
autor: "Nombre Apellido"
fecha: 2024-03-15              # opcional
libro: "Falsa coral"
resumen: "Frase corta que se muestra en /resenas/ y como meta description."
orden: 6                       # opcional: posición en el listado (menor = primero)
---

Texto de la reseña. Párrafos separados por una línea en blanco.
Se puede usar <em>cursiva</em> y <strong>negrita</strong>.
```

El archivo `src/content/resenas/nombre-apellido-falsa-coral.md` publica `/nombre-apellido-falsa-coral/`.
No se pueden usar slugs que choquen con páginas fijas (`falsa-coral`, `rapaz`, `infantil`, `resenas`,
`contacto`, `api`, `descargas`, `404`): el build falla con un mensaje claro.

**Reseña externa** (solo aparece en `/resenas/`, con link a otro sitio; con `url`; el cuerpo se ignora):

```md
---
titulo: "Título de la nota"
autor: "Nombre del autor"
medio: "Nombre del medio"      # opcional
fecha: 2021-06-01              # opcional
libro: "Rapaz"
resumen: "Frase que se muestra en el listado."
url: "https://medio.example/nota"
orden: 7
---
```

Después: `git add`, `git commit`, `git push` → Workers Builds despliega solo.

## Variables

### Build (Workers & Pages → tu Worker → Settings → Build → *Variables and secrets*)

| Variable | Ejemplo | Para qué |
|---|---|---|
| `SITE_URL` | `https://lorenagall.<subdominio>.workers.dev` | Canonical, `og:url`, sitemap, robots. Sin barra final |
| `NOINDEX` | `true` / `false` | `true` ⇒ `<meta robots noindex>`, header `X-Robots-Tag` y `robots.txt` con `Disallow: /`. Solo se indexa si vale exactamente `false` |
| `PUBLIC_TURNSTILE_SITEKEY` | `0x4AAAA…` | Clave pública del widget de Turnstile (formulario) |
| `PUBLIC_CF_ANALYTICS_TOKEN` | token del beacon | Cloudflare Web Analytics. Si está vacía, no se carga nada. Sin cookies ni banner |
| `NODE_VERSION` | `22` | (opcional; ya está `.node-version`) |

### Runtime del Worker (Settings → *Variables and secrets*; **no** van en el repo)

| Variable | Tipo | Valor |
|---|---|---|
| `RESEND_API_KEY` | Secret | API key de Resend |
| `TURNSTILE_SECRET` | Secret | Secret key de Turnstile |
| `CONTACT_TO` | Variable | Casilla que recibe los mensajes |
| `CONTACT_FROM` | Variable | Remitente |

`wrangler.jsonc` tiene `keep_vars: true`, así que los deploys no borran lo cargado en el dashboard.

**Valores de PRUEBA** (el dominio todavía no está verificado en Resend):

- `CONTACT_FROM = onboarding@resend.dev`
- `CONTACT_TO = <tu email>` (con `onboarding@resend.dev` Resend solo entrega al email dueño de la cuenta)

**Valores FINALES** (cuando `lorenagall.com.ar` esté verificado en Resend):

- `CONTACT_FROM = "Web Lorena Gall <contacto@lorenagall.com.ar>"`
- `CONTACT_TO = lorenainesgall@yahoo.com`

El mail sale con `Reply-To` = email del visitante. El email de la autora no aparece en el HTML.

Turnstile para pruebas locales (siempre aprueba): sitekey `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

## Despliegue (Workers Builds, desde el dashboard)

1. Dashboard de Cloudflare → **Workers & Pages → Create → Import a repository** → elegí el repo privado de GitHub (autorizá la app de Cloudflare sobre ese repo).
2. Nombre del Worker: `lorenagall` (debe coincidir con `name` de `wrangler.jsonc`).
3. **Build command**: `npm run build` · **Deploy command**: `npx wrangler deploy` · **Root directory**: `/`.
4. **Node**: `.node-version` (22) ya está en el repo; opcionalmente variable `NODE_VERSION=22`.
5. Cargá las *Build variables* y las variables/secrets de runtime de arriba. Mientras sea `*.workers.dev`: `NOINDEX=true` y `SITE_URL` = la URL `workers.dev` del Worker.
6. Cada `git push` a la rama de producción construye y despliega.

Deploy manual (si lo necesitás): `npx wrangler login` (con la cuenta correcta) → `npm run deploy`.
Secrets por CLI: `npx wrangler secret put RESEND_API_KEY` (idem `TURNSTILE_SECRET`).

## Checklist de cutover (migrar el dominio desde otra cuenta de Cloudflare)

- [ ] Turnstile: crear el widget en la cuenta destino con los hostnames `lorenagall.com.ar` (y el `workers.dev` mientras pruebes); actualizar `PUBLIC_TURNSTILE_SITEKEY` y `TURNSTILE_SECRET`.
- [ ] Resend: verificar el dominio `lorenagall.com.ar` (SPF/DKIM en DNS). Cambiar `CONTACT_FROM` y `CONTACT_TO` a los valores finales.
- [ ] Mover la zona DNS `lorenagall.com.ar` a la cuenta destino (o apuntar los registros) y conservar los registros de mail existentes (MX, SPF, etc.).
- [ ] Workers → *Settings → Domains & Routes* → agregar `lorenagall.com.ar` (y `www` con redirección al apex si corresponde).
- [ ] Variables de build: `NOINDEX=false` y `SITE_URL=https://lorenagall.com.ar`. **Re-desplegar** (son de build).
- [ ] Verificar: `view-source` con `index, follow`, `https://lorenagall.com.ar/robots.txt` con `Sitemap:`, `X-Robots-Tag` ausente, canonical correcto.
- [ ] Probar `/api/contacto` end-to-end en producción: mensaje real a la casilla de Yahoo (revisar spam), Reply-To correcto, y un envío con el honeypot completo (no debe llegar nada).
- [ ] Probar redirecciones viejas (`/test/`, `/download/*`, `/category/resenas/`, `/sitemap_index.xml`).
- [ ] Google Search Console: agregar la propiedad (DNS), enviar `https://lorenagall.com.ar/sitemap-index.xml`, revisar cobertura.
- [ ] (Opcional) Cloudflare Web Analytics: crear el sitio y cargar `PUBLIC_CF_ANALYTICS_TOKEN`.
- [ ] Apagar el WordPress viejo cuando todo esté verificado (guardar un backup antes).

## Redirecciones (`public/_redirects`)

Todas las URLs de contenido se mantienen idénticas. Se redirigen con 301: `/test/`, `/home/` → `/`;
`/category/resenas/` → `/resenas/`; `/sitemap_index.xml` (y `/sitemap.xml`, `/wp-sitemap.xml`) → `/sitemap-index.xml`;
`/download/<paquete>/` (WP Download Manager) → archivo directo en `/descargas/`.
No se mantienen: `/feed/`, `/wp-admin/`, `/wp-content/uploads/*` (imágenes viejas) ni el resto de rutas internas de WordPress.
