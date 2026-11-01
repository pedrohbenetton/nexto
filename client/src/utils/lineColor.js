// Cor da "placa" de cada linha: oficial quando a fonte informa, senão uma cor estável da paleta da marca
export const LINE_PALETTE = [
  '#c6f432', // lime (marca)
  '#f0582a', // laranja sinalização
  '#2f6fe8', // azul
  '#7c5cf0', // violeta
  '#0fa38f', // verde-água
  '#f5b700', // âmbar
  '#e8467c', // rosa
  '#0e1116'  // grafite
];

const DARK_TEXT = '#0e1116';
const LIGHT_TEXT = '#ffffff';

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${[...hex.slice(1)].map(c => c + c).join('')}`;
  return null;
}

// Luminância relativa (WCAG) para decidir texto claro ou escuro
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastText(color) {
  const hex = normalizeHex(color) || DARK_TEXT;
  // Ponto de equilíbrio entre contraste com preto e com branco
  return luminance(hex) > 0.179 ? DARK_TEXT : LIGHT_TEXT;
}

function hashCode(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function lineColor(line) {
  const official = normalizeHex(line.bgColor);
  if (official) {
    return { bg: official, fg: normalizeHex(line.fgColor) || contrastText(official) };
  }
  const bg = LINE_PALETTE[hashCode(line.routeCode || '') % LINE_PALETTE.length];
  return { bg, fg: contrastText(bg) };
}
