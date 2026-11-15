/**
 * @module ui/result
 * Seção "3 · Resultado": amostras alvo × mistura, ΔE00 e comparação entre modelos.
 */

import { hex2lab } from '../color/convert.js';
import { MODELS, mixHex } from '../color/mixing.js';
import { $, contrastInk, deHex, deText } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createResult(ctx) {
  const { state, paintByCode } = ctx;

  /**
   * Hex da mistura atual no modelo indicado, ou `null` se não houver ingredientes válidos.
   * @param {string} model identificador do modelo.
   * @returns {string|null}
   */
  function currentMix(model) {
    const items = state.ing
      .filter((i) => paintByCode[i.code] && i.v > 0)
      .map((i) => ({ p: paintByCode[i.code].fit, w: i.v * (i.s || 1) }));
    return items.length ? mixHex(items, model) : null;
  }

  /** Renderiza amostras, ΔE e a tabela de modelos. */
  function render() {
    const th = state.target.hex;
    const mh = currentMix(state.model);
    $('bigT').style.background = th;
    $('bigM').style.background = mh || 'transparent';
    $('bigT').style.color = contrastInk(th);
    $('bigM').style.color = mh && hex2lab(mh)[0] > 55 ? '#000' : '#fff';
    $('bigT').textContent = 'alvo';
    $('bigM').textContent = mh ? 'mistura' : '—';
    $('capT').textContent = state.target.label + ' · ' + th;
    $('capM').textContent = mh || '';
    if (mh) {
      const d = deHex(th, mh);
      $('deVal').textContent = 'ΔE ' + d.toFixed(1);
      $('deTxt').textContent = deText(d);
    } else {
      $('deVal').textContent = '–';
      $('deTxt').textContent = '';
    }
    const body = $('cmp');
    body.innerHTML = '';
    MODELS.forEach(([id, label]) => {
      const h = currentMix(id);
      if (!h) return;
      const tr = document.createElement('tr');
      if (id === state.model) tr.className = 'sel';
      tr.innerHTML =
        `<td>${label}</td><td><span class="chip" style="background:${h}"></span> ${h}</td>` +
        `<td>${deHex(th, h).toFixed(1)}</td>`;
      body.appendChild(tr);
    });
  }

  return { render, currentMix };
}
