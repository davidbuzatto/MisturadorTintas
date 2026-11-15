/**
 * @module main
 * Ponto de entrada: carrega os catálogos, cria o estado e liga os módulos de interface.
 *
 * Fluxo de dados: o estado (`ctx.state`) é a única fonte da verdade; cada módulo
 * de interface lê/altera o estado, chama `ctx.save()` para persistir e
 * `ctx.update()` (ou o `render()` do módulo) para redesenhar.
 */

import { INGREDIENT_CATALOG, indexIngredients, loadCatalogs, normalizeTab } from './data/catalogs.js';
import { createStore } from './state/store.js';
import { $ } from './ui/dom.js';
import { createEquivalents } from './ui/equivalents.js';
import { createIngredients } from './ui/ingredients.js';
import { createPicker } from './ui/picker.js';
import { createRecipes } from './ui/recipes.js';
import { createResult } from './ui/result.js';
import { createSuggestions } from './ui/suggestions.js';
import { createTargets } from './ui/targets.js';

/**
 * Contexto compartilhado entre os módulos de interface.
 * @typedef {Object} AppContext
 * @property {import('./state/store.js').AppState} state  estado da aplicação.
 * @property {() => void} save  persiste o estado no `localStorage`.
 * @property {Object<string, import('./data/catalogs.js').CatalogPaint[]>} catalogs  catálogos por chave.
 * @property {Object<string, import('./data/catalogs.js').CatalogPaint>} paintByCode  ingredientes (com `fit`) por código.
 * @property {() => void} update  redesenha lista de ingredientes e resultado.
 * @property {Object} ui  API dos módulos de interface, preenchida na inicialização.
 */

/** Inicializa a aplicação. */
async function init() {
  const catalogs = await loadCatalogs();
  const paintByCode = indexIngredients(catalogs[INGREDIENT_CATALOG]);
  const { state, save } = createStore();
  // restaura abas salvas por versões anteriores (inclusive na origem do alvo)
  state.tab = normalizeTab(state.tab);
  if (state.target.ref) state.target.ref.tab = normalizeTab(state.target.ref.tab);

  /** @type {AppContext} */
  const ctx = { state, save, catalogs, paintByCode, ui: {}, update: () => {} };
  ctx.ui.ingredients = createIngredients(ctx);
  ctx.ui.result = createResult(ctx);
  ctx.ui.targets = createTargets(ctx);
  ctx.ui.picker = createPicker(ctx);
  ctx.ui.suggestions = createSuggestions(ctx);
  ctx.ui.recipes = createRecipes(ctx);
  ctx.ui.equivalents = createEquivalents(ctx);
  ctx.update = () => {
    ctx.ui.ingredients.render();
    ctx.ui.result.render();
  };

  Object.values(ctx.ui).forEach((m) => m.bind && m.bind());
  ctx.update();
  ctx.ui.recipes.render();
}

init().catch((err) => {
  console.error(err);
  const box = $('erro');
  box.hidden = false;
  box.textContent =
    'Não foi possível iniciar o aplicativo: ' + err.message +
    '. Se você abriu o arquivo direto do disco (file://), sirva a pasta por HTTP (veja o README).';
});
