/**
 * Extrai as cores do catálogo Vallejo (PDF "Catalogue 2026") e grava `dados/vallejo-cores.json`.
 *
 * Cada cartela do catálogo é uma grade de amostras chapadas; logo abaixo de cada
 * amostra vêm o código ("70.951"), um número de ordem e o nome (inglês e espanhol).
 * O script:
 *   1. lê o texto posicionado de cada página (`pdftohtml -xml`) → código, nome, ordem;
 *   2. renderiza a página (`pdftoppm -ppm`) e tira a MEDIANA dos pixels de uma caixa
 *      dentro da amostra, logo acima do código → cor aproximada (tela);
 *   3. descarta "Auxiliary Products" (vernizes, diluentes… sem cor) e itens sem número de ordem;
 *   4. marca como `metal: true` as amostras com muita variação interna (degradês metálicos),
 *      para as quais a mediana é só uma aproximação.
 *
 * Requer o poppler (`pdftohtml` e `pdftoppm` no PATH).
 * Uso:  node ferramentas/extrair-vallejo.mjs "caminho/do/Catalogo.pdf"
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PDF = process.argv[2];
if (!PDF) {
  console.error('uso: node ferramentas/extrair-vallejo.mjs "caminho/do/Catalogo.pdf"');
  process.exit(1);
}
const SAIDA = fileURLToPath(new URL('../dados/vallejo-cores.json', import.meta.url));
const DPI = 150;
/** Desvio-padrão médio (0–255) acima do qual a amostra é considerada degradê/metálica. */
const LIMITE_DEGRADE = 8;

/**
 * Páginas de cartela: linha (família de produtos) e seções internas. `secoes` mapeia o
 * título impresso na página → série (string) ou `null` para ignorar (produtos auxiliares).
 * Células antes do primeiro título pertencem à série `padrao`. `semSelo`: a página não traz o
 * número de ordem ao lado do código (nesse caso as seções `null` é que excluem os auxiliares).
 *
 * Ficam de fora, por layout ou finalidade: Metal Color (p. 44), Primers (p. 48) e Hobby Paint (p. 90,
 * sprays em círculos misturados a vernizes).
 */
const PAGINAS = [
  { p: 12, linha: 'Model Color' },
  { p: 13, linha: 'Model Color', secoes: { 'Model Color Metallic': 'Metallic', 'Auxiliary Products': null } },
  { p: 25, linha: 'Liquid Metal', semSelo: true },
  { p: 28, linha: 'Model Air' },
  { p: 29, linha: 'Model Air', secoes: { 'Auxiliary Products': null } },
  { p: 52, linha: 'Game Color', secoes: { 'Game Color Wash': 'Wash', 'Game Color Special FX': 'Special FX' } },
  {
    p: 53,
    linha: 'Game Color',
    secoes: { 'Game Color Fluo': 'Fluo', 'Game Color Ink': 'Ink', 'Game Color Metallic': 'Metallic', 'Auxiliary Products': null },
  },
  { p: 68, linha: 'Xpress Color', secoes: { 'Xpress Color Intense': 'Intense' } },
  { p: 72, linha: 'Game Air', secoes: { Primers: 'Primers', 'Auxiliary Products': null } },
  { p: 76, linha: 'True Metallic Metal', secoes: { Light: 'Light', Base: 'Base', Shade: 'Shade', Airbrush: 'Airbrush' } },
  {
    p: 82,
    linha: 'Mecha Color',
    secoes: {
      'Fluorescent colors': 'Fluorescent',
      'Metallic colors': 'Metallic',
      'Mecha Color Weathering': 'Weathering',
      'Mecha Color Varnish and Auxiliary Products': null,
    },
  },
  {
    p: 142,
    linha: 'Premium Color',
    semSelo: true,
    secoes: { 'Fluorescent colors': 'Fluorescent', 'Pearl and metallic colors': 'Pearl and metallic', 'Candy colors': 'Candy', 'Auxiliary Products': null },
  },
];

const tmp = mkdtempSync(join(tmpdir(), 'vallejo-'));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });

// 1) texto posicionado de todas as páginas de interesse (um XML só)
const primeira = Math.min(...PAGINAS.map((x) => x.p));
const ultima = Math.max(...PAGINAS.map((x) => x.p));
run('pdftohtml', ['-xml', '-i', '-noframes', '-f', String(primeira), '-l', String(ultima), PDF, join(tmp, 'txt')]);
const xml = readFileSync(join(tmp, 'txt.xml'), 'utf8');
const paginasXml = new Map();
for (const trecho of xml.split('<page ').slice(1)) {
  const num = +trecho.match(/number="(\d+)"/)[1];
  const largura = +trecho.match(/width="(\d+)"/)[1];
  const tokens = [...trecho.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="\d+">([\s\S]*?)<\/text>/g)].map(
    (m) => ({ t: +m[1], l: +m[2], w: +m[3], s: m[5].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() })
  );
  paginasXml.set(num, { largura, tokens });
}

/** Lê um PPM (P6) e devolve {w, h, d}. */
function lerPpm(arquivo) {
  const b = readFileSync(arquivo);
  let pos = 0;
  const palavra = () => {
    while (b[pos] <= 32) pos++;
    let s = '';
    while (b[pos] > 32) s += String.fromCharCode(b[pos++]);
    return s;
  };
  if (palavra() !== 'P6') throw new Error('PPM inválido');
  const w = +palavra(), h = +palavra();
  palavra();
  pos++;
  return { w, h, d: b.subarray(pos) };
}

const mediana = (a) => { const s = Float64Array.from(a).sort(); return s[s.length >> 1]; };
const desvio = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const cores = [];
const avisos = [];
const vistos = new Set();
for (const cfg of PAGINAS) {
  const pg = paginasXml.get(cfg.p);
  run('pdftoppm', ['-f', String(cfg.p), '-l', String(cfg.p), '-r', String(DPI), PDF, join(tmp, 'pg')]);
  const nome = join(tmp, `pg-${String(cfg.p).padStart(3, '0')}.ppm`);
  const img = lerPpm(nome);
  const px = img.w / pg.largura; // pixels por unidade do XML
  // Códigos soltos em textos de rodapé (avisos de segurança etc.) repetem os da cartela:
  // vale a 1ª ocorrência, de cima para baixo.
  const codigos = pg.tokens.filter((x) => /^\d{2}\.\d{3}$/.test(x.s)).sort((p, q) => p.t - q.t || p.l - q.l);
  const titulos = Object.keys(cfg.secoes || {});
  const marcos = pg.tokens
    .filter((x) => titulos.includes(x.s) && x.l <= 80)
    .map((x) => ({ t: x.t, serie: cfg.secoes[x.s] }))
    .sort((a, b) => a.t - b.t);

  for (const c of codigos) {
    if (vistos.has(c.s)) continue;
    // série: último título acima da célula
    let serie = 'padrao';
    for (const m of marcos) if (m.t < c.t) serie = m.serie;
    if (serie === null) continue; // produtos auxiliares
    // número de ordem (selo) à direita do código, na mesma linha: só cores o têm
    const selo = pg.tokens.find((x) => /^\d{1,3}$/.test(x.s) && Math.abs(x.t - c.t) <= 3 && x.l > c.l + 15 && x.l < c.l + 130);
    if (!selo && !cfg.semSelo) continue;
    // nome: linhas abaixo do código, alinhadas à esquerda; 1ª = inglês, demais = espanhol
    const linhas = pg.tokens
      .filter((x) => Math.abs(x.l - c.l) <= 3 && x.t > c.t + 4 && x.t < c.t + 40 && !/^\d{2}\.\d{3}$/.test(x.s))
      .sort((a, b) => a.t - b.t)
      .map((x) => x.s);
    // amostra: caixa dentro do quadrado logo acima do código
    const x0 = Math.round((c.l + 8) * px), x1 = Math.round((c.l + 60) * px);
    const y0 = Math.round((c.t - 44) * px), y1 = Math.round((c.t - 10) * px);
    const R = [], G = [], B = [];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * img.w + x) * 3;
        R.push(img.d[i]); G.push(img.d[i + 1]); B.push(img.d[i + 2]);
      }
    }
    const var_ = (desvio(R) + desvio(G) + desvio(B)) / 3;
    const reg = {
      code: c.s,
      name: linhas[0] || '',
      nombre: linhas.slice(1).join(' '),
      line: cfg.linha,
      series: serie === 'padrao' ? '' : serie,
      hex: hex(mediana(R), mediana(G), mediana(B)),
      // degradê/metálico: a mediana é só uma aproximação da cor
      ...(var_ > LIMITE_DEGRADE ? { degrade: true } : {}),
    };
    if (linhas.length > 2) avisos.push(`pág ${cfg.p} ${c.s}: ${linhas.length} linhas de nome: ${linhas.join(' / ')}`);
    vistos.add(c.s);
    cores.push(reg);
  }
}

writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
const porLinha = {};
cores.forEach((c) => { const k = c.line + (c.series ? ' / ' + c.series : ''); porLinha[k] = (porLinha[k] || 0) + 1; });
console.log(`gravado ${cores.length} cores em dados/vallejo-cores.json`);
console.log(porLinha);
if (avisos.length) console.log(`${avisos.length} nomes com 3+ linhas (conferir):\n  ` + avisos.join('\n  '));
const cods = cores.map((c) => c.code);
const dup = cods.filter((c, i) => cods.indexOf(c) !== i);
if (dup.length) console.log('códigos repetidos:', [...new Set(dup)]);
