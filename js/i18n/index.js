/**
 * @module i18n
 * Internacionalização mínima (português do Brasil e inglês), sem bibliotecas.
 *
 * Os textos ficam em dicionários planos (`pt-BR.js` e `en.js`), com chaves como "mix.add". Nos módulos de
 * interface, use `t('chave', {variavel: valor})`; no HTML estático, os atributos `data-i18n` (texto),
 * `data-i18n-html` (texto com marcação, só para textos escritos aqui), `data-i18n-title`,
 * `data-i18n-placeholder` e `data-i18n-aria-label`. Chaves ausentes caem para o português e, por fim,
 * para a própria chave. Nomes de cores e de produtos vêm dos catálogos e não são traduzidos.
 */

import ptBR from './pt-BR.js';
import en from './en.js';

/** Idiomas disponíveis: [código, nome no próprio idioma]. */
export const IDIOMAS = [
  ['pt-BR', 'Português'],
  ['en', 'English'],
];

const DICIONARIOS = { 'pt-BR': ptBR, en };
const PADRAO = 'pt-BR';
let atual = PADRAO;

/**
 * Idioma sugerido para o navegador: português se o navegador estiver em português, inglês nos demais casos.
 * @returns {string}
 */
export function idiomaDoNavegador() {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || PADRAO;
  return lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

/**
 * Define o idioma atual (códigos desconhecidos voltam ao padrão) e ajusta `<html lang>`.
 * @param {string} codigo "pt-BR" ou "en".
 * @returns {string} o idioma realmente aplicado.
 */
export function setLang(codigo) {
  atual = DICIONARIOS[codigo] ? codigo : PADRAO;
  if (typeof document !== 'undefined') document.documentElement.lang = atual;
  return atual;
}

/** @returns {string} idioma atual. */
export function getLang() {
  return atual;
}

/**
 * Indica se existe texto para a chave (no idioma atual ou no padrão).
 * @param {string} chave
 * @returns {boolean}
 */
export function has(chave) {
  return chave in DICIONARIOS[atual] || chave in DICIONARIOS[PADRAO];
}

/**
 * Texto de uma chave no idioma atual, com `{variavel}` substituída pelos valores dados.
 * @param {string} chave chave do dicionário.
 * @param {Object<string, string|number>} [vars] valores para os marcadores.
 * @returns {string}
 */
export function t(chave, vars) {
  let s = DICIONARIOS[atual][chave] ?? DICIONARIOS[PADRAO][chave] ?? chave;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

/**
 * Texto no singular ou plural: usa as chaves `<chave>.um` (n = 1) e `<chave>.outros`.
 * @param {string} chave base da chave.
 * @param {number} n quantidade (também disponível como `{n}`).
 * @param {Object<string, string|number>} [vars] outros valores.
 * @returns {string}
 */
export function tn(chave, n, vars) {
  return t(`${chave}.${n === 1 ? 'um' : 'outros'}`, { n, ...vars });
}

/**
 * Nome de uma linha de produtos para exibição: usa a tradução (`line.<nome>`) quando existe;
 * senão o próprio nome do catálogo (que costuma ser o nome comercial, igual em todos os idiomas).
 * @param {string} linha nome da linha nos dados.
 * @returns {string}
 */
export function lineName(linha) {
  return has(`line.${linha}`) ? t(`line.${linha}`) : linha;
}

/**
 * Aplica os textos aos elementos marcados com `data-i18n*` (e ao título da página).
 * @param {ParentNode} [raiz=document] onde procurar.
 */
export function applyStatic(raiz = document) {
  const doAtributo = (atributo, aplica) => {
    raiz.querySelectorAll(`[${atributo}]`).forEach((el) => aplica(el, t(el.getAttribute(atributo))));
  };
  doAtributo('data-i18n', (el, s) => { el.textContent = s; });
  doAtributo('data-i18n-html', (el, s) => { el.innerHTML = s; });
  doAtributo('data-i18n-title', (el, s) => { el.title = s; });
  doAtributo('data-i18n-placeholder', (el, s) => { el.placeholder = s; });
  doAtributo('data-i18n-aria-label', (el, s) => { el.setAttribute('aria-label', s); });
  if (typeof document !== 'undefined') document.title = t('app.title');
}
