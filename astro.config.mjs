// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Variables de build: .env (local) o "Build variables" de Cloudflare Workers Builds.
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const SITE_URL = (env.SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');
// Seguro por defecto: solo se indexa si NOINDEX es exactamente "false".
const NOINDEX = env.NOINDEX !== 'false';

/** Genera dist/_headers (cabeceras de Workers static assets) según NOINDEX. */
function headersFile() {
  return {
    name: 'headers-file',
    hooks: {
      /** @param {{ dir: URL }} ctx */
      'astro:build:done': async ({ dir }) => {
        const common = [
          'X-Content-Type-Options: nosniff',
          'Referrer-Policy: strict-origin-when-cross-origin',
          'Permissions-Policy: camera=(), microphone=(), geolocation=()',
        ];
        const lines = ['/*', ...common.map((h) => `  ${h}`)];
        if (NOINDEX) lines.push('  X-Robots-Tag: noindex, nofollow');
        lines.push(
          '',
          '/_astro/*',
          '  Cache-Control: public, max-age=31536000, immutable',
          '',
          '/descargas/*',
          '  Cache-Control: public, max-age=86400',
          '  X-Content-Type-Options: nosniff',
          '',
        );
        await writeFile(fileURLToPath(new URL('_headers', dir)), lines.join('\n'));
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap(), headersFile()],
  env: {
    schema: {
      SITE_URL: envField.string({ context: 'client', access: 'public', default: 'http://localhost:4321' }),
      NOINDEX: envField.boolean({ context: 'client', access: 'public', default: true }),
      PUBLIC_TURNSTILE_SITEKEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
