/**
 * @module color/convert
 * Conversões entre espaços de cor: hex ⇄ sRGB ⇄ RGB linear ⇄ XYZ ⇄ CIE L*a*b*.
 *
 * Convenções do projeto:
 *  - "hex"  : string "#rrggbb".
 *  - "lin"  : RGB linear (luz) como [r, g, b] com cada canal em 0..1.
 *  - "lab"  : [L*, a*, b*] com iluminante D65.
 */

/** Branco de referência D65 (XYZ normalizado com Y = 1). */
export const XN = 0.95047;
export const YN = 1;
export const ZN = 1.08883;

/**
 * Remove a curva gama sRGB (sRGB 0..1 → linear 0..1).
 * @param {number} c canal sRGB.
 * @returns {number} canal linear.
 */
export function s2l(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Aplica a curva gama sRGB (linear → sRGB), limitando o valor a 0..1.
 * @param {number} c canal linear.
 * @returns {number} canal sRGB.
 */
export function l2s(c) {
  c = c < 0 ? 0 : c > 1 ? 1 : c;
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Converte "#rrggbb" em RGB linear.
 * @param {string} h cor hexadecimal (com ou sem "#").
 * @returns {number[]} [r, g, b] linear.
 */
export function hex2lin(h) {
  h = h.replace('#', '');
  return [0, 2, 4].map((i) => s2l(parseInt(h.substr(i, 2), 16) / 255));
}

/**
 * Converte RGB linear em "#rrggbb" (com gama e arredondamento).
 * @param {number[]} l [r, g, b] linear.
 * @returns {string} cor hexadecimal.
 */
export function lin2hex(l) {
  return '#' + l.map((v) => Math.round(l2s(v) * 255).toString(16).padStart(2, '0')).join('');
}

/**
 * RGB linear → XYZ (matriz sRGB / D65).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number[]} [X, Y, Z].
 */
export function lin2xyz(r, g, b) {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
  ];
}

/**
 * XYZ → RGB linear (inversa da matriz sRGB / D65).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number[]} [r, g, b] linear (pode sair de 0..1).
 */
export function xyz2lin(x, y, z) {
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
}

/** Função auxiliar f(t) da definição do CIE L*a*b*. */
function labF(t) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/**
 * XYZ → CIE L*a*b* (D65).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number[]} [L*, a*, b*].
 */
export function xyz2lab(x, y, z) {
  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * RGB linear → L*a*b*.
 * @param {number[]} l [r, g, b] linear.
 * @returns {number[]} [L*, a*, b*].
 */
export function lin2lab(l) {
  const x = lin2xyz(l[0], l[1], l[2]);
  return xyz2lab(x[0], x[1], x[2]);
}

/**
 * "#rrggbb" → L*a*b*.
 * @param {string} h cor hexadecimal.
 * @returns {number[]} [L*, a*, b*].
 */
export function hex2lab(h) {
  return lin2lab(hex2lin(h));
}

/**
 * RGB linear → L*a*b*, antes limitando os canais a 0..1 (útil para
 * resultados de mistura que podem sair levemente da gama).
 * @param {number[]} l [r, g, b] linear.
 * @returns {number[]} [L*, a*, b*].
 */
export function labOfLin(l) {
  return lin2lab(l.map((v) => (v < 0 ? 0 : v > 1 ? 1 : v)));
}
