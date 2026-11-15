/**
 * Extrai as cores do RAL Classic de https://www.ralcolorchart.com e grava `dados/ral-cores.json`.
 *
 * O site tem uma página por família de tons (amarelo, laranja, vermelho…). Em cada uma, cada cor
 * é um link com a cor em hex no `style` ("background-color: #C5BB8A") e o código e o nome no
 * `title` ("RAL 1000 Green beige"). O título da página informa quantas cores ela tem, e o script
 * confere essa contagem.
 *
 * Observação: são as cores exibidas pelo site (aproximações para tela), não os valores
 * colorimétricos oficiais do RAL.
 *
 * Uso:  node ferramentas/extrair-ral.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SAIDA = fileURLToPath(new URL('../dados/ral-cores.json', import.meta.url));
const BASE = 'https://www.ralcolorchart.com/ral-classic/';
const FAMILIAS = ['yellow', 'orange', 'red', 'violet', 'blue', 'green', 'grey', 'brown', 'white-and-black'];
const PAUSA_MS = 1000;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const decodificar = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'");

const cores = [];
const problemas = [];
for (const familia of FAMILIAS) {
  const resp = await fetch(`${BASE}${familia}-hues`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) {
    problemas.push(`${familia}: HTTP ${resp.status}`);
    continue;
  }
  const html = await resp.text();
  const esperadas = +(html.match(/<h1>RAL Classic [^<]*<span>\((\d+)\)/) || [])[1];
  const grupo = [...html.matchAll(/<a class="[^"]*" href="\/ral-classic\/ral-\d{4}[^"]*" style="background-color: (#[0-9A-Fa-f]{6});" title="RAL (\d{4}) ([^"]+)">/g)].map(
    (m) => ({ code: m[2], name: decodificar(m[3]), hex: m[1].toLowerCase(), group: familia })
  );
  if (grupo.length !== esperadas) problemas.push(`${familia}: ${grupo.length} cores lidas, o site informa ${esperadas}`);
  console.log(`${familia}: ${grupo.length}${grupo.length === esperadas ? '' : ' (≠ ' + esperadas + ')'}`);
  cores.push(...grupo);
  await espera(PAUSA_MS);
}

cores.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
console.log(`gravado ${cores.length} cores em dados/ral-cores.json`);
const codigos = cores.map((c) => c.code);
const dup = codigos.filter((c, i) => codigos.indexOf(c) !== i);
if (dup.length) problemas.push('códigos repetidos: ' + [...new Set(dup)].join(' '));
if (problemas.length) console.log('PROBLEMAS:\n  ' + problemas.join('\n  '));
