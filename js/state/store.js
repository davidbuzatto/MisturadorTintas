/**
 * @module state/store
 * Estado da aplicação com persistência no `localStorage`.
 */

/** Chave do `localStorage` (mantida para preservar receitas já salvas). */
export const STORAGE_KEY = 'misturador-tintas-v1';

/** Mistura inicial usada quando não há ingredientes salvos. */
export const DEFAULT_INGREDIENTS = [
  { code: '530', v: 80, s: 1 },
  { code: '559', v: 20, s: 1 },
];

/**
 * @typedef {Object} Ingredient
 * @property {string} code  código da tinta (Acrilex).
 * @property {number} v     quantidade relativa (0..100).
 * @property {number} [s]   força de tingimento (padrão 1).
 */

/**
 * @typedef {Object} Recipe
 * @property {string} name
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
 * @property {Ingredient[]} ing        ingredientes da mistura atual.
 * @property {{hex:string,label:string}} target  cor-alvo atual.
 * @property {string} model            modelo de mistura selecionado.
 * @property {number} total            volume total, em ml.
 * @property {Object<string,boolean>} own  tintas marcadas como "tenho".
 * @property {Recipe[]} hist           receitas salvas.
 * @property {string} tab              aba de alvo selecionada.
 * @property {string} free             última cor livre escolhida.
 */

/** @returns {AppState} estado padrão. */
function defaultState() {
  return {
    ing: [],
    target: { hex: '#4f5457', label: 'Tamiya X-10 Gun Metal' },
    model: 'km',
    total: 10,
    own: {},
    hist: [],
    tab: 'tamiya',
    free: '#808080',
  };
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
  if (!state.ing.length) state.ing = DEFAULT_INGREDIENTS.map((i) => ({ ...i }));

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
