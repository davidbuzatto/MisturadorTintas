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
export const TARGET_TABS = ['tamiya', 'revellA', 'revellE', 'acrilex', 'free'];

/** Nome de exibição de cada catálogo (e da aba de cor livre). */
export const CATALOG_NAMES = {
  tamiya: 'Tamiya',
  revellA: 'Revell Aqua',
  revellE: 'Revell Email',
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
 * Carrega os JSONs e monta todos os catálogos.
 * @returns {Promise<Object<string, CatalogPaint[]>>} catálogos por chave
 *          (`acrilex`, `tamiya`, `revellA`, `revellE`).
 */
export async function loadCatalogs() {
  const [ac, tm, rv] = await Promise.all([
    loadJson('acrilex-cores-oficial.json'),
    loadJson('tamiya-cores-oficial.json'),
    loadJson('revell-cores-oficial.json'),
  ]);
  return {
    acrilex: ac.map((d) => ({ code: d.code, name: d.name, hex: d.hex })),
    // aditivos (sem cor) ficam de fora
    tamiya: tm.filter((d) => d.hex && !d.aditivo).map((d) => ({ code: d.code, name: d.name, hex: d.hex })),
    revellA: rv.filter((d) => d.linha === 'Aqua Color').map((d) => ({ code: d.sku, name: revellLabel(d), hex: d.hex })),
    revellE: rv.filter((d) => d.linha === 'Email Color').map((d) => ({ code: d.sku, name: revellLabel(d), hex: d.hex })),
  };
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
