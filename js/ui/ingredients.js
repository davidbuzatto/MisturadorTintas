/**
 * @module ui/ingredients
 * Seção "1 · Mistura": lista de ingredientes (quantidade, força), botões de
 * adicionar/normalizar/limpar, volume total e seleção do modelo de mistura, além da escolha da
 * linha de tintas (marca e linha) usada como ingrediente.
 */

import { t } from '../i18n/index.js';
import { $, esc, setRotulo } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createIngredients(ctx) {
  const { state, save } = ctx;

  /** Soma das quantidades relativas dos ingredientes. */
  const sum = () => state.ing.reduce((a, i) => a + i.v, 0);

  /** Renderiza a lista de ingredientes. */
  function render() {
    const box = $('ings');
    box.innerHTML = '';
    const total = sum();
    if (!state.ing.length) {
      box.innerHTML = `<p class="muted">${esc(t('mix.empty'))}</p>`;
    }
    state.ing.forEach((ing, idx) => {
      const p = ctx.ingPaint(ing.code);
      if (!p) return;
      const eff = total > 0 ? (ing.v / total) * 100 : 0;
      const d = document.createElement('div');
      d.className = 'ing';
      d.innerHTML =
        `<div class="sw" style="background:${p.hex}"></div>` +
        `<div class="nm">${esc(p.name)}<small>${p.code}</small></div>` +
        `<input type="range" min="0" max="100" step="1" value="${ing.v}" aria-label="${esc(t('ing.qty.aria', { nome: p.name }))}">` +
        `<div><input type="number" min="0" max="100" step="1" value="${ing.v}" title="${esc(t('ing.qty.title'))}" aria-label="${esc(t('ing.qty.aria', { nome: p.name }))}">` +
        `<div class="ml">${eff.toFixed(1)}% · ${((eff / 100) * state.total).toFixed(2)} ml</div></div>` +
        `<div><input type="number" min="0.1" max="5" step="0.1" value="${ing.s || 1}" title="${esc(t('ing.strength.title'))}" aria-label="${esc(t('ing.strength.aria', { nome: p.name }))}" style="width:58px"><div class="ml">${esc(t('ing.strength'))}</div></div>` +
        `<button class="sm" title="${esc(t('ing.remove'))}" aria-label="${esc(t('ing.remove'))} ${esc(p.name)}">✕</button>`;
      const range = d.querySelector('input[type=range]');
      const nums = d.querySelectorAll('input[type=number]');
      // arrastar o controle: atualiza só resultado e rótulos (sem recriar a lista)
      range.addEventListener('input', () => {
        ing.v = +range.value;
        save();
        ctx.ui.result.render();
        updateAmounts();
      });
      range.addEventListener('change', render);
      // quantidade numérica
      nums[0].addEventListener('change', () => {
        ing.v = Math.max(0, Math.min(100, +nums[0].value || 0));
        save();
        ctx.update();
      });
      // força de tingimento
      nums[1].addEventListener('change', () => {
        ing.s = Math.max(0.1, +nums[1].value || 1);
        save();
        ctx.update();
      });
      d.querySelector('button').addEventListener('click', () => {
        state.ing.splice(idx, 1);
        save();
        ctx.update();
      });
      box.appendChild(d);
    });
    $('sumInfo').textContent = state.ing.length
      ? t('mix.sum', { n: total.toFixed(0) }) + (Math.abs(total - 100) > 0.5 ? t('mix.sum.hint') : '')
      : '';
  }

  /** Atualiza porcentagens/ml e a soma sem recriar os controles. */
  function updateAmounts() {
    const total = sum();
    const rows = document.querySelectorAll('#ings .ing');
    state.ing.forEach((ing, i) => {
      const r = rows[i];
      if (!r) return;
      const eff = total > 0 ? (ing.v / total) * 100 : 0;
      r.querySelector('.ml').textContent = `${eff.toFixed(1)}% · ${((eff / 100) * state.total).toFixed(2)} ml`;
      r.querySelector('input[type=number]').value = ing.v;
    });
    $('sumInfo').textContent = t('mix.sum', { n: total.toFixed(0) });
  }

  /**
   * Adiciona uma tinta à mistura (ou soma 10 à quantidade, se já existir).
   * @param {string} code código da tinta.
   */
  function addPaint(code) {
    const ex = state.ing.find((i) => i.code === code);
    if (ex) ex.v = Math.min(100, ex.v + 10);
    else state.ing.push({ code, v: state.ing.length ? 10 : 100, s: 1 });
    save();
    ctx.update();
  }

  /** Preenche o seletor de linha de tintas, agrupado por marca. */
  function fillSets() {
    const sel = $('ingSet');
    sel.innerHTML = '';
    let grupo = null;
    let marca = '';
    ctx.sets.list.forEach((s) => {
      if (s.marca !== marca) {
        marca = s.marca;
        grupo = document.createElement('optgroup');
        grupo.label = marca;
        sel.appendChild(grupo);
      }
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = setRotulo(s);
      grupo.appendChild(o);
    });
  }

  /**
   * Escolhe a linha de tintas dos ingredientes (sem tocar na mistura): prepara os espectros e
   * atualiza o seletor e o texto de apoio.
   * @param {string} id id da linha (ver `data/sets.js`).
   */
  function setSet(id) {
    const s = ctx.sets.prepare(id);
    state.ingSet = s.id;
    $('ingSet').value = s.id;
    $('ingSetInfo').textContent =
      t('mix.set.info', { n: s.paints.length, quimica: t(`chem.${s.quimica}`) }) +
      (s.excluidas ? t('mix.set.hidden', { n: s.excluidas }) : '');
  }

  /**
   * Define o modelo de mistura e sincroniza o seletor.
   * @param {string} model identificador do modelo.
   */
  function setModel(model) {
    state.model = model;
    $('model').value = model;
  }

  /** Liga os eventos dos controles estáticos da seção. */
  function bind() {
    fillSets();
    setSet(state.ingSet);
    $('ingSet').onchange = function () {
      const novo = this.value;
      // as tintas de uma linha não existem na outra: trocar limpa a mistura
      if (state.ing.length && !confirm(t('mix.set.confirm'))) {
        this.value = state.ingSet;
        return;
      }
      setSet(novo);
      state.ing = [];
      save();
      ctx.update();
    };
    $('btnAdd').onclick = () => ctx.ui.picker.open();
    $('btnNorm').onclick = () => {
      const s = sum();
      if (s > 0) state.ing.forEach((i) => { i.v = Math.round((i.v / s) * 1000) / 10; });
      save();
      ctx.update();
    };
    $('btnClear').onclick = () => {
      state.ing = [];
      save();
      ctx.update();
    };
    $('total').value = state.total;
    $('total').onchange = function () {
      state.total = Math.max(0.5, +this.value || 10);
      save();
      render();
    };
    $('model').value = state.model;
    $('model').onchange = function () {
      state.model = this.value;
      save();
      ctx.ui.result.render();
    };
  }

  /** Redesenha tudo com os textos do idioma atual. */
  function refresh() {
    fillSets();
    setSet(state.ingSet);
    render();
  }

  return { render, addPaint, setModel, setSet, bind, refresh };
}
