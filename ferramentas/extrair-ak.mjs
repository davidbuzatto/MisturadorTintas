/**
 * Extrai as cores do catálogo AK Interactive "Real Colors" (tintas lacquer) e grava `dados/ak-cores.json`.
 *
 * As páginas 9 a 11 do PDF ("RC RANGE") trazem uma grade de 4 colunas: amostra quadrada à esquerda,
 * código em negrito ("RC810") à direita dela e o nome (com referências RAL/FS/BS) logo abaixo.
 * As seções "STANDARD", "CIVIL" e "MILITARY" aparecem como títulos e valem até o próximo título
 * (inclusive nas páginas seguintes).
 *
 * O script:
 *   1. lê o texto posicionado (`pdftohtml -xml`) → código, nome e títulos de seção;
 *   2. renderiza a página (`pdftoppm`) e tira a MEDIANA dos pixels de uma caixa dentro da amostra;
 *   3. descarta os vernizes (sem cor) e marca `degrade: true` nas amostras com muita variação
 *      interna (tintas transparentes e metálicas), cuja mediana é só uma aproximação.
 *
 * As páginas 16 a 22 trazem tabelas de conversão para outras marcas (Tamiya, Vallejo, Mr. Hobby…);
 * elas não são lidas aqui.
 *
 * Requer o poppler (`pdftohtml` e `pdftoppm` no PATH).
 * Uso:  node ferramentas/extrair-ak.mjs "caminho/do/Catalogo.pdf"
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PDF = process.argv[2];
if (!PDF) {
  console.error('uso: node ferramentas/extrair-ak.mjs "caminho/do/Catalogo.pdf"');
  process.exit(1);
}
const SAIDA = fileURLToPath(new URL('../dados/ak-cores.json', import.meta.url));
const PAGINAS = [9, 10, 11];
const DPI = 150;
/** Títulos de seção → série. */
const SERIES = { STANDARD: 'Standard', CIVIL: 'Civil', MILITARY: 'Military' };
/** Amplitude (percentis 15–85, 0–255) acima da qual a amostra é considerada degradê. */
const LIMITE_DEGRADE = 12;

const tmp = mkdtempSync(join(tmpdir(), 'ak-'));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });

/** Decodifica as entidades HTML que o pdftohtml escreve. */
const decodificar = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

run('pdftohtml', ['-xml', '-i', '-noframes', '-f', String(PAGINAS[0]), '-l', String(PAGINAS.at(-1)), PDF, join(tmp, 'txt')]);
const xml = readFileSync(join(tmp, 'txt.xml'), 'utf8');
const paginasXml = new Map();
for (const trecho of xml.split('<page ').slice(1)) {
  paginasXml.set(+trecho.match(/number="(\d+)"/)[1], {
    largura: +trecho.match(/width="(\d+)"/)[1],
    tokens: [...trecho.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="\d+" font="\d+">([\s\S]*?)<\/text>/g)].map((m) => ({
      t: +m[1],
      l: +m[2],
      w: +m[3],
      s: decodificar(m[4].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim(),
    })),
  });
}

/** Lê um PPM (P6): {w, h, d}. */
function lerPpm(arquivo) {
  const b = readFileSync(arquivo);
  let pos = 0;
  const palavra = () => {
    while (b[pos] <= 32) pos++;
    let s = '';
    while (b[pos] > 32) s += String.fromCharCode(b[pos++]);
    return s;
  };
  palavra();
  const w = +palavra(), h = +palavra();
  palavra();
  pos++;
  return { w, h, d: b.subarray(pos) };
}
const mediana = (a) => { const s = Float64Array.from(a).sort(); return s[s.length >> 1]; };
const amplitude = (a) => { const s = Float64Array.from(a).sort(); return s[Math.floor(s.length * 0.85)] - s[Math.floor(s.length * 0.15)]; };
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const cores = [];
const ignoradas = [];
let serieAtual = '';
for (const p of PAGINAS) {
  const pg = paginasXml.get(p);
  run('pdftoppm', ['-f', String(p), '-l', String(p), '-r', String(DPI), PDF, join(tmp, 'pg')]);
  const img = lerPpm(join(tmp, `pg-${String(p).padStart(2, '0')}.ppm`));
  const px = img.w / pg.largura;

  const codigos = pg.tokens.filter((o) => /^RC\d{3}$/.test(o.s)).sort((a, b) => a.t - b.t || a.l - b.l);
  const titulos = pg.tokens.filter((o) => SERIES[o.s]).sort((a, b) => a.t - b.t);

  for (const c of codigos) {
    // série: último título acima desta célula (a anterior continua valendo entre páginas)
    for (const t of titulos) if (t.t < c.t) serieAtual = SERIES[t.s];

    // nome: linhas abaixo do código, alinhadas à esquerda, até o próximo código da coluna
    const proximo = Math.min(...codigos.filter((o) => o !== c && Math.abs(o.l - c.l) <= 4 && o.t > c.t + 10).map((o) => o.t - 2), c.t + 70);
    const nome = pg.tokens
      .filter((o) => o.t > c.t + 10 && o.t < proximo && Math.abs(o.l - c.l) <= 4)
      .sort((a, b) => a.t - b.t)
      .map((o) => o.s)
      .join(' ');

    if (/varnish/i.test(nome)) {
      ignoradas.push(`${c.s} ${nome}`);
      continue;
    }

    // amostra: quadrado à esquerda do código
    const R = [], G = [], B = [];
    for (let y = Math.round((c.t + 6) * px); y < Math.round((c.t + 38) * px); y++) {
      for (let x = Math.round((c.l - 50) * px); x < Math.round((c.l - 18) * px); x++) {
        const i = (y * img.w + x) * 3;
        R.push(img.d[i]); G.push(img.d[i + 1]); B.push(img.d[i + 2]);
      }
    }
    const variacao = (amplitude(R) + amplitude(G) + amplitude(B)) / 3;
    cores.push({
      code: c.s,
      name: nome,
      series: serieAtual,
      hex: hex(mediana(R), mediana(G), mediana(B)),
      ...(variacao > LIMITE_DEGRADE ? { degrade: true } : {}),
    });
  }
}

cores.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
const por = {};
cores.forEach((c) => { por[c.series] = (por[c.series] || 0) + 1; });
console.log(`gravado ${cores.length} cores em dados/ak-cores.json`, por);
console.log('ignoradas (vernizes):', ignoradas.join(' | ') || '—');
console.log('degradê:', cores.filter((c) => c.degrade).map((c) => c.code).join(' ') || '—');
console.log('sem nome:', cores.filter((c) => !c.name).map((c) => c.code).join(' ') || '—');
const cods = cores.map((c) => c.code);
const dup = cods.filter((c, i) => cods.indexOf(c) !== i);
if (dup.length) console.log('códigos repetidos:', [...new Set(dup)].join(' '));
