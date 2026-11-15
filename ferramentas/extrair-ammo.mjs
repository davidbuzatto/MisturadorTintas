/**
 * Extrai as cores das tintas acrílicas AMMO by Mig do catálogo 2024 e grava `dados/ammo-cores.json`.
 *
 * Fonte: as tabelas de conversão do final do catálogo (uma linha por cor, com amostra colorida):
 *   - págs. 97–101: "Acrylic Colors" (A.MIG-0001…), colunas: referência, nome, amostra (com a referência
 *     RAL/RLM/FS escrita por cima), Hobby Color, Mr. Color, Tamiya, Model Color, Model Air, ATOM;
 *   - págs. 102–105: "ATOM" (ATOM-20000…), colunas: referência, nome, amostra, AMMO (equivalente A.MIG),
 *     Hobby Color, Mr. Color, Tamiya, Model Color, Model Air.
 * As colunas de equivalência de cada página são identificadas pelo cabeçalho; cada valor vai para a
 * coluna de cabeçalho mais próxima. A cor é a MEDIANA dos pixels da célula de amostra (o texto escrito por
 * cima ocupa pouco e não desloca a mediana). Amostras com variação interna alta (degradês) recebem
 * `degrade: true`.
 *
 * Requer o poppler (`pdftohtml` e `pdftoppm` no PATH).
 * Uso:  node ferramentas/extrair-ammo.mjs "caminho/do/Catalogo.pdf"
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hex2lab } from '../js/color/convert.js';
import { dE00 } from '../js/color/deltaE.js';

const PDF = process.argv[2];
if (!PDF) {
  console.error('uso: node ferramentas/extrair-ammo.mjs "caminho/do/Catalogo.pdf"');
  process.exit(1);
}
const SAIDA = fileURLToPath(new URL('../dados/ammo-cores.json', import.meta.url));
const DPI = 150;
/** Páginas das tabelas: [página, linha do produto]. */
const PAGINAS = [
  ...[97, 98, 99, 100, 101].map((p) => [p, 'Acrylic Colors']),
  ...[102, 103, 104, 105].map((p) => [p, 'ATOM']),
];
/** Região da célula de amostra (unidades do XML, página de 955 de largura). */
const AMOSTRA_X0 = 338;
const AMOSTRA_X1 = 458;
/** Faixas verticais da célula sem texto, relativas ao topo do texto da linha (unidades do XML). */
const FAIXAS_Y = [[-4, -1], [13, 16]];
/** ΔE00 entre as bordas esquerda e direita da célula acima do qual a amostra é considerada degradê. */
const LIMITE_DEGRADE = 10;

/** Cabeçalho (texto) → chave da coluna de equivalência. */
const COLUNAS = {
  'HOBBY COLOR': 'hobbyColor',
  'MR.COLOR': 'mrColor',
  TAMIYA: 'tamiya',
  'MODEL COLOR': 'modelColor',
  'MODEL AIR': 'modelAir',
  ATOM: 'atom',
  AMMO: 'ammo',
};
const REF = /^(A\.MIG-\d{4}|ATOM-\d{5}|AMMO\.[A-Z]-\d+)$/;

const tmp = mkdtempSync(join(tmpdir(), 'ammo-'));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
const decodificar = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

run('pdftohtml', ['-xml', '-i', '-noframes', '-f', '97', '-l', '105', PDF, join(tmp, 'txt')]);
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
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const cores = [];
const avisos = [];
for (const [p, linha] of PAGINAS) {
  const pg = paginasXml.get(p);
  run('pdftoppm', ['-f', String(p), '-l', String(p), '-r', String(DPI), PDF, join(tmp, 'pg')]);
  const img = lerPpm(join(tmp, `pg-${String(p).padStart(3, '0')}.ppm`));
  const px = img.w / pg.largura;

  // colunas de equivalência desta página (pelo cabeçalho)
  const colunas = pg.tokens.filter((o) => COLUNAS[o.s] && o.t < 260).map((o) => ({ chave: COLUNAS[o.s], centro: o.l + o.w / 2 }));
  if (!colunas.length) avisos.push(`pág ${p}: cabeçalho não encontrado`);

  // linhas: referência na 1ª coluna (à esquerda)
  const refs = pg.tokens.filter((o) => REF.test(o.s) && o.l <= 115).sort((a, b) => a.t - b.t);
  for (const r of refs) {
    const linhaTokens = pg.tokens.filter((o) => Math.abs(o.t - r.t) <= 6 && o !== r);
    const nome = linhaTokens.filter((o) => o.l > 150 && o.l < 330).sort((a, b) => a.l - b.l).map((o) => o.s).join(' ');
    const ral = linhaTokens.filter((o) => o.l >= 330 && o.l < 460 && !REF.test(o.s)).sort((a, b) => a.l - b.l).map((o) => o.s).join(' ');
    // equivalências: cada valor vai para a coluna de cabeçalho mais próxima (à direita da amostra)
    const equiv = {};
    for (const o of linhaTokens.filter((q) => q.l >= 460)) {
      const centro = o.l + o.w / 2;
      const col = colunas.reduce((a, c) => (Math.abs(c.centro - centro) < Math.abs(a.centro - centro) ? c : a));
      equiv[col.chave] = equiv[col.chave] ? `${equiv[col.chave]} ${o.s}` : o.s;
    }
    // amostra: faixas acima e abaixo do texto escrito na célula (só o fundo colorido)
    const faixa = (x0, x1) => {
      const R = [], G = [], B = [];
      for (const [ya, yb] of FAIXAS_Y) {
        for (let y = Math.round((r.t + ya) * px); y < Math.round((r.t + yb) * px); y++) {
          for (let x = Math.round(x0 * px); x < Math.round(x1 * px); x++) {
            const i = (y * img.w + x) * 3;
            R.push(img.d[i]); G.push(img.d[i + 1]); B.push(img.d[i + 2]);
          }
        }
      }
      return { R, G, B };
    };
    const cor = (x0, x1) => { const f = faixa(x0, x1); return hex(mediana(f.R), mediana(f.G), mediana(f.B)); };
    const meio = cor(AMOSTRA_X0, AMOSTRA_X1);
    const diferencaBordas = dE00(hex2lab(cor(AMOSTRA_X0 + 2, AMOSTRA_X0 + 22)), hex2lab(cor(AMOSTRA_X1 - 22, AMOSTRA_X1 - 2)));
    cores.push({
      code: r.s,
      name: nome,
      line: linha,
      ...(ral ? { ref: ral } : {}),
      hex: meio,
      ...(diferencaBordas > LIMITE_DEGRADE ? { degrade: true } : {}),
      ...(Object.keys(equiv).length ? { equiv } : {}),
    });
  }
}

writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
const por = {};
cores.forEach((c) => { por[c.line] = (por[c.line] || 0) + 1; });
console.log(`gravado ${cores.length} cores em dados/ammo-cores.json`, por);
console.log('degradê:', cores.filter((c) => c.degrade).map((c) => c.code).join(' ') || '—');
const cods = cores.map((c) => c.code);
const dup = cods.filter((c, i) => cods.indexOf(c) !== i);
if (dup.length) console.log('códigos repetidos:', [...new Set(dup)].join(' '));
console.log('sem nome:', cores.filter((c) => !c.name).map((c) => c.code).join(' ') || '—');
if (avisos.length) console.log('avisos:', avisos.join('; '));
