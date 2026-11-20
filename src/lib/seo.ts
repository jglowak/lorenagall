import { SITE_URL } from 'astro:env/client';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { AUTHOR, SITE_NAME, SOCIAL } from '../data/site';

export const siteUrl = SITE_URL.replace(/\/+$/, '');
export const abs = (path: string) => new URL(path, siteUrl + '/').toString();

/** Imagen og/twitter: se conserva el formato original y se publica con URL absoluta. */
export async function ogImage(src: ImageMetadata, alt: string, opts?: { width?: number; height?: number }) {
  const img = await getImage({ src, ...(opts ?? {}), format: src.format === 'png' ? 'png' : 'jpeg', quality: 85 });
  return { url: abs(img.src), width: Number(img.attributes.width), height: Number(img.attributes.height), alt };
}

export const personLd = () => ({
  '@type': 'Person',
  '@id': abs('/#autora'),
  name: AUTHOR.name,
  alternateName: SITE_NAME,
  jobTitle: 'Escritora',
  birthDate: AUTHOR.birthYear,
  birthPlace: { '@type': 'Place', name: AUTHOR.birthPlace },
  url: abs('/'),
  sameAs: SOCIAL.map((s) => s.href),
});

export const websiteLd = () => ({
  '@type': 'WebSite',
  '@id': abs('/#sitio'),
  url: abs('/'),
  name: SITE_NAME,
  inLanguage: 'es-AR',
  publisher: { '@id': abs('/#autora') },
});

interface BookLdInput {
  titulo: string;
  editorial: string;
  anio: number;
  path: string;
  imageUrl?: string;
  description?: string;
  illustrator?: string;
}
export const bookLd = (b: BookLdInput) => ({
  '@type': 'Book',
  '@id': b.path.includes('#') ? abs(b.path) : abs(b.path) + '#libro',
  name: b.titulo,
  url: abs(b.path),
  inLanguage: 'es-AR',
  author: { '@id': abs('/#autora') },
  ...(b.illustrator ? { illustrator: { '@type': 'Person', name: b.illustrator } } : {}),
  publisher: { '@type': 'Organization', name: b.editorial },
  datePublished: String(b.anio),
  ...(b.description ? { description: b.description } : {}),
  ...(b.imageUrl ? { image: b.imageUrl } : {}),
});
