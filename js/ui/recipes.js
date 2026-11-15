/**
 * @module ui/recipes
 * Seção "4 · Receitas salvas": salvar, carregar, excluir, registrar a cor
 * realmente obtida na bancada e exportar/importar JSON.
 */

import { $, deHex, esc } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createRecipes(ctx) {
  const { state, save, paintByCode } = ctx;

  /** Cópia profunda de dados simples (JSON). */
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /** Renderiza a lista de receitas. */
  function render() {
    const h = $('hist');
    h.innerHTML = '';
    if (!state.hist.length) {
      h.innerHTML =
        '<p class="muted">Nenhuma receita salva. Monte uma mistura e clique em “salvar receita”. Depois de misturar de verdade, registre a cor obtida para ver o erro real do modelo.</p>';
      return;
    }
    state.hist.forEach((r, idx) => {
      const div = document.createElement('div');
      div.className = 'hist';
      const sum = r.ing.reduce((a, i) => a + i.v, 0) || 1;
      const txt = r.ing
        .map((i) => {
          const p = paintByCode[i.code];
          return `${((i.v / sum) * 100).toFixed(0)}% ${esc(p ? p.name : i.code)}${i.s && i.s !== 1 ? ` (×${i.s})` : ''}`;
        })
        .join(' + ');
      const dr = r.obs ? deHex(r.target.hex, r.obs) : null;
      div.innerHTML =
        `<div class="pair"><span class="sw" style="background:${r.target.hex}" title="alvo"></span>` +
        `<span class="sw" style="background:${r.mix}" title="calculada"></span>` +
        (r.obs ? `<span class="sw" style="background:${r.obs}" title="obtida"></span>` : '') + '</div>' +
        `<div><b>${esc(r.name || 'Receita')}</b> <span class="muted">→ ${esc(r.target.label)}</span><br>` +
        `<span class="muted">${txt} · ΔE calculado ${deHex(r.target.hex, r.mix).toFixed(1)}` +
        (dr !== null ? ` · ΔE real ${dr.toFixed(1)} · erro do modelo ${deHex(r.mix, r.obs).toFixed(1)}` : '') + '</span>' +
        `<div class="row" style="margin-top:4px"><label class="muted">cor obtida <input type="color" value="${r.obs || r.mix}"></label>` +
        `<input type="text" placeholder="anotação" value="${esc(r.note || '')}" style="flex:1;min-width:120px"></div></div>` +
        '<div class="row"><button class="sm">carregar</button><button class="sm">excluir</button></div>';
      const colorIn = div.querySelector('input[type=color]');
      const textIn = div.querySelector('input[type=text]');
      const [btnLoad, btnDel] = div.querySelectorAll('button');
      colorIn.onchange = () => { r.obs = colorIn.value; save(); render(); };
      textIn.onchange = () => { r.note = textIn.value; save(); };
      btnLoad.onclick = () => {
        state.ing = clone(r.ing);
        state.target = r.target;
        ctx.ui.ingredients.setModel(r.model || 'km');
        save();
        ctx.update();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      btnDel.onclick = () => { state.hist.splice(idx, 1); save(); render(); };
      h.appendChild(div);
    });
  }

  /** Salva a mistura atual como receita (pede um nome). */
  function saveCurrent() {
    const mh = ctx.ui.result.currentMix(state.model);
    if (!mh) { alert('Adicione tintas à mistura primeiro.'); return; }
    const name = prompt('Nome da receita:', state.target.label);
    if (name === null) return;
    state.hist.unshift({
      name,
      target: state.target,
      ing: clone(state.ing),
      model: state.model,
      mix: mh,
      obs: '',
      note: '',
      date: new Date().toISOString(),
    });
    save();
    render();
  }

  /** Baixa as receitas como `receitas-misturador.json`. */
  function exportJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state.hist, null, 1)], { type: 'application/json' }));
    a.download = 'receitas-misturador.json';
    a.click();
  }

  /** Importa receitas de um arquivo JSON, somando-as às existentes. */
  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const a = JSON.parse(reader.result);
        if (Array.isArray(a)) {
          state.hist = a.concat(state.hist);
          save();
          render();
        }
      } catch (e) {
        alert('Arquivo inválido.');
      }
    };
    reader.readAsText(file);
  }

  /** Liga os botões da seção. */
  function bind() {
    $('btnSave').onclick = saveCurrent;
    $('btnExp').onclick = exportJson;
    $('btnImp').onclick = () => $('fileImp').click();
    $('fileImp').onchange = function () { importJson(this.files[0]); };
  }

  return { render, bind };
}
