/**
 * @module data/catalogs
 * Carrega os catálogos de tintas (`dados/*.json`) e os normaliza para o formato
 * usado pela aplicação.
 *
 * Formato normalizado de uma tinta de catálogo:
 *   { code: string, name: string, hex: "#rrggbb" }
 */

import { fitHex } from '../color/spectral.js';

/**
 * @typedef {Object} CatalogPaint
 * @property {string} code  código/SKU da tinta.
 * @property {string} name  nome de exibição.
 * @property {string} hex   cor aproximada "#rrggbb".
 * @property {import('../color/spectral.js').PaintFit} [fit]  ajuste espectral
 *           (presente apenas nas tintas do catálogo de ingredientes).
 */

/**
 * Catálogos disponíveis como cor-alvo, na ordem em que as abas aparecem.
 * `free` não é um catálogo: é a aba de cor livre (seletor de cor).
 */
export const TARGET_TABS = ['tamiyaA', 'tamiyaL', 'revellA', 'revellE', 'fs595', 'acrilex', 'free'];

/**
 * Abas de versões anteriores → aba equivalente atual. Usado para restaurar a
 * aba salva no `localStorage` por quem já usava o app antes da divisão do Tamiya.
 */
const LEGACY_TABS = { tamiya: 'tamiyaA' };

/**
 * Garante que a aba salva exista: converte nomes antigos e, se desconhecida,
 * volta para a primeira aba.
 * @param {string} tab aba salva.
 * @returns {string} aba válida.
 */
export function normalizeTab(tab) {
  if (TARGET_TABS.includes(tab)) return tab;
  return LEGACY_TABS[tab] || TARGET_TABS[0];
}

/** Nome de exibição de cada catálogo (e da aba de cor livre). */
export const CATALOG_NAMES = {
  tamiyaA: 'Tamiya Acrílica',
  tamiyaL: 'Tamiya Lacquer',
  revellA: 'Revell Aqua',
  revellE: 'Revell Email',
  fs595: 'FS 595',
  acrilex: 'Acrilex',
  free: 'Livre',
};

/** Catálogo cujas tintas podem ser usadas como ingredientes da mistura. */
export const INGREDIENT_CATALOG = 'acrilex';

/**
 * Códigos das tintas "âncora" (branco, preto e primárias fortes): entram
 * sempre nos conjuntos candidatos da sugestão automática.
 */
export const ANCHOR_CODES = ['519', '520', '505', '559', '555', '549', '504', '503'];

/** Pasta dos JSONs, relativa a este módulo (funciona em qualquer hospedagem). */
const DATA_DIR = new URL('../../dados/', import.meta.url);

/** Lê e interpreta um JSON da pasta `dados/`. */
async function loadJson(file) {
  const res = await fetch(new URL(file, DATA_DIR));
  if (!res.ok) throw new Error(`Falha ao carregar ${file}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Nome de exibição de uma tinta Revell: "<acabamento> <nome>" (ex.: "Matte Black"),
 * exceto transparentes que já trazem "Clear" no nome, com sufixo "(RAL xxxx)" quando existir.
 * @param {{sku:string,name:string,finish:string,ral?:string|null}} d registro bruto da Revell.
 * @returns {string}
 */
function revellLabel(d) {
  const n = d.name;
  let s =
    d.finish === 'Clear' && n.includes('lear') && !['101', '102'].includes(d.sku.slice(2))
      ? n
      : `${d.finish} ${n}`;
  if (d.ral) s += ` (RAL ${d.ral})`;
  return s;
}

/**
 * Monta os catálogos normalizados a partir dos JSONs brutos (função pura, sem rede).
 * @param {{ac: object[], tm: object[], rv: object[], fs: object[]}} raw conteúdo de
 *        `acrilex-cores-oficial`, `tamiya-cores-oficial`, `revell-cores-oficial` e `fs595-cores`.
 * @returns {Object<string, CatalogPaint[]>} catálogos por chave
 *          (`acrilex`, `tamiyaA`, `tamiyaL`, `revellA`, `revellE`, `fs595`).
 */
export function buildCatalogs({ ac, tm, rv, fs }) {
  // Tamiya: aditivos (sem cor) ficam de fora; separado por base química
  const tamiya = (base) =>
    tm.filter((d) => d.hex && !d.aditivo && d.base === base).map((d) => ({ code: d.code, name: d.name, hex: d.hex }));
  return {
    acrilex: ac.map((d) => ({ code: d.code, name: d.name, hex: d.hex })),
    tamiyaA: tamiya('acrilica_mini'), // X- (brilhante) e XF- (fosco)
    tamiyaL: tamiya('lacquer'), // LP-
    revellA: rv.filter((d) => d.linha === 'Aqua Color').map((d) => ({ code: d.sku, name: revellLabel(d), hex: d.hex })),
    revellE: rv.filter((d) => d.linha === 'Email Color').map((d) => ({ code: d.sku, name: revellLabel(d), hex: d.hex })),
    // FS 595: o 1º dígito do código já indica o acabamento (1 gloss, 2 semi-gloss, 3 flat)
    fs595: fs.map((d) => ({ code: d.code, name: d.name || 'Sem nome', hex: d.hex })),
  };
}

/**
 * Carrega os JSONs de `dados/` e monta todos os catálogos.
 * @returns {Promise<Object<string, CatalogPaint[]>>} catálogos por chave (ver {@link buildCatalogs}).
 */
export async function loadCatalogs() {
  const [ac, tm, rv, fs] = await Promise.all([
    loadJson('acrilex-cores-oficial.json'),
    loadJson('tamiya-cores-oficial.json'),
    loadJson('revell-cores-oficial.json'),
    loadJson('fs595-cores.json'),
  ]);
  return buildCatalogs({ ac, tm, rv, fs });
}

/**
 * Ajusta o espectro de cada tinta do catálogo de ingredientes (`p.fit`) e
 * devolve um índice por código.
 * @param {CatalogPaint[]} paints tintas do catálogo de ingredientes.
 * @returns {Object<string, CatalogPaint>} índice código → tinta.
 */
export function indexIngredients(paints) {
  const byCode = {};
  paints.forEach((p) => {
    byCode[p.code] = p;
    p.fit = fitHex(p.hex);
  });
  return byCode;
}
