/**
 * @module ui/picker
 * Janela modal para escolher uma tinta da linha de ingredientes (marca e linha escolhidas na seção 1).
 * Clique adiciona à mistura; botão direito (ou toque longo) marca "tenho" (por linha).
 */

import { $, esc } from './dom.js';

/** Duração do toque longo para marcar "tenho", em ms. */
const LONG_PRESS_MS = 600;

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createPicker(ctx) {
  const { save } = ctx;
  const modal = $('modal');

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
    ctx.ingSet().paints.forEach((p) => {
      if (q && (p.code + ' ' + p.name).toLowerCase().indexOf(q) < 0) return;
      if (onlyOwn && !tenho[p.code]) return;
      const c = document.createElement('div');
      c.className = 'cell' + (tenho[p.code] ? ' own' : '');
      c.innerHTML =
        `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)}<b>${p.code}</b></span>`;
      c.onclick = () => {
        ctx.ui.ingredients.addPaint(p.code);
        close();
      };
      c.oncontextmenu = (e) => {
        e.preventDefault();
        toggleOwn(p.code);
      };
      let timer;
      c.ontouchstart = () => { timer = setTimeout(() => toggleOwn(p.code), LONG_PRESS_MS); };
      c.ontouchend = c.ontouchmove = () => clearTimeout(timer);
      g.appendChild(c);
    });
  }

  /** Abre a janela. */
  function open() {
    const s = ctx.ingSet();
    $('mTitle').textContent = `Escolha uma tinta ${s.marca} ${s.rotulo}`;
    modal.classList.add('on');
    render();
    $('pSearch').focus();
  }

  /** Fecha a janela. */
  function close() {
    modal.classList.remove('on');
  }

  /** Liga os eventos da janela. */
  function bind() {
    $('mClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    $('pSearch').oninput = render;
    $('pOwn').onchange = render;
  }

  return { open, close, bind };
}
