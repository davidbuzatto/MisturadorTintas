/**
 * Extrai o catálogo Federal Standard 595 (AMS-STD-595) de https://ams-std-595-color.com/
 * e grava `dados/fs595-cores.json`.
 *
 * A página é uma tabela em que cada linha de amostras (células vazias com
 * `background-color: rgb(...)`) é seguida por uma linha de rótulos
 * ("<número> <nomes> (<acabamento>)"). As amostras são pareadas com os rótulos
 * pela posição na linha. Linhas cujo número de amostras e de rótulos difere
 * são descartadas e relatadas (o HTML do site é irregular).
 *
 * Uso:  node ferramentas/extrair-fs595.mjs [url-ou-arquivo.html]
 *
 * Observação: as cores são as exibidas pelo site (aproximações para tela de
 * um leque de cores físico), não valores oficiais da norma.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FONTE = process.argv[2] || 'https://ams-std-595-color.com/';
const SAIDA = fileURLToPath(new URL('../dados/fs595-cores.json', import.meta.url));

/** Remove tags e entidades simples, normalizando espaços. */
const limpar = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Converte "rgb(r, g, b)" em "#rrggbb". */
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/** Acabamentos como aparecem no site → rótulo padronizado. */
const ACABAMENTOS = { gloss: 'Gloss', 'semi-gloss': 'Semi-gloss', 'flat/matt': 'Flat' };

const html = /^https?:/.test(FONTE)
  ? await (await fetch(FONTE, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
  : await readFile(FONTE, 'utf8');

// 1) Lê cada <tr>: amostras (células vazias coloridas) e rótulos (texto iniciado por número).
const linhas = [];
for (const tr of html.split('</tr>')) {
  const amostras = [];
  const rotulos = [];
  for (const [, attrs, corpo] of tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)) {
    const texto = limpar(corpo);
    if (/^\d{5}/.test(texto)) {
      rotulos.push(texto);
    } else if (!texto && !/colspan/.test(attrs)) {
      const m = attrs.match(/background-color: rgb\((\d+), (\d+), (\d+)\)/);
      if (m) amostras.push(rgb2hex(+m[1], +m[2], +m[3]));
    }
  }
  if (amostras.length || rotulos.length) linhas.push({ amostras, rotulos });
}

// 2) Pareia cada linha de amostras com a linha de rótulos seguinte.
const cores = [];
const problemas = [];
for (let i = 0; i < linhas.length; i++) {
  const { amostras, rotulos } = linhas[i];
  if (!amostras.length) {
    if (rotulos.length) problemas.push(`rótulos sem amostras (linha ${i}): ${rotulos[0]}`);
    continue;
  }
  const prox = linhas[i + 1];
  if (prox && !prox.amostras.length && prox.rotulos.length === amostras.length) {
    amostras.forEach((hex, k) => cores.push({ rotulo: prox.rotulos[k], hex }));
    i++;
  } else {
    problemas.push(`linha ${i}: ${amostras.length} amostras × ${prox ? prox.rotulos.length : 0} rótulos`);
  }
}

// 3) Interpreta o rótulo: "<número> <nomes> (<acabamento>)".
const POR_DIGITO = { 1: 'Gloss', 2: 'Semi-gloss', 3: 'Flat' };
const saida = [];
const semNumeroValido = [];
const divergencias = [];
for (const { rotulo, hex } of cores) {
  const m = rotulo.match(/^(\d{5})\s*(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) { semNumeroValido.push(rotulo); continue; }
  const [, code, nomes, acab] = m;
  // Pela norma, o 1º dígito do número define o acabamento (1 gloss, 2 semi-gloss, 3 flat).
  // Se o rótulo do site discordar, vale o número.
  const finish = POR_DIGITO[code[0]];
  const finishSite = ACABAMENTOS[acab.toLowerCase()] || acab;
  if (finish !== finishSite) divergencias.push(`${code}: site diz "${finishSite}", número indica "${finish}"`);
  saida.push({
    code,
    name: nomes.replace(/\s*,\s*/g, ', ').replace(/^Unknown Name$/i, '') || '',
    finish: finish || finishSite,
    hex,
  });
}
saida.sort((a, b) => a.code.localeCompare(b.code) || a.finish.localeCompare(b.finish));

await writeFile(SAIDA, JSON.stringify(saida, null, 1) + '\n', 'utf8');

const porAcab = {};
saida.forEach((c) => { porAcab[c.finish] = (porAcab[c.finish] || 0) + 1; });
console.log(`gravado ${saida.length} cores em dados/fs595-cores.json`, porAcab);
if (problemas.length) console.log(`${problemas.length} trechos descartados:\n  ` + problemas.join('\n  '));
if (divergencias.length) console.log('acabamento: site × número:\n  ' + divergencias.join('\n  '));
if (semNumeroValido.length) console.log('rótulos fora do padrão:', semNumeroValido);
const codigos = saida.map((c) => c.code + c.finish);
const dup = codigos.filter((c, i) => codigos.indexOf(c) !== i);
if (dup.length) console.log('códigos repetidos (mesmo acabamento):', dup);
