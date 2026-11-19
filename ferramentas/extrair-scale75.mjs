/**
 * Monta `dados/scale75-cores.json` a partir de `ferramentas/scale75-lista.json`.
 *
 * A lista vem do Scalemates, coletada no navegador com `coletar-scale75.js` (o site recusa acesso
 * fora dele): uma chave por página de linha ("scale75--683", "scalecolor-artist--888"), cada uma com
 * {code, name, finish, hex}. A cor é a amostra da própria lista, igual ao "Color viewer" da página de
 * cada tinta. Tintas sem amostra no site (a maioria das Prism Effect e alguns primers) não entram na
 * lista. Este script:
 *   1. separa as linhas pelo prefixo do código (SC Scalecolor, SFG Fantasy & Games, SW Warfront…);
 *   2. marca as séries de efeito da Scalecolor: Metal n' Alchemy (metálicas e iridescentes) e Inktense;
 *   3. normaliza nomes (iniciais maiúsculas) e o acabamento das Inktense ("Inks" → "Satin").
 *
 * Uso:  node ferramentas/extrair-scale75.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LISTA = fileURLToPath(new URL('./scale75-lista.json', import.meta.url));
const SAIDA = fileURLToPath(new URL('../dados/scale75-cores.json', import.meta.url));

/** Prefixo do código → linha, na ordem em que as linhas aparecem na interface. */
const LINHAS = [
  ['SC', 'Scalecolor'],
  ['SCPR', 'Scalecolor'],
  ['SFG', 'Fantasy & Games'],
  ['SW', 'Warfront'],
  ['SIN', 'Instant Colors'],
  ['SFX', 'FX Fluor'],
  ['SART', 'Scalecolor Artist'],
];
const ORDEM = [...new Set(LINHAS.map(([, l]) => l))];

/** Série dentro da Scalecolor (vazio na série principal). */
function serie(d) {
  if (d.code.startsWith('SCPR-')) return 'Primer';
  if (/inktense/i.test(d.name)) return 'Inktense';
  if (/alchemy/i.test(d.name) || ['Metallic', 'Iridescent'].includes(d.finish)) return "Metal n' Alchemy";
  return '';
}

/** Iniciais maiúsculas; nomes todos em maiúsculas (Artist) passam antes para minúsculas. */
const titulo = (s) => (s === s.toUpperCase() ? s.toLowerCase() : s).replace(/(^|[\s-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase());

const lista = JSON.parse(readFileSync(LISTA, 'utf8'));
const cores = [];
const avisos = [];
for (const d of Object.values(lista).flat()) {
  const prefixo = d.code.match(/^[A-Z]+/)[0];
  const linha = LINHAS.find(([p]) => p === prefixo)?.[1];
  if (!linha) {
    avisos.push(`prefixo desconhecido: ${d.code}`);
    continue;
  }
  const s = linha === 'Scalecolor' ? serie(d) : '';
  cores.push({
    code: d.code,
    name: titulo(d.name.trim()),
    line: linha,
    series: s,
    finish: d.finish === 'Inks' ? 'Satin' : d.finish,
    hex: d.hex.toLowerCase(),
  });
}
const num = (c) => +c.code.match(/\d+/)[0];
cores.sort((a, b) => ORDEM.indexOf(a.line) - ORDEM.indexOf(b.line) || a.code.localeCompare(b.code, 'en', { numeric: true }) || num(a) - num(b));

writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
const porLinha = {};
cores.forEach((c) => { const k = c.line + (c.series ? ' / ' + c.series : ''); porLinha[k] = (porLinha[k] || 0) + 1; });
console.log(`gravado ${cores.length} cores em dados/scale75-cores.json`);
console.log(porLinha);
const cods = cores.map((c) => c.code);
const dup = cods.filter((c, i) => cods.indexOf(c) !== i);
if (dup.length) console.log('códigos repetidos:', [...new Set(dup)]);
const hexes = {};
cores.forEach((c) => (hexes[c.hex] = [...(hexes[c.hex] || []), c.code]));
const iguais = Object.values(hexes).filter((v) => v.length > 1 && new Set(v.map((c) => c.split('-')[0])).size === 1);
if (iguais.length) console.log('mesma cor na mesma linha (conferir no site):', iguais);
if (avisos.length) console.log(avisos.join('\n'));
