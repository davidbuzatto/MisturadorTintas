/**
 * @module ui/targets
 * Seção "2 · Cor-alvo": abas de catálogos, seletor de linha (nos catálogos que
 * se dividem em linhas, como a Vallejo), busca, grade de cores e cor livre.
 */

import { CATALOG_NAMES, TARGET_TABS, catalogLines, targetOf } from '../data/catalogs.js';
import { $, esc } from './dom.js';

/** Valor de `state.lines[aba]` que significa "todas as linhas". */
const ALL_LINES = '*';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createTargets(ctx) {
  const { state, save, catalogs } = ctx;

  /**
   * Linha selecionada na aba atual: `null` se o catálogo não tem linhas,
   * `ALL_LINES` para todas, ou o nome da linha (padrão: a primeira).
   * @returns {string|null}
   */
  function currentLine() {
    if (state.tab === 'free') return null;
    const lines = catalogLines(catalogs[state.tab]);
    if (!lines.length) return null;
    const sel = state.lines[state.tab];
    return sel === ALL_LINES || lines.includes(sel) ? sel : lines[0];
  }

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
        renderLines();
        renderGrid();
      };
      t.appendChild(b);
    });
  }

  /** Renderiza o seletor de linha (oculto nos catálogos sem linhas). */
  function renderLines() {
    const box = $('tgtLines');
    box.innerHTML = '';
    const sel = currentLine();
    box.style.display = sel === null ? 'none' : '';
    if (sel === null) return;
    [[ALL_LINES, 'Todas'], ...catalogLines(catalogs[state.tab]).map((l) => [l, l])].forEach(([valor, rotulo]) => {
      const b = document.createElement('button');
      b.textContent = rotulo;
      b.setAttribute('aria-pressed', sel === valor);
      b.onclick = () => {
        state.lines[state.tab] = valor;
        save();
        renderLines();
        renderGrid();
      };
      box.appendChild(b);
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
    const line = currentLine();
    catalogs[state.tab].forEach((p) => {
      if (line !== null && line !== ALL_LINES && p.line !== line) return;
      if (q && (p.code + ' ' + p.name).toLowerCase().indexOf(q) < 0) return;
      const c = document.createElement('div');
      c.className = 'cell' + (p.degrade ? ' deg' : '');
      c.title =
        `${p.code} ${p.name} ${p.hex}` +
        (p.line ? ` · ${p.line}${p.series ? ' / ' + p.series : ''}` : '') +
        (p.finish ? ` · ${p.finish}` : '') +
        (p.degrade ? ' · amostra em degradê/metálica: cor aproximada' : '');
      // "Todas as linhas": mostra a linha junto do código para distinguir
      const sub = p.code + (line === ALL_LINES && p.line ? ` · ${p.line}` : '') + (p.series ? ` · ${p.series}` : '');
      c.innerHTML =
        `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)}<b>${esc(sub)}</b></span>`;
      c.onclick = () => {
        state.target = targetOf(state.tab, p);
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
    renderLines();
    renderGrid();
  }

  return { bind };
}
