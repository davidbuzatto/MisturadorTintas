/**
 * @module ui/targets
 * Seção "2 · Cor-alvo": abas de catálogos, busca, grade de cores e cor livre.
 */

import { CATALOG_NAMES, TARGET_TABS } from '../data/catalogs.js';
import { $, esc } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createTargets(ctx) {
  const { state, save, catalogs } = ctx;

  /** Renderiza as abas de catálogo. */
  function renderTabs() {
    const t = $('tgtTabs');
    t.innerHTML = '';
    TARGET_TABS.forEach((k) => {
      const b = document.createElement('button');
      b.textContent = CATALOG_NAMES[k];
      b.setAttribute('aria-pressed', state.tab === k);
      b.onclick = () => {
        state.tab = k;
        save();
        renderTabs();
        renderGrid();
      };
      t.appendChild(b);
    });
  }

  /** Renderiza a grade de cores do catálogo selecionado (ou o seletor de cor livre). */
  function renderGrid() {
    const g = $('tgtGrid');
    g.innerHTML = '';
    $('freeBox').style.display = state.tab === 'free' ? '' : 'none';
    if (state.tab === 'free') {
      $('freeColor').value = state.free;
      $('freeHex').value = state.free;
      g.style.display = 'none';
      return;
    }
    g.style.display = '';
    const q = $('tgtSearch').value.trim().toLowerCase();
    catalogs[state.tab].forEach((p) => {
      if (q && (p.code + ' ' + p.name).toLowerCase().indexOf(q) < 0) return;
      const c = document.createElement('div');
      c.className = 'cell';
      c.title = `${p.code} ${p.name} ${p.hex}`;
      c.innerHTML =
        `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)}<b>${p.code}</b></span>`;
      c.onclick = () => {
        state.target = { hex: p.hex, label: `${CATALOG_NAMES[state.tab]} ${p.code} ${p.name}` };
        save();
        ctx.ui.result.render();
        $('resSec').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      g.appendChild(c);
    });
  }

  /**
   * Define a cor-alvo livre (ignora hex inválido).
   * @param {string} h cor "#rrggbb".
   */
  function setFree(h) {
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) return;
    state.free = h.toLowerCase();
    state.target = { hex: state.free, label: 'Cor livre' };
    save();
    $('freeColor').value = state.free;
    $('freeHex').value = state.free;
    ctx.ui.result.render();
  }

  /** Liga os eventos da seção e faz a primeira renderização. */
  function bind() {
    $('freeColor').oninput = function () { setFree(this.value); };
    $('freeHex').onchange = function () { setFree(this.value.trim()); };
    $('tgtSearch').oninput = renderGrid;
    renderTabs();
    renderGrid();
  }

  return { bind };
}
