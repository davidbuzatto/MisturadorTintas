/**
 * @module main
 * Ponto de entrada: carrega os catálogos, cria o estado e liga os módulos de interface.
 *
 * Fluxo de dados: o estado (`ctx.state`) é a única fonte da verdade; cada módulo
 * de interface lê/altera o estado, chama `ctx.save()` para persistir e
 * `ctx.update()` (ou o `render()` do módulo) para redesenhar.
 */

import { alvoPadrao, loadCatalogs, normalizeTab } from './data/catalogs.js';
import { buildSets } from './data/sets.js';
import { IDIOMAS, applyStatic, idiomaDoNavegador, setLang, t } from './i18n/index.js';
import { createStore } from './state/store.js';
import { createAbout } from './ui/about.js';
import { createCatalogo } from './ui/catalogo.js';
import { $ } from './ui/dom.js';
import { createEquivalents } from './ui/equivalents.js';
import { createHelp } from './ui/help.js';
import { createSettings } from './ui/settings.js';
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
 * @property {ReturnType<typeof import('./data/sets.js').buildSets>} sets  linhas de tintas que podem ser ingredientes.
 * @property {() => import('./data/sets.js').IngredientSet} ingSet  linha de ingredientes da receita atual.
 * @property {(code: string) => import('./data/catalogs.js').CatalogPaint|undefined} ingPaint  tinta (com `fit`) da linha atual.
 * @property {() => Object<string, boolean>} owned  tintas "tenho" da linha atual.
 * @property {() => void} update  redesenha lista de ingredientes e resultado.
 * @property {() => void} refreshLanguage  aplica o idioma atual a todos os textos (estáticos e dinâmicos).
 * @property {Object} ui  API dos módulos de interface, preenchida na inicialização.
 */

/** Inicializa a aplicação. */
async function init() {
  // idioma primeiro: os textos fixos da página aparecem enquanto os catálogos carregam
  const { state, save } = createStore();
  state.lang = setLang(state.lang || idiomaDoNavegador());
  applyStatic();
  const catalogs = await loadCatalogs();
  const sets = buildSets(catalogs);
  // primeira execução (nada salvo): sem mistura e com a Tamiya X-2 White como cor-alvo
  if (!state.target) state.target = alvoPadrao(catalogs);
  // restaura abas salvas por versões anteriores (inclusive na origem do alvo)
  state.tab = normalizeTab(state.tab);
  if (state.target.ref) state.target.ref.tab = normalizeTab(state.target.ref.tab);

  // linha de ingredientes: valida o id salvo, prepara os espectros e descarta ingredientes que não existam nela
  state.ingSet = sets.prepare(state.ingSet).id;
  state.ing = state.ing.filter((i) => sets.paint(state.ingSet, i.code));

  /** @type {AppContext} */
  const ctx = {
    state,
    save,
    catalogs,
    sets,
    ingSet: () => sets.get(state.ingSet),
    ingPaint: (code) => sets.paint(state.ingSet, code),
    owned: () => (state.own[state.ingSet] ||= {}),
    ui: {},
    update: () => {},
    refreshLanguage: () => {},
  };
  ctx.ui.ingredients = createIngredients(ctx);
  ctx.ui.result = createResult(ctx);
  ctx.ui.targets = createTargets(ctx);
  ctx.ui.picker = createPicker(ctx);
  ctx.ui.suggestions = createSuggestions(ctx);
  ctx.ui.recipes = createRecipes(ctx);
  ctx.ui.equivalents = createEquivalents(ctx);
  ctx.ui.about = createAbout(ctx);
  ctx.ui.help = createHelp(ctx);
  ctx.ui.settings = createSettings(ctx);
  ctx.ui.catalogo = createCatalogo(ctx);
  ctx.update = () => {
    ctx.ui.ingredients.render();
    ctx.ui.result.render();
  };
  ctx.refreshLanguage = () => {
    setLang(state.lang);
    applyStatic();
    Object.values(ctx.ui).forEach((m) => m.refresh && m.refresh());
    ctx.update();
  };

  // seletor de idioma
  const sel = $('lang');
  IDIOMAS.forEach(([codigo, nome]) => sel.appendChild(new Option(nome, codigo)));
  sel.value = state.lang;
  sel.onchange = () => {
    state.lang = sel.value;
    save();
    ctx.refreshLanguage();
  };

  Object.values(ctx.ui).forEach((m) => m.bind && m.bind());
  ctx.update();
  ctx.ui.recipes.render();
}

init().catch((err) => {
  console.error(err);
  const box = $('erro');
  box.hidden = false;
  box.textContent = t('app.error', { erro: err.message });
});
