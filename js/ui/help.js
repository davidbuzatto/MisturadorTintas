/**
 * @module ui/help
 * Guia "Como usar, passo a passo": bloco recolhível no topo da página (sempre fechado ao abrir o app) e o botão
 * "Fazer o exemplo para mim", que executa na tela os primeiros passos do exemplo (escolher a cor-alvo
 * Tamiya XF-18 e pedir as receitas sugeridas), para quem prefere ver a ferramenta em ação.
 */

import { targetOf } from '../data/catalogs.js';
import { t } from '../i18n/index.js';
import { $ } from './dom.js';

/** Cor-alvo do exemplo: Tamiya XF-18 (Medium Blue). */
export const EXEMPLO = { tab: 'tamiya', code: 'XF-18' };

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createHelp(ctx) {
  const { state, save, catalogs } = ctx;

  /** Tinta do exemplo no catálogo (ou `undefined` se um dia sair dos dados). */
  const tintaDoExemplo = () => catalogs[EXEMPLO.tab].find((p) => p.code === EXEMPLO.code);

  /**
   * Executa o exemplo: escolhe a cor-alvo, limpa a mistura e calcula as receitas sugeridas. O passo de
   * "usar" uma receita fica para o usuário, para ele ver onde clicar.
   */
  function runExample() {
    const paint = tintaDoExemplo();
    if (!paint) return;
    if (state.ing.length && !confirm(t('help.try.confirm'))) return;
    state.tab = EXEMPLO.tab;
    state.lines[EXEMPLO.tab] = paint.line;
    state.target = targetOf(EXEMPLO.tab, paint);
    state.ing = [];
    $('tgtSearch').value = EXEMPLO.code; // mostra no card 2 onde a cor foi achada
    $('onlyOwn').checked = false;
    save();
    ctx.ui.targets.refresh();
    ctx.update();
    ctx.ui.suggestions.run();
    $('resSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('exMsg').textContent = t('help.try.done');
  }

  /** Liga o botão. O guia começa sempre fechado (e nada sobre ele é guardado): quem quiser, abre. */
  function bind() {
    $('how').open = false;
    // sem a tinta do exemplo nos dados, o botão não faz sentido
    $('btnExample').hidden = !tintaDoExemplo();
    $('btnExample').onclick = runExample;
  }

  /** A mensagem de status fica no idioma em que foi escrita: limpa ao trocar de idioma. */
  function refresh() {
    $('exMsg').textContent = '';
  }

  return { bind, refresh, runExample };
}
