/**
 * @module ui/picker
 * Janela modal para escolher uma tinta da linha de ingredientes (marca e linha escolhidas na seção 1).
 * Clique adiciona à mistura; botão direito (ou toque longo) marca "tenho" (por linha).
 */

import { t } from '../i18n/index.js';
import { contarMarcadas, marcarEmLote } from '../state/tenho.js';
import { $, ativavel, esc, setNome } from './dom.js';

/** Duração do toque longo para marcar "tenho", em ms. */
const LONG_PRESS_MS = 600;
/** Acima desta quantidade de tintas visíveis, desmarcar em lote pede confirmação. */
const LIMITE_CONFIRMAR = 10;

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createPicker(ctx) {
  const { save } = ctx;
  const modal = $('modal');
  let anterior = null;
  /** Tintas exibidas na grade neste momento (depois da busca e do filtro). */
  let visiveis = [];

  /** Alterna a marca "tenho" de uma tinta e redesenha a grade. */
  function toggleOwn(code) {
    const tenho = ctx.owned();
    tenho[code] = !tenho[code];
    save();
    render();
  }

  /** Renderiza a grade de tintas conforme busca e filtro "só as que tenho". */
  function render() {
    const g = $('pGrid');
    g.innerHTML = '';
    const q = $('pSearch').value.trim().toLowerCase();
    const onlyOwn = $('pOwn').checked;
    const tenho = ctx.owned();
    visiveis = [];
    ctx.ingSet().paints.forEach((p) => {
      if (q && (p.code + ' ' + p.name).toLowerCase().indexOf(q) < 0) return;
      if (onlyOwn && !tenho[p.code]) return;
      visiveis.push(p);
      const c = document.createElement('div');
      c.className = 'cell' + (tenho[p.code] ? ' own' : '');
      c.innerHTML =
        `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)}<b>${p.code}</b></span>`;
      ativavel(
        c,
        () => {
          ctx.ui.ingredients.addPaint(p.code);
          close();
        },
        () => toggleOwn(p.code)
      );
      c.oncontextmenu = (e) => {
        e.preventDefault();
        toggleOwn(p.code);
      };
      let timer;
      c.ontouchstart = () => { timer = setTimeout(() => toggleOwn(p.code), LONG_PRESS_MS); };
      c.ontouchend = c.ontouchmove = () => clearTimeout(timer);
      g.appendChild(c);
    });
    renderLote();
  }

  /** Atualiza os botões de marcação em lote e o contador de tintas marcadas. */
  function renderLote() {
    const total = ctx.ingSet().paints;
    const n = visiveis.length;
    $('pMarkAll').textContent = t('picker.markAll', { n });
    $('pUnmarkAll').textContent = t('picker.unmarkAll', { n });
    $('pMarkAll').disabled = $('pUnmarkAll').disabled = n === 0;
    $('pOwnCount').textContent = t('picker.ownCount', { n: contarMarcadas(ctx.owned(), total), total: total.length });
  }

  /**
   * Marca ou desmarca todas as tintas visíveis (as que passam pela busca e pelo filtro).
   * @param {boolean} marcar
   */
  function marcarVisiveis(marcar) {
    if (!visiveis.length) return;
    if (!marcar && visiveis.length > LIMITE_CONFIRMAR && !confirm(t('picker.unmarkConfirm', { n: visiveis.length }))) return;
    marcarEmLote(ctx.owned(), visiveis.map((p) => p.code), marcar);
    save();
    render();
  }

  /** Abre a janela. */
  function open() {
    const s = ctx.ingSet();
    $('mTitle').textContent = t('picker.title', { linha: setNome(s) });
    anterior = document.activeElement;
    modal.classList.add('on');
    render();
    $('pSearch').focus();
  }

  /** Fecha a janela. */
  function close() {
    modal.classList.remove('on');
    if (anterior && anterior.focus) anterior.focus(); // devolve o foco a quem abriu a janela
  }

  /** Liga os eventos da janela. */
  function bind() {
    $('mClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    $('pSearch').oninput = render;
    $('pOwn').onchange = render;
    $('pMarkAll').onclick = () => marcarVisiveis(true);
    $('pUnmarkAll').onclick = () => marcarVisiveis(false);
    // Esc fecha a janela
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('on')) close();
    });
  }

  /** Redesenha com os textos do idioma atual (a janela aberta continua aberta). */
  function refresh() {
    if (!modal.classList.contains('on')) return;
    const s = ctx.ingSet();
    $('mTitle').textContent = t('picker.title', { linha: setNome(s) });
    render();
  }

  return { open, close, bind, refresh };
}
