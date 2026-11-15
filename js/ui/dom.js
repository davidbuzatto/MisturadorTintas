/**
 * @module ui/dom
 * Utilitários de DOM e de formatação usados pelos módulos de interface.
 */

import { hex2lab } from '../color/convert.js';
import { dE00 } from '../color/deltaE.js';
import { has, t } from '../i18n/index.js';

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
 * Descrição em palavras de um ΔE00, no idioma atual.
 * @param {number} d valor de ΔE00.
 * @returns {string}
 */
export function deText(d) {
  const faixa = d < 1 ? 0 : d < 2 ? 1 : d < 3.5 ? 2 : d < 5 ? 3 : d < 10 ? 4 : 5;
  return t(`de.${faixa}`);
}

/**
 * Cor de texto (preto/branco) legível sobre um fundo hex.
 * @param {string} hex cor de fundo.
 * @returns {'#000'|'#fff'}
 */
export function contrastInk(hex) {
  return hex2lab(hex)[0] > 55 ? '#000' : '#fff';
}

/**
 * Rótulo de uma linha de tintas (sem a marca): tradução (`set.<id>`) quando existe; senão o nome comercial.
 * @param {{id: string, rotulo: string}} s linha de ingredientes (ver `data/sets.js`).
 * @returns {string}
 */
export const setRotulo = (s) => (has(`set.${s.id}`) ? t(`set.${s.id}`) : s.rotulo);

/**
 * Nome completo de uma linha de tintas ("Vallejo Model Air").
 * @param {{id: string, marca: string, rotulo: string}} s linha de ingredientes.
 * @returns {string}
 */
export const setNome = (s) => `${s.marca} ${setRotulo(s)}`;

/**
 * Torna um elemento (div/span) um botão: clique do mouse, ou teclado (foco por Tab; Enter e Espaço ativam).
 * `onAlt` (opcional) é a ação alternativa, ligada à tecla T (usada para marcar "tenho").
 * @param {HTMLElement} el elemento.
 * @param {() => void} onClick ação principal.
 * @param {() => void} [onAlt] ação alternativa (tecla T).
 */
export function ativavel(el, onClick, onAlt) {
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.addEventListener('click', onClick);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    } else if (onAlt && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      onAlt();
    }
  });
}
