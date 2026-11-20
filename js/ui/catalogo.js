/**
 * @module ui/catalogo
 * Janela "Catálogo completo": consulta de todas as tintas de cada marca, inclusive as que não servem
 * como ingredientes nem como alvo (metálicas, transparentes, fluorescentes…), para o usuário ter uma
 * noção da cor. É **só de consulta**: não altera o estado do aplicativo (nada é salvo nem escolhido).
 *
 * Filtros: marca (aba), linha, acabamento e busca. Ao clicar numa tinta, um painel mostra os detalhes e as
 * tintas parecidas em outras marcas (com o selo quando o fabricante declara a equivalência).
 */

import { TARGET_TABS, catalogLines, catalogName, displayName } from '../data/catalogs.js';
import { ACABAMENTOS, acabamentoDe, contarPorTipo, filtrarCatalogo } from '../data/acabamento.js';
import { buildLinks } from '../data/equivalences.js';
import { deToPaint, nearest } from '../color/nearest.js';
import { lineName, t } from '../i18n/index.js';
import { $, ativavel, deText, dicaAprox, eAprox, esc } from './dom.js';

/** Marcas consultáveis (todas as abas de alvo, exceto a de cor livre). */
const ABAS = TARGET_TABS.filter((k) => k !== 'free');
/** ΔE00 máximo para listar uma parecida (acima disso a tinta não ajuda a ter noção da cor). */
const DE_MAXIMO = 8;
/** Quantas parecidas mostrar por marca no painel de detalhes. */
const POR_MARCA = 2;
/** Acabamentos cuja comparação só faz sentido entre tintas do mesmo tipo (um alumínio com outro alumínio). */
const COMPARA_TIPO = new Set(['metallic', 'clear', 'special']);
/** Valor de filtro que significa "todos". */
const TODOS = '*';

/** Classe de cor para um ΔE00: abaixo de 2 é praticamente igual, até 5 é parecida. */
const classeDe = (de) => (de < 2 ? 'ok' : de < 5 ? 'mid' : 'bad');

/**
 * @param {import('../main.js').AppContext} ctx contexto da aplicação.
 */
export function createCatalogo(ctx) {
  const { catalogs } = ctx;
  const modal = $('catModal');
  let anterior = null;
  /** Ligações declaradas pelos fabricantes (montadas na primeira abertura). */
  let links = null;

  // estado local da janela (não é persistido)
  let aba = ABAS[0];
  let linha = TODOS;
  let tipo = TODOS;
  /** @type {{aba: string, paint: object}|null} */
  let escolhida = null;

  /** Rótulo do acabamento normalizado. */
  const rotuloTipo = (k) => (k ? t(`fin.${k}`) : t('fin.unknown'));

  /** Linhas da marca atual (vazio se a marca não se divide em linhas). */
  const linhasDaAba = () => catalogLines(catalogs[aba]);

  /** Tintas da marca e da linha atuais, antes dos filtros de acabamento e de busca. */
  const baseAtual = () => filtrarCatalogo(catalogs[aba], aba, { linha });

  /** Cria um botão de filtro (chip) com `aria-pressed`. */
  function chip(texto, ativo, onClick) {
    const b = document.createElement('button');
    b.textContent = texto;
    b.setAttribute('aria-pressed', ativo);
    b.onclick = onClick;
    return b;
  }

  /** Abas de marca. */
  function renderAbas() {
    const box = $('catTabs');
    box.innerHTML = '';
    ABAS.forEach((k) =>
      box.appendChild(
        chip(catalogName(k), aba === k, () => {
          aba = k;
          linha = TODOS;
          tipo = TODOS;
          renderTudo();
        })
      )
    );
  }

  /** Chips de linha (ocultos nas marcas sem linhas). */
  function renderLinhas() {
    const box = $('catLines');
    box.innerHTML = '';
    const linhas = linhasDaAba();
    box.style.display = linhas.length ? '' : 'none';
    if (!linhas.length) return;
    [[TODOS, t('common.all')], ...linhas.map((l) => [l, lineName(l)])].forEach(([valor, rotulo]) =>
      box.appendChild(
        chip(rotulo, linha === valor, () => {
          linha = valor;
          tipo = TODOS;
          renderFiltros();
          renderGrade();
        })
      )
    );
  }

  /** Chips de acabamento (só os que existem na marca e linha atuais, com a contagem). */
  function renderAcabamentos() {
    const box = $('catFinish');
    box.innerHTML = '';
    const contagem = contarPorTipo(baseAtual(), aba);
    if (tipo !== TODOS && !contagem[tipo]) tipo = TODOS;
    box.appendChild(chip(t('common.all'), tipo === TODOS, () => { tipo = TODOS; renderAcabamentos(); renderGrade(); }));
    ACABAMENTOS.filter((k) => contagem[k]).forEach((k) =>
      box.appendChild(chip(`${rotuloTipo(k)} (${contagem[k]})`, tipo === k, () => { tipo = k; renderAcabamentos(); renderGrade(); }))
    );
  }

  /** Linhas e acabamentos. */
  function renderFiltros() {
    renderLinhas();
    renderAcabamentos();
  }

  /** Grade de amostras conforme os filtros. */
  function renderGrade() {
    const g = $('catGrid');
    g.innerHTML = '';
    const q = $('catSearch').value;
    const lista = filtrarCatalogo(catalogs[aba], aba, { linha, tipo, q });
    $('catCount').textContent = t('cat.count', { n: lista.length, total: catalogs[aba].length });
    if (!lista.length) {
      g.innerHTML = `<p class="muted">${esc(t('cat.empty'))}</p>`;
      return;
    }
    lista.forEach((p) => g.appendChild(celula(p)));
  }

  /** Célula da grade para uma tinta. */
  function celula(p) {
    const { tipo: k } = acabamentoDe(aba, p);
    const sel = !!escolhida && escolhida.paint === p;
    const c = document.createElement('div');
    c.className = 'cell' + (sel ? ' sel' : '');
    c.setAttribute('aria-pressed', sel);
    const sub = p.code + (linha === TODOS && p.line ? ` · ${lineName(p.line)}` : '') + (p.series ? ` · ${p.series}` : '');
    c.title = `${p.code} ${displayName(p)} ${p.hex} · ${rotuloTipo(k)}${eAprox(p) ? ' · ' + dicaAprox(p) : ''}`;
    c.innerHTML =
      `<span class="sw${k === 'metallic' ? ' met' : ''}${eAprox(p) ? ' deg' : ''}" style="background-color:${p.hex}"></span>` +
      `<span>${esc(displayName(p))}<b>${esc(sub)}</b>${k ? `<i class="tag">${esc(rotuloTipo(k))}</i>` : ''}${eAprox(p) ? `<i class="tag">${esc(t('approx.tag'))}</i>` : ''}</span>`;
    ativavel(c, () => mostrar(aba, p));
    return c;
  }

  /**
   * Tintas parecidas em outra marca: do mesmo tipo de acabamento quando o tipo é metálico, transparente
   * ou de efeito (compara-se um alumínio com outro alumínio); senão, qualquer uma.
   */
  function parecidas(outraAba, hex) {
    const { tipo: meu } = acabamentoDe(escolhida.aba, escolhida.paint);
    const todas = catalogs[outraAba];
    const mesmas = COMPARA_TIPO.has(meu) ? todas.filter((p) => acabamentoDe(outraAba, p).tipo === meu) : [];
    return nearest(mesmas.length ? mesmas : todas, hex, POR_MARCA, (p) => p === escolhida.paint)
      .filter((x) => x.de <= DE_MAXIMO)
      .map((x) => ({ ...x, fontes: [] }));
  }

  /** Painel de detalhes da tinta escolhida. */
  function renderDetalhe() {
    const box = $('catDet');
    if (!escolhida) {
      box.innerHTML = `<p class="muted" style="margin:0">${esc(t('cat.det.hint'))}</p>`;
      return;
    }
    const { aba: a, paint: p } = escolhida;
    const { tipo: k, inferido } = acabamentoDe(a, p);
    const origem = catalogName(a) + (p.line ? ` · ${lineName(p.line)}${p.series ? ' / ' + p.series : ''}` : '');
    const acab = rotuloTipo(k) + (k && inferido ? ` ${t('cat.estimated')}` : '');
    let html =
      `<div class="detop"><span class="sw big${k === 'metallic' ? ' met' : ''}${eAprox(p) ? ' deg' : ''}" style="background-color:${p.hex}"></span>` +
      `<div><b>${esc(displayName(p))}</b><div class="muted">${esc(p.code)} · ${esc(origem)}</div>` +
      `<div class="muted">${esc(p.hex)} · ${esc(t('cat.det.finish'))}: ${esc(acab)}${eAprox(p) ? ' · ' + esc(dicaAprox(p)) : ''}</div></div></div>`;

    const itens = [];
    const declaradas = links.declaradasPara(a, p.code);
    for (const outra of ABAS.filter((x) => x !== a)) {
      const lista = parecidas(outra, p.hex);
      for (const d of declaradas.filter((x) => x.aba === outra)) {
        const ja = lista.find((i) => i.paint === d.paint);
        if (ja) ja.fontes = d.fontes;
        else lista.push({ paint: d.paint, de: deToPaint(d.paint, p.hex), fontes: d.fontes });
      }
      if (lista.length) itens.push([outra, lista]);
    }
    html += `<div class="eqh" style="margin-top:8px">${esc(t(COMPARA_TIPO.has(k) ? 'cat.det.similar.same' : 'cat.det.similar'))}</div><div class="catsim">`;
    html += '</div>';
    box.innerHTML = html;

    const sim = box.querySelector('.catsim');
    itens.forEach(([outra, lista]) => {
      const card = document.createElement('div');
      card.className = 'eq';
      card.innerHTML = `<div class="eqh">${esc(catalogName(outra))}</div>`;
      lista.forEach(({ paint, de, fontes }) => {
        const kk = acabamentoDe(outra, paint).tipo;
        const el = document.createElement('div');
        el.className = 'eqrow';
        const sub = paint.code + (paint.line ? ` · ${lineName(paint.line)}` : '') + (paint.series ? ` · ${paint.series}` : '');
        el.title = `${paint.code} ${displayName(paint)} ${paint.hex} · ΔE00 ${de.toFixed(1)} (${deText(de)})${eAprox(paint) ? ' · ' + dicaAprox(paint) : ''}`;
        el.innerHTML =
          `<span class="sw${kk === 'metallic' ? ' met' : ''}${eAprox(paint) ? ' deg' : ''}" style="background-color:${paint.hex}"></span>` +
          `<span class="eqtxt">${esc(displayName(paint))}<b>${esc(sub)}</b></span>` +
          (eAprox(paint) ? `<span class="aprox" title="${esc(dicaAprox(paint))}">≈</span>` : '') +
          (fontes.length ? `<span class="badge">${esc(fontes.join(' · '))}</span>` : '') +
          `<span class="eqde ${classeDe(de)}">${de.toFixed(1)}</span>`;
        // clicar leva à tinta no catálogo (consulta encadeada)
        ativavel(el, () => irPara(outra, paint));
        card.appendChild(el);
      });
      sim.appendChild(card);
    });
  }

  /** Seleciona uma tinta e mostra seus detalhes (a marca atual não muda). */
  function mostrar(a, p) {
    escolhida = { aba: a, paint: p };
    renderDetalhe();
    renderGrade();
  }

  /** Vai para a marca de uma tinta, limpa os filtros e a seleciona. */
  function irPara(a, p) {
    aba = a;
    linha = TODOS;
    tipo = TODOS;
    $('catSearch').value = '';
    escolhida = { aba: a, paint: p };
    renderAbas();
    renderFiltros();
    renderDetalhe();
    renderGrade();
    $('catDet').scrollIntoView({ block: 'nearest' });
  }

  /** Redesenha tudo. */
  function renderTudo() {
    renderAbas();
    renderFiltros();
    renderDetalhe();
    renderGrade();
  }

  /** Abre a janela. */
  function open() {
    links ||= buildLinks(catalogs);
    anterior = document.activeElement;
    modal.classList.add('on');
    renderTudo();
    $('catSearch').focus();
  }

  /** Fecha a janela e devolve o foco. */
  function close() {
    modal.classList.remove('on');
    if (anterior && anterior.focus) anterior.focus();
  }

  /** Liga os eventos. */
  function bind() {
    $('btnCatalog').onclick = open;
    $('catClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    $('catSearch').oninput = renderGrade;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('on')) close();
    });
  }

  /** Redesenha com os textos do idioma atual (a janela aberta continua aberta). */
  function refresh() {
    if (modal.classList.contains('on')) renderTudo();
  }

  return { open, close, bind, refresh };
}
