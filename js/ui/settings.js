/**
 * @module ui/settings
 * Botão "Restaurar configurações": apaga o que o app guardou no navegador (receitas salvas, tintas "tenho",
 * preferências) e recarrega a página, que volta ao estado inicial.
 */

import { t } from '../i18n/index.js';
import { resetStorage } from '../state/store.js';
import { $ } from './dom.js';

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createSettings(ctx) {
  /** Pede confirmação, apaga o armazenamento e recarrega. */
  function restaurar() {
    if (!confirm(t('reset.confirm'))) return;
    resetStorage();
    // recarrega sem passar por `save()`: o estado atual não pode ser gravado de volta
    location.reload();
  }

  /** Liga o botão. */
  function bind() {
    $('btnReset').onclick = restaurar;
  }

  return { bind };
}
