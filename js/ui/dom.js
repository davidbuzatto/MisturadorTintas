/**
 * @module ui/dom
 * Utilitários de DOM e de formatação usados pelos módulos de interface.
 */

import { hex2lab } from '../color/convert.js';
import { dE00 } from '../color/deltaE.js';

/**
 * Atalho para `document.getElementById`.
 * @param {string} id
 * @returns {HTMLElement}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Escapa texto para uso seguro dentro de HTML/atributos.
 * @param {*} s valor a escapar.
 * @returns {string}
 */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/**
 * ΔE00 entre duas cores hex.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function deHex(a, b) {
  return dE00(hex2lab(a), hex2lab(b));
}

/**
 * Descrição em palavras de um ΔE00.
 * @param {number} d valor de ΔE00.
 * @returns {string}
 */
export function deText(d) {
  return d < 1 ? 'imperceptível'
    : d < 2 ? 'só lado a lado'
    : d < 3.5 ? 'muito parecida'
    : d < 5 ? 'parecida'
    : d < 10 ? 'diferente'
    : 'bem diferente';
}

/**
 * Cor de texto (preto/branco) legível sobre um fundo hex.
 * @param {string} hex cor de fundo.
 * @returns {'#000'|'#fff'}
 */
export function contrastInk(hex) {
  return hex2lab(hex)[0] > 55 ? '#000' : '#fff';
}
