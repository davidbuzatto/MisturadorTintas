/**
 * @module color/mixing
 * Modelos de mistura de tintas.
 */

import { l2s, s2l, lin2hex } from './convert.js';
import { NB, spec2lin } from './spectral.js';

/**
 * Modelos de mistura disponíveis (identificador → rótulo curto na tabela).
 * @type {ReadonlyArray<readonly [string, string]>}
 */
export const MODELS = [
  ['km', 'Pigmento · KM (espalh. estimado)'],
  ['kmeq', 'Pigmento · KM (espalh. igual)'],
  ['lin', 'RGB linear'],
  ['srgb', 'RGB direto'],
];

/**
 * @typedef {Object} MixItem
 * @property {import('./spectral.js').PaintFit} p  ajuste espectral da tinta.
 * @property {number} w  peso da tinta (quantidade já multiplicada pela força).
 */

/**
 * Mistura tintas e devolve o resultado em RGB linear.
 *
 * Modelos:
 *  - `km`   : Kubelka-Munk, K/S ponderado por peso × espalhamento estimado de cada tinta.
 *  - `kmeq` : Kubelka-Munk com o mesmo espalhamento para todas as tintas.
 *  - `lin`  : média em RGB linear (mistura de luz).
 *  - `srgb` : média direta dos valores sRGB (o que um editor de imagens faria).
 *
 * Nos modelos KM somam-se ainda os resíduos de ajuste ponderados, para que
 * uma tinta pura reproduza exatamente o hex do catálogo.
 *
 * @param {MixItem[]} items tintas da mistura.
 * @param {'km'|'kmeq'|'lin'|'srgb'} model modelo de mistura.
 * @returns {number[]} [r, g, b] linear (pode sair levemente de 0..1).
 */
export function mixLin(items, model) {
  let tot = 0;
  for (const it of items) tot += it.w;
  if (tot <= 0) return [0, 0, 0];

  if (model === 'lin') {
    const o = [0, 0, 0];
    for (const it of items) for (let k = 0; k < 3; k++) o[k] += (it.w / tot) * it.p.lin[k];
    return o;
  }
  if (model === 'srgb') {
    const o = [0, 0, 0];
    for (const it of items) for (let k = 0; k < 3; k++) o[k] += (it.w / tot) * l2s(it.p.lin[k]);
    return o.map(s2l);
  }

  // Kubelka-Munk: mistura linear de K/S, ponderada por peso × espalhamento.
  let den = 0;
  const ks = new Float64Array(NB);
  for (const it of items) {
    const s = model === 'kmeq' ? 1 : it.p.S;
    const a = it.w * s;
    den += a;
    const k = it.p.ks;
    for (let i = 0; i < NB; i++) ks[i] += a * k[i];
  }
  // K/S → reflectância: R = 1 + K/S − √((K/S)² + 2·K/S)
  const R = new Float64Array(NB);
  for (let i = 0; i < NB; i++) {
    const q = ks[i] / den;
    R[i] = 1 + q - Math.sqrt(q * q + 2 * q);
  }
  const l = spec2lin(R);
  for (const it of items) for (let k = 0; k < 3; k++) l[k] += (it.w / tot) * it.p.resid[k];
  return l;
}

/**
 * Mistura tintas e devolve o resultado como hex (canais limitados a 0..1).
 * @param {MixItem[]} items tintas da mistura.
 * @param {'km'|'kmeq'|'lin'|'srgb'} model modelo de mistura.
 * @returns {string} cor "#rrggbb".
 */
export function mixHex(items, model) {
  return lin2hex(mixLin(items, model).map((v) => (v < 0 ? 0 : v > 1 ? 1 : v)));
}
