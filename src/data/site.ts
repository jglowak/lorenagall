export const SITE_NAME = 'Lorena Gall';
export const SITE_TAGLINE = 'Escritora';
export const AUTHOR = {
  name: 'Lorena Inés Gall',
  birthYear: '1976',
  birthPlace: 'Santa Fe, Argentina',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/falsa-coral/', label: 'Falsa coral' },
  { href: '/rapaz/', label: 'Rapaz' },
  { href: '/infantil/', label: 'Infantil' },
  { href: '/resenas/', label: 'Reseñas' },
  { href: '/contacto/', label: 'Contacto' },
] as const;

export const SOCIAL = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/lolonou' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/lorenainesgall/' },
] as const;

export const LICENSE = {
  name: 'Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional',
  short: 'CC BY-NC-SA 4.0',
  href: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es',
};

/** Slugs reservados: una reseña propia no puede pisar una página fija. */
export const RESERVED_SLUGS = ['falsa-coral', 'rapaz', 'infantil', 'resenas', 'contacto', 'api', 'descargas', '404', 'robots.txt'];
