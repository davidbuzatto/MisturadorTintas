/**
 * @module ui/suggestions
 * Botão "sugerir mistura automática" e lista de receitas sugeridas.
 */

import { mixHex } from '../color/mixing.js';
import { suggest } from '../color/suggest.js';
import { $, deText, esc } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createSuggestions(ctx) {
  const { state, save } = ctx;

  /** Calcula e exibe as sugestões para a cor-alvo atual. */
  function run() {
    const out = $('sugOut');
    out.innerHTML = '<p class="muted">calculando…</p>';
    // adia um instante para o "calculando…" aparecer antes do cálculo pesado
    setTimeout(() => {
      const onlyOwn = $('onlyOwn').checked;
      const set = ctx.ingSet();
      const tenho = ctx.owned();
      const list = set.paints.filter((p) => !onlyOwn || tenho[p.code]);
      if (!list.length) {
        out.innerHTML =
          '<p class="muted">Nenhuma tinta marcada como “tenho”. Marque no seletor (botão direito) ou desligue o filtro.</p>';
        return;
      }
      const P = list.map((p) => ({ code: p.code, fit: p.fit, anchor: set.anchors.has(p.code) }));
      const results = suggest(P, state.target.hex, +$('maxN').value);
      out.innerHTML = '';
      results.forEach((r) => {
        const d = document.createElement('div');
        d.className = 'sug';
        const mh = mixHex(r.idx.map((i, k) => ({ p: P[i].fit, w: r.ws[k] })), 'km');
        const parts = r.idx
          .map((i, k) => {
            const p = ctx.ingPaint(P[i].code);
            return `<span class="chip" style="background:${p.hex}"></span> ${(r.ws[k] * 100).toFixed(0)}% ${esc(p.name)} <span class="muted">${p.code}</span>`;
          })
          .join(' + ');
        d.innerHTML =
          `<span class="chip" style="background:${mh};width:26px;height:26px"></span>` +
          `<div style="flex:1;min-width:200px">${parts}<div class="muted">${r.idx.length} tinta${r.idx.length > 1 ? 's' : ''} · ΔE ${r.de.toFixed(2)} (${deText(r.de)})</div></div>`;
        const b = document.createElement('button');
        b.textContent = 'usar';
        b.onclick = () => {
          state.ing = r.idx.map((i, k) => ({ code: P[i].code, v: Math.round(r.ws[k] * 1000) / 10, s: 1 }));
          ctx.ui.ingredients.setModel('km');
          save();
          ctx.update();
        };
        d.appendChild(b);
        out.appendChild(d);
      });
    }, 30);
  }

  /** Liga o botão da seção. */
  function bind() {
    $('btnSug').onclick = run;
  }

  return { bind };
}
