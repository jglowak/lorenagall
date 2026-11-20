import { statSync } from 'node:fs';
import { join } from 'node:path';

/** Tamaño real del archivo en public/descargas, formateado en es-AR (ej. "1,57 MB"). */
export function tamano(file: string): string {
  const bytes = statSync(join(process.cwd(), 'public', 'descargas', file)).size;
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: n >= 10 ? 0 : 2, minimumFractionDigits: 0 });
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`;
  return `${fmt(Math.round(bytes / 1024))} KB`;
}
