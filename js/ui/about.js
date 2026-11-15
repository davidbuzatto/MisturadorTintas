/**
 * @module ui/about
 * Seção "Sobre": a lista de referências sobre a teoria e os algoritmos usados. Os textos vêm do
 * dicionário (`ref.*`); aqui ficam só os endereços, todos conferidos.
 */

import { t } from '../i18n/index.js';
import { $, esc } from './dom.js';

/** Referências: chave do texto no dicionário e endereço. */
export const REFERENCIAS = [
  ['ref.km', 'https://en.wikipedia.org/wiki/Kubelka%E2%80%93Munk_theory'],
  ['ref.subtractive', 'https://en.wikipedia.org/wiki/Subtractive_color'],
  ['ref.mixbox', 'https://scrtwpns.com/mixbox/'],
  ['ref.jakob', 'https://rgl.epfl.ch/publications/Jakob2019Spectral'],
  ['ref.wyman', 'https://research.nvidia.com/labs/rtr/publication/wyman2013simple/'],
  ['ref.illuminant', 'https://en.wikipedia.org/wiki/Standard_illuminant'],
  ['ref.srgb', 'https://en.wikipedia.org/wiki/SRGB'],
  ['ref.cielab', 'https://en.wikipedia.org/wiki/CIELAB_color_space'],
  ['ref.de00', 'https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/'],
  ['ref.nm', 'https://en.wikipedia.org/wiki/Nelder%E2%80%93Mead_method'],
];

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createAbout(ctx) {
  /** Desenha a lista de referências no idioma atual. */
  function render() {
    $('refList').innerHTML = REFERENCIAS.map(
      ([chave, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(t(chave))}</a></li>`
    ).join('');
  }

  return { render, refresh: render, bind: render };
}
