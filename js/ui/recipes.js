/**
 * @module ui/recipes
 * Seção "4 · Receitas salvas": salvar, carregar, excluir, registrar a cor
 * realmente obtida na bancada e exportar/importar JSON.
 */

import { DEFAULT_SET } from '../data/sets.js';
import { criarBackup, lerBackup, mesclarBackup } from '../state/backup.js';
import { t } from '../i18n/index.js';
import { $, deHex, esc, setNome } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createRecipes(ctx) {
  const { state, save } = ctx;

  /** Cópia profunda de dados simples (JSON). */
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /** Renderiza a lista de receitas. */
  function render() {
    const h = $('hist');
    h.innerHTML = '';
    if (!state.hist.length) {
      h.innerHTML = `<p class="muted">${esc(t('rec.empty'))}</p>`;
      return;
    }
    state.hist.forEach((r, idx) => {
      const div = document.createElement('div');
      div.className = 'hist';
      const sum = r.ing.reduce((a, i) => a + i.v, 0) || 1;
      const txt = r.ing
        .map((i) => {
          const p = ctx.sets.paint(r.set || DEFAULT_SET, i.code);
          return `${((i.v / sum) * 100).toFixed(0)}% ${esc(p ? p.name : i.code)}${i.s && i.s !== 1 ? ` (×${i.s})` : ''}`;
        })
        .join(' + ');
      const dr = r.obs ? deHex(r.target.hex, r.obs) : null;
      div.innerHTML =
        `<div class="pair"><span class="sw" style="background:${r.target.hex}" title="${esc(t('rec.target'))}"></span>` +
        `<span class="sw" style="background:${r.mix}" title="${esc(t('rec.calc'))}"></span>` +
        (r.obs ? `<span class="sw" style="background:${r.obs}" title="${esc(t('rec.obtained'))}"></span>` : '') + '</div>' +
        `<div><b>${esc(r.name || t('rec.default'))}</b> <span class="muted">→ ${esc(r.target.label)} · ${esc(setNome(ctx.sets.get(r.set || DEFAULT_SET)))}</span><br>` +
        `<span class="muted">${txt} · ${esc(t('rec.de.calc', { x: deHex(r.target.hex, r.mix).toFixed(1) }))}` +
        (dr !== null ? ` · ${esc(t('rec.de.real', { x: dr.toFixed(1) }))} · ${esc(t('rec.err', { x: deHex(r.mix, r.obs).toFixed(1) }))}` : '') + '</span>' +
        `<div class="row" style="margin-top:4px"><label class="muted">${esc(t('rec.got'))} <input type="color" value="${r.obs || r.mix}"></label>` +
        `<input type="text" placeholder="${esc(t('rec.note'))}" aria-label="${esc(t('rec.note'))}" value="${esc(r.note || '')}" style="flex:1;min-width:120px"></div></div>` +
        `<div class="row"><button class="sm">${esc(t('rec.load'))}</button><button class="sm">${esc(t('rec.delete'))}</button></div>`;
      const colorIn = div.querySelector('input[type=color]');
      const textIn = div.querySelector('input[type=text]');
      const [btnLoad, btnDel] = div.querySelectorAll('button');
      colorIn.onchange = () => { r.obs = colorIn.value; save(); render(); };
      textIn.onchange = () => { r.note = textIn.value; save(); };
      btnLoad.onclick = () => {
        ctx.ui.ingredients.setSet(r.set || DEFAULT_SET);
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
    if (!mh) { alert(t('rec.needMix')); return; }
    const name = prompt(t('rec.prompt'), state.target.label);
    if (name === null) return;
    state.hist.unshift({
      name,
      set: state.ingSet,
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

  /** Baixa o backup (receitas + tintas "tenho") como `misturador-tintas-backup.json`. */
  function exportBackup() {
    const b = criarBackup(state);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }));
    a.download = 'misturador-tintas-backup.json';
    a.click();
    $('bkMsg').textContent = t('bk.exported', { receitas: b.receitas.length, tintas: Object.values(b.tenho).reduce((n, m) => n + Object.keys(m).length, 0) });
  }

  /**
   * Importa um backup (ou uma lista antiga de receitas), somando ao que já existe, e mostra o resumo.
   * @param {File} [file] arquivo escolhido.
   */
  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let dados;
      try {
        dados = lerBackup(reader.result);
      } catch (e) {
        alert(t('rec.badFile'));
        return;
      }
      const existe = (linha, codigo) => ctx.sets.byId.has(linha) && ctx.sets.byId.get(linha).porCodigo.has(codigo);
      const r = mesclarBackup(state, dados, existe);
      save();
      render();
      $('bkMsg').textContent =
        r.receitasNovas || r.tintasNovas
          ? t('bk.done', { receitas: r.receitasNovas, tintas: r.tintasNovas, linhas: r.linhas })
          : t('bk.nothing');
      if (dados.ignoradas || r.tintasIgnoradas) $('bkMsg').textContent += ' ' + t('bk.ignored', { n: dados.ignoradas + r.tintasIgnoradas });
    };
    reader.readAsText(file);
  }

  /** Liga os botões da seção. */
  function bind() {
    $('btnSave').onclick = saveCurrent;
    $('btnExp').onclick = exportBackup;
    $('btnImp').onclick = () => $('fileImp').click();
    $('fileImp').onchange = function () {
      importBackup(this.files[0]);
      this.value = ''; // permite importar o mesmo arquivo de novo
    };
  }

  /** Redesenha com os textos do idioma atual (a mensagem do backup é limpa). */
  function refresh() {
    $('bkMsg').textContent = '';
    render();
  }

  return { render, bind, refresh };
}
