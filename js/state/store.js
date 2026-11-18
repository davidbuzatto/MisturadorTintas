/**
 * @module state/store
 * Estado da aplicação com persistência no `localStorage`.
 */

import { DEFAULT_SET } from '../data/sets.js';

/** Chave do `localStorage` (mantida para preservar receitas já salvas). */
export const STORAGE_KEY = 'misturador-tintas-v1';

/**
 * @typedef {Object} Ingredient
 * @property {string} code  código da tinta (na linha de ingredientes da receita).
 * @property {number} v     quantidade relativa (0..100).
 * @property {number} [s]   força de tingimento (padrão 1).
 */

/**
 * @typedef {Object} Recipe
 * @property {string} name
 * @property {string} [set]  linha de tintas dos ingredientes (ausente nas receitas antigas = Acrilex).
 * @property {{hex:string,label:string}} target
 * @property {Ingredient[]} ing
 * @property {string} model   modelo de mistura usado.
 * @property {string} mix     hex calculado.
 * @property {string} obs     hex obtido na bancada (vazio se não informado).
 * @property {string} note    anotação livre.
 * @property {string} date    data ISO.
 */

/**
 * @typedef {Object} AppState
 * @property {string} ingSet           linha de tintas dos ingredientes (id em `data/sets.js`).
 * @property {Ingredient[]} ing        ingredientes da mistura atual.
 * @property {{hex:string,label:string,ref?:{tab:string,code:string}}|null} target  cor-alvo atual (`null` na primeira execução:
 *                                     o `main.js` define o alvo padrão quando os catálogos estão carregados).
 * @property {string} model            modelo de mistura selecionado.
 * @property {number} total            volume total, em ml.
 * @property {Object<string,Object<string,boolean>>} own  tintas marcadas como "tenho", por linha de ingredientes.
 * @property {Recipe[]} hist           receitas salvas.
 * @property {string} tab              aba de alvo selecionada.
 * @property {'target'|'mix'} eqFrom   cor de partida das equivalências: alvo ou mistura calculada.
 * @property {Object<string,string>} lines  linha escolhida por aba ("*" = todas), nos catálogos com linhas.
 * @property {string} free             última cor livre escolhida.
 * @property {boolean} showFinish      mostra o acabamento nas amostras da seção "2 · Cor-alvo".
 * @property {string} lang             idioma da interface ("pt-BR" ou "en"; vazio = o do navegador).
 */

/** @returns {AppState} estado padrão. */
function defaultState() {
  return {
    ingSet: DEFAULT_SET,
    ing: [],
    target: null,
    model: 'km',
    total: 10,
    own: {},
    hist: [],
    tab: 'tamiya',
    lines: {},
    eqFrom: 'target',
    free: '#808080',
    showFinish: false,
    lang: '',
  };
}

/**
 * Apaga tudo o que o app guardou no navegador (receitas, "tenho", preferências). Na próxima abertura o app volta
 * ao estado inicial. Falhas de armazenamento (modo privado, bloqueio) são ignoradas.
 * @param {Pick<Storage, 'removeItem'>} [armazenamento] padrão: `localStorage`.
 * @returns {boolean} `true` se o item foi removido sem erro.
 */
export function resetStorage(armazenamento = globalThis.localStorage) {
  try {
    armazenamento.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Cria o estado, restaurando o que estiver salvo no `localStorage`.
 * Falhas de armazenamento (modo privado, cota) são ignoradas.
 * @returns {{state: AppState, save: () => void}}
 */
export function createStore() {
  const state = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) Object.assign(state, saved);
  } catch (e) {
    /* sem armazenamento: segue com o padrão */
  }
  // "tenho" antes era um mapa código → booleano (só da Acrilex); agora é por linha de ingredientes
  if (Object.values(state.own).some((v) => typeof v === 'boolean')) state.own = { [DEFAULT_SET]: state.own };

  /** Grava o estado atual. */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* sem armazenamento: ignora */
    }
  }
  return { state, save };
}
