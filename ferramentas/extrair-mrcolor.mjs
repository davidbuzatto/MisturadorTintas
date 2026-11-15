/**
 * Extrai as cores do catálogo Mr.Hobby (Gunze) 2024-2025 e grava `dados/mrcolor-cores.json`.
 *
 * O PDF tem páginas duplas e cada página dupla aparece duas vezes (p. 2=3, 4=5, …), então só
 * as páginas pares são lidas. Cada célula tem uma etiqueta preta com o código (texto branco),
 * a amostra de cor à direita da etiqueta, a letra de acabamento (G, SG, M, F, ME…) e o nome
 * logo abaixo. O prefixo do código (H, N, GX, SM…) é uma letra escura colada à etiqueta.
 *
 * O script:
 *   1. lê o texto posicionado (`pdftohtml -xml`) e acha as etiquetas (números em texto branco);
 *   2. monta o código com o prefixo (ao lado da etiqueta ou empilhado acima dela);
 *   3. tira a MEDIANA dos pixels da amostra (`pdftoppm`);
 *   4. lê acabamento e nome nas linhas abaixo da etiqueta;
 *   5. marca `degrade: true` nas amostras com muita variação interna (metálicas/pérola).
 *
 * Linhas extraídas: Mr. Color (códigos C…, com séries GX, Super Metallic 2, Ultra Metallic,
 * Revival, Velvet e Glay Tone), Aqueous Hobby Color (H…) e Acrysion (N…).
 * Ficam de fora: aditivos, thinners, kits, marcadores, linha Lascivus (pele), Clear GX e
 * Metallic GX (só amostras de bolinha, sem nome), cores de weathering e demais linhas especiais.
 *
 * Requer o poppler (`pdftohtml` e `pdftoppm` no PATH).
 * Uso:  node ferramentas/extrair-mrcolor.mjs "caminho/do/Catalogo.pdf"
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PDF = process.argv[2];
if (!PDF) {
  console.error('uso: node ferramentas/extrair-mrcolor.mjs "caminho/do/Catalogo.pdf"');
  process.exit(1);
}
const SAIDA = fileURLToPath(new URL('../dados/mrcolor-cores.json', import.meta.url));
const DPI = 150;
/** Páginas do PDF com cartelas (as ímpares repetem as pares). */
const PAGINAS = [2, 4, 6, 8];
/** Desvio-padrão médio (0–255) acima do qual a amostra é considerada degradê/metálica. */
const LIMITE_DEGRADE = 12;
/** Letras de acabamento que aparecem logo abaixo da etiqueta. */
const ACABAMENTOS = /^(G|SG|M|F|ME|PA|[A-Z]{1,2}\d{2}%)$/;
/** Largura (em unidades do XML) da página dupla; metade esquerda = página ímpar do catálogo. */
const LARGURA_PAGINA = 892;
/** Abaixo desta altura (unidades do XML) só há números de página. */
const ALTURA_RODAPE = 1150;
/** Largura máxima (unidades do XML) de um trecho de texto para ser considerado nome. */
const LARGURA_MAX_NOME = 110;

/** Letras de acabamento do catálogo → texto (ex.: "M75%" = fosco, 75% de brilho reduzido). */
const NOMES_ACABAMENTO = { G: 'Gloss', SG: 'Semi-gloss', M: 'Matte', F: 'Flat', ME: 'Metallic', PA: 'Pearl' };
function nomeAcabamento(letra) {
  const m = letra.match(/^([A-Z]{1,2})(\d{2}%)$/);
  return m ? `${NOMES_ACABAMENTO[m[1]] || m[1]} ${m[2]}` : NOMES_ACABAMENTO[letra] || letra;
}

/** Prefixo da etiqueta → linha, série e prefixo do código. `undefined` = ignorar. */
const LINHAS = {
  H: { line: 'Aqueous Hobby Color', series: '', pre: 'H' },
  N: { line: 'Acrysion', series: '', pre: 'N' },
  C: { line: 'Mr. Color', series: '', pre: 'C' },
  '': { line: 'Mr. Color', series: '', pre: 'C' }, // etiquetas só com número (esquerda das p. 2 e 4)
  GX: { line: 'Mr. Color', series: 'GX', pre: 'GX' },
  SM: { line: 'Mr. Color', series: 'Super Metallic 2', pre: 'SM' },
  UM: { line: 'Mr. Color', series: 'Ultra Metallic', pre: 'UM' },
  CRE: { line: 'Mr. Color', series: 'Revival', pre: 'CRE' },
  CV: { line: 'Mr. Color', series: 'Velvet', pre: 'CV' },
  CA: { line: 'Mr. Color', series: 'Glay Tone', pre: 'CA' },
};

const tmp = mkdtempSync(join(tmpdir(), 'mrcolor-'));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });

// 1) texto posicionado
run('pdftohtml', ['-xml', '-i', '-noframes', '-f', '2', '-l', '8', PDF, join(tmp, 'txt')]);
const xml = readFileSync(join(tmp, 'txt.xml'), 'utf8');
const cor = {};
for (const m of xml.matchAll(/<fontspec id="(\d+)" size="\d+" family="[^"]*" color="(#[0-9a-fA-F]{6})"/g)) cor[m[1]] = m[2].toLowerCase();

/** Decodifica as entidades HTML que o pdftohtml escreve (&amp;, &#34;, &#x27;…). */
function decodificar(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Tokens de texto de uma página: {t, l, w, c(or), s}. */
function tokens(trecho) {
  return [...trecho.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="\d+" font="(\d+)">([\s\S]*?)<\/text>/g)].map((m) => ({
    t: +m[1],
    l: +m[2],
    w: +m[3],
    c: cor[m[4]],
    s: decodificar(m[5].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim(),
  }));
}
const paginasXml = new Map();
for (const trecho of xml.split('<page ').slice(1)) {
  paginasXml.set(+trecho.match(/number="(\d+)"/)[1], { largura: +trecho.match(/width="(\d+)"/)[1], tokens: tokens(trecho) });
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
/** Amplitude entre os percentis 15 e 85: ignora a borda que eventualmente entra na caixa. */
const amplitude = (a) => { const s = Float64Array.from(a).sort(); return s[Math.floor(s.length * 0.85)] - s[Math.floor(s.length * 0.15)]; };
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const cores = [];
const ignoradas = {};
const variacoes = {}; // diagnóstico: variação das amostras por linha
const vistos = new Set();
for (const p of PAGINAS) {
  const pg = paginasXml.get(p);
  run('pdftoppm', ['-f', String(p), '-l', String(p), '-r', String(DPI), PDF, join(tmp, 'pg')]);
  const img = lerPpm(join(tmp, `pg-${String(p).padStart(2, '0')}.ppm`));
  const px = img.w / pg.largura;

  // 2) etiquetas: números em texto branco + prefixo (ao lado ou empilhado acima)
  const numeros = pg.tokens.filter((o) => o.c === '#ffffff' && /^\d{1,3}$/.test(o.s) && o.w <= 20);
  const letras = pg.tokens.filter((o) => o.c !== '#ffffff' && /^[A-Za-z]{1,3}$/.test(o.s) && o.w <= 30);
  const etiquetas = numeros.map((d) => {
    const ao_lado = letras.find((q) => Math.abs(q.t - d.t) <= 4 && q.l < d.l && d.l - (q.l + q.w) >= -2 && d.l - (q.l + q.w) <= 8);
    const acima = letras.find((q) => Math.abs(q.l - d.l) <= 7 && d.t - q.t >= 5 && d.t - q.t <= 22);
    const q = ao_lado || acima;
    const empilhada = !ao_lado && !!acima;
    return { n: d.s, pre: q ? q.s : '', empilhada, topo: empilhada ? acima.t : d.t, t: d.t, esq: q ? Math.min(q.l, d.l) : d.l, dir: d.l + d.w };
  });

  for (const e of etiquetas) {
    if (e.t > ALTURA_RODAPE) continue; // números de página no rodapé
    const cfg = LINHAS[e.pre];
    // etiquetas só com número: só valem na página esquerda da dupla (as da direita são de outros produtos)
    if (!cfg || (e.pre === '' && e.esq >= LARGURA_PAGINA)) {
      const k = (e.pre || '(número)') + e.n;
      ignoradas[k] = (ignoradas[k] || 0) + 1;
      continue;
    }
    const code = cfg.pre + e.n;
    if (vistos.has(code)) continue;

    // 3) amostra à direita da etiqueta
    const y0 = e.empilhada ? e.t - 8 : e.t + 6;
    const y1 = e.empilhada ? e.t + 14 : e.t + 26;
    const R = [], G = [], B = [];
    for (let y = Math.round(y0 * px); y < Math.round(y1 * px); y++) {
      for (let x = Math.round((e.dir + 8) * px); x < Math.round((e.dir + 34) * px); x++) {
        const i = (y * img.w + x) * 3;
        R.push(img.d[i]); G.push(img.d[i + 1]); B.push(img.d[i + 2]);
      }
    }
    const variacao = (amplitude(R) + amplitude(G) + amplitude(B)) / 3;

    // 4) acabamento e nome: textos escuros alinhados à esquerda da célula, abaixo da etiqueta e
    //    acima da próxima etiqueta da mesma coluna
    const proxima = Math.min(
      ...etiquetas.filter((o) => o !== e && Math.abs(o.esq - e.esq) <= 8 && o.t > e.t + 10).map((o) => o.topo - 2),
      e.t + 70
    );
    const linhas = pg.tokens
      // (a janela de -12 cobre etiquetas sem prefixo, cujo número fica centralizado na caixa)
      // (trechos largos são textos corridos de apresentação, não nomes de cor)
      .filter((o) => o.c !== '#ffffff' && o.w <= LARGURA_MAX_NOME && o.t > e.t + 12 && o.t < proxima && o.l >= e.esq - 12 && o.l <= e.esq + 12)
      .sort((a, b) => a.t - b.t || a.l - b.l)
      .map((o) => o.s);
    let acabamento = '';
    if (linhas.length && ACABAMENTOS.test(linhas[0])) acabamento = nomeAcabamento(linhas.shift());
    const name = linhas.join(' ').replace(/\s+/g, ' ').trim();

    vistos.add(code);
    (variacoes[cfg.line + ' ' + cfg.series] ||= []).push(Math.round(variacao));
    cores.push({
      code,
      name: name || code,
      line: cfg.line,
      series: cfg.series,
      finish: acabamento,
      hex: hex(mediana(R), mediana(G), mediana(B)),
      ...(variacao > LIMITE_DEGRADE ? { degrade: true } : {}),
    });
  }
}

// ordem: linha, série (principal primeiro), número
const ordemLinhas = ['Mr. Color', 'Aqueous Hobby Color', 'Acrysion'];
const num = (c) => parseInt(c.code.replace(/\D/g, ''), 10);
cores.sort(
  (a, b) =>
    ordemLinhas.indexOf(a.line) - ordemLinhas.indexOf(b.line) ||
    (a.series ? 1 : 0) - (b.series ? 1 : 0) ||
    a.series.localeCompare(b.series) ||
    num(a) - num(b)
);
writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');

const por = {};
cores.forEach((c) => { const k = c.line + (c.series ? ' / ' + c.series : ''); por[k] = (por[k] || 0) + 1; });
console.log(`gravado ${cores.length} cores em dados/mrcolor-cores.json`);
console.log(por);
console.log('sem nome:', cores.filter((c) => c.name === c.code).map((c) => c.code).join(' ') || '—');
console.log('degradê:', cores.filter((c) => c.degrade).length);
for (const [k, v] of Object.entries(variacoes)) {
  v.sort((a, b) => a - b);
  console.log('  variação', k.trim(), '| mediana', v[v.length >> 1], '| máx', v[v.length - 1]);
}
const ign = Object.entries(ignoradas).map(([k, v]) => k).slice(0, 40).join(' ');
console.log(`etiquetas ignoradas (${Object.keys(ignoradas).length}): ${ign}`);
