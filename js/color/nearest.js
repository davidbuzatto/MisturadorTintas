/**
 * @module color/nearest
 * Busca das cores de um catálogo mais próximas de uma cor, por diferença perceptual (ΔE00).
 */

import { hex2lab } from './convert.js';
import { dE00 } from './deltaE.js';

/** Cache do L*a*b* de cada tinta (as tintas dos catálogos não mudam durante a sessão). */
const labCache = new WeakMap();

/**
 * L*a*b* de uma tinta de catálogo (calculado uma vez).
 * @param {{hex: string}} paint tinta.
 * @returns {number[]} [L*, a*, b*].
 */
function labOf(paint) {
  let lab = labCache.get(paint);
  if (!lab) {
    lab = hex2lab(paint.hex);
    labCache.set(paint, lab);
  }
  return lab;
}

/**
 * ΔE00 entre uma tinta de catálogo e uma cor.
 * @param {{hex: string}} paint tinta do catálogo.
 * @param {string} hex cor "#rrggbb".
 * @returns {number}
 */
export function deToPaint(paint, hex) {
  return dE00(hex2lab(hex), labOf(paint));
}

/**
 * As `n` tintas do catálogo mais próximas de uma cor, da mais para a menos parecida.
 *
 * @template {{hex: string}} P
 * @param {P[]} paints tintas do catálogo.
 * @param {string} hex cor de referência "#rrggbb".
 * @param {number} [n=3] quantas devolver.
 * @param {(paint: P) => boolean} [excluir] tintas a ignorar (ex.: a própria cor de origem).
 * @returns {{paint: P, de: number}[]}
 */
export function nearest(paints, hex, n = 3, excluir = () => false) {
  const alvo = hex2lab(hex);
  /** @type {{paint: P, de: number}[]} */
  const melhores = [];
  for (const paint of paints) {
    if (excluir(paint)) continue;
    const de = dE00(alvo, labOf(paint));
    if (melhores.length === n && de >= melhores[n - 1].de) continue;
    // inserção ordenada (n é pequeno)
    let i = melhores.length;
    while (i > 0 && melhores[i - 1].de > de) i--;
    melhores.splice(i, 0, { paint, de });
    if (melhores.length > n) melhores.pop();
  }
  return melhores;
}
