import type { APIRoute } from 'astro';
import { NOINDEX } from 'astro:env/client';
import { siteUrl } from '../lib/seo';

export const GET: APIRoute = () => {
  const body = NOINDEX
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap-index.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
