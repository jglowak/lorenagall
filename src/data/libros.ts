import type { ImageMetadata } from 'astro';
import falsaCoralTapa from '../assets/libros/falsa-coral-tapa.png';
import rapazTapa from '../assets/libros/rapaz-tapa.jpg';
import rapazTapaContratapa from '../assets/libros/rapaz-tapa-contratapa.jpg';
import dragonTapa from '../assets/libros/el-dragon-sin-fuego-tapa.jpg';
import dragonContratapa from '../assets/libros/el-dragon-sin-fuego-contratapa.jpg';
import guisoTapa from '../assets/libros/guiso-de-conejo-tapa.jpg';
import guisoContratapa from '../assets/libros/guiso-de-conejo-contratapa.jpg';
import hachazoTapa from '../assets/libros/hachazo-tapa.png';

export interface Descarga {
  formato: 'mobi' | 'pdf' | 'epub';
  file: string; // dentro de public/descargas/
}

export interface Libro {
  id: string;
  titulo: string;
  /** Editorial y año según la bio del sitio original. */
  editorial: string;
  anio: number;
  genero: 'novela' | 'infantil';
  sinopsis: string[]; // HTML inline (solo <em>)
  imagenes: { src: ImageMetadata; alt: string }[];
  descargas: Descarga[];
  /** Link de compra: solo Falsa coral lo tiene. */
  comprar?: { url: string; editorial: string };
}

export const falsaCoral: Libro = {
  id: 'falsa-coral',
  titulo: 'Falsa coral',
  editorial: 'Alción',
  anio: 2022,
  genero: 'novela',
  sinopsis: [
    'Situada en Barcelona, <em>Falsa coral</em> cuenta la historia de Elena, una joven argentina que, en el año 2002, viaja a España, escapando de la crisis económica de su país. La urgencia por conseguir trabajo la lleva hasta las barras americanas, bares de coperas que inician a muchas chicas en la prostitución. En esta ciudad multicultural, Elena descubre el poder del sexo, los buenos amigos, su pasión por la arquitectura y el I Ching, y también, la violencia del mundo. <em>Falsa coral</em> es una novela de aprendizaje que ahonda, sobre todo, en la naturaleza indomable del deseo.',
  ],
  imagenes: [{ src: falsaCoralTapa, alt: 'Tapa de la novela Falsa coral, de Lorena Gall (Alción Editora)' }],
  descargas: [
    { formato: 'mobi', file: 'falsa-coral-lorena-gall.mobi' },
    { formato: 'pdf', file: 'falsa-coral-lorena-gall.pdf' },
    { formato: 'epub', file: 'falsa-coral-lorena-gall.epub' },
  ],
  comprar: { url: 'https://alcioneditora.com.ar/productos/falsa-coral/', editorial: 'Alción Editora' },
};

export const rapaz: Libro & { fragmento: string[] } = {
  id: 'rapaz',
  titulo: 'Rapaz',
  editorial: 'Laguna Negra',
  anio: 2019,
  genero: 'novela',
  sinopsis: [
    '<em>Rapaz</em>, la primera novela de Lorena Gall, cuenta la relación entre Magdalena, una odontóloga de 39 años, y Ezequiel, un albañil de 22, y los problemas que surgen entre los dos a partir del momento en el que ella queda embarazada. La novela nos transporta al pasado y al futuro de estos personajes para mostrarnos los caminos imprevistos a los que pueden llevarnos el deseo y la necesidad de los demás.',
  ],
  fragmento: [
    '–¡Despertate, forro! –Magda sintió que la parte mezquina de su cerebro daba las órdenes. Ezequiel manoteó la colcha, pero estaba empapada. La tiró lejos con un insulto y se tapó con la sábana. Ella cargó de nuevo la pava y se la vació encima. Ezequiel gritó con furia y la empujó. Magda se cayó al piso sin tiempo de poner las manos. El golpe de la cabeza contra la silla se perdió en el rugido de un motor que vino de afuera. Antes de desmayarse, percibió las partículas de polvo que bailaban en los rayos de sol. Se hizo de noche. Cuando abrió los ojos de nuevo, Ezequiel lloraba a su lado.',
    '–Perdoname, mi amor, perdoname –repetía, con la voz engolada por los mocos.',
    'Magda trató de ubicarse: su cuarto, la cama revuelta, la silla que esta vez no habían usado de perchero, la ropa tirada. Ezequiel esquivó los ojos y la besó en la frente. Ella sintió un dolor picante y buscó la herida surcando el pelo con los dedos. Un agujerito del tamaño de un botón se abría atrás de su cabeza. Aterrorizada, se tocó la panza y la bombacha, pero no encontró nada raro. Sintió que el pecho se le hinchaba de frío.',
  ],
  imagenes: [
    { src: rapazTapa, alt: 'Tapa de la novela Rapaz, de Lorena Gall: una mano con uñas largas y curvas sobre fondo lila' },
    { src: rapazTapaContratapa, alt: 'Contratapa y tapa de la novela Rapaz' },
  ],
  descargas: [
    { formato: 'mobi', file: 'rapaz-lorena-gall.mobi' },
    { formato: 'pdf', file: 'rapaz-lorena-gall.pdf' },
    { formato: 'epub', file: 'rapaz-lorena-gall.epub' },
  ],
};

export const infantiles: (Libro & { anchor: string })[] = [
  {
    id: 'el-dragon-sin-fuego',
    anchor: 'dragon',
    titulo: 'El Dragón Sin Fuego',
    editorial: '15 y 15',
    anio: 2016,
    genero: 'infantil',
    sinopsis: [],
    imagenes: [
      { src: dragonTapa, alt: 'Tapa del libro infantil El dragón sin fuego' },
      { src: dragonContratapa, alt: 'Contratapa del libro infantil El dragón sin fuego' },
    ],
    descargas: [{ formato: 'pdf', file: 'el-dragon-sin-fuego.pdf' }],
  },
  {
    id: 'guiso-de-conejo',
    anchor: 'guiso',
    titulo: 'Guiso de conejo',
    editorial: '15 y 15',
    anio: 2019,
    genero: 'infantil',
    sinopsis: [],
    imagenes: [
      { src: guisoTapa, alt: 'Tapa del libro infantil Guiso de conejo' },
      { src: guisoContratapa, alt: 'Contratapa del libro infantil Guiso de conejo' },
    ],
    descargas: [{ formato: 'pdf', file: 'guiso-de-conejo.pdf' }],
  },
  {
    id: 'hachazo',
    anchor: 'hachazo',
    titulo: 'Hachazo',
    editorial: 'Ensayo y error',
    anio: 2019,
    genero: 'infantil',
    sinopsis: [],
    imagenes: [{ src: hachazoTapa, alt: 'Tapa y contratapa de Hachazo, nouvelle juvenil de Lorena Gall' }],
    descargas: [{ formato: 'pdf', file: 'hachazo.pdf' }],
  },
];

export const infantilIntro = {
  titulo: 'Libros para chicos',
  parrafos: [
    '<em>Trabajo en familia</em> es un proyecto de creación conjunta de libros para chicos entre una mamá que escribe y una hija que dibuja.',
    'La colección ya cuenta con tres libros: <em>El dragón sin fuego</em>, <em>Guiso de conejo</em> y <em>Hachazo</em>.',
    'Textos: Lorena Gall',
    'Ilustraciones: Genoveva Lojo Gall',
  ],
};
