import { getCollection, type CollectionEntry } from 'astro:content';
import { RESERVED_SLUGS } from '../data/site';

export type Resena = CollectionEntry<'resenas'>;

export const esExterna = (r: Resena) => Boolean(r.data.url);

/** Todas las reseñas, en el orden manual definido por `orden` (luego por fecha desc). */
export async function todasLasResenas(): Promise<Resena[]> {
  const all = await getCollection('resenas');
  for (const r of all) {
    if (!esExterna(r) && RESERVED_SLUGS.includes(r.id)) {
      throw new Error(`La reseña "${r.id}" usa un slug reservado (${r.id}/ ya es una página fija). Renombrá el archivo.`);
    }
  }
  return all.sort(
    (a, b) => (a.data.orden ?? 999) - (b.data.orden ?? 999) || (b.data.fecha?.getTime() ?? 0) - (a.data.fecha?.getTime() ?? 0),
  );
}

const fmtCorta = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const fmtLarga = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' });
export const fechaCorta = (d: Date) => fmtCorta.format(d);
export const fechaLarga = (d: Date) => fmtLarga.format(d);

/** Línea de crédito del listado, igual que en el sitio original. */
export function credito(r: Resena): string {
  const { titulo, autor, medio, fecha } = r.data;
  if (!esExterna(r)) return titulo;
  const base = medio ? `Por ${autor}. En: ${medio}` : autor;
  return fecha ? `${base} ${fechaCorta(fecha)}` : base;
}
