import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Reseñas de los libros de Lorena Gall.
 * - Sin `url`: reseña propia → genera página interna en /<slug>/ (slug = nombre del archivo).
 * - Con `url`: nota externa → solo aparece en /resenas/ con link externo.
 */
const resenas = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/resenas' }),
  schema: z.object({
    titulo: z.string(),
    autor: z.string(),
    medio: z.string().optional(),
    fecha: z.coerce.date().optional(),
    libro: z.string(),
    resumen: z.string(),
    url: z.url().optional(),
    // Orden manual en el listado (mantiene el orden del sitio original).
    orden: z.number().int().optional(),
  }),
});

export const collections = { resenas };
