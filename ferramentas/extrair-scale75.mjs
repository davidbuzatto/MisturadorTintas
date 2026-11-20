/**
 * Extrai as cores das tintas Scale75 do site oficial e grava `dados/scale75-cores.json`.
 *
 * Fonte: https://scale75.com (loja Shopify). Cada linha de tintas é uma coleção, e o endereço
 * `/en/collections/<coleção>/products.json` lista os produtos (SKU, nome, imagens). Cada produto tem
 * fotos do frasco e uma foto da AMOSTRA: um traço de pincel em PNG com fundo transparente, onde a
 * posição da amostra na lista de imagens varia (em geral é a segunda, mas há produtos em que é outra).
 *
 * O que o script faz:
 *   1. lê as coleções de `COLECOES` e baixa as imagens de cada produto (largura 350 px);
 *   2. classifica cada imagem: traço (largo e fino), frasco, vazia (sem pixels opacos);
 *   3. no traço, usa o canal alfa para isolar a tinta, recua 4 px das bordas (que se misturam com o
 *      fundo) e mede a cor pela MEDIANA do terço ESQUERDO do traço (onde a tinta está mais carregada;
 *      para a direita ela vai esmaecendo, como num pincel; é por isso que o centro e o fim do traço
 *      são sempre mais claros e não entram na medida);
 *   4. grava as cores e um relatório com o que precisa de revisão manual (sem amostra, traço pequeno,
 *      semitransparente, degradê, cor igual à de outra tinta da mesma linha, imagens ambíguas).
 *
 * Sem dependências: o PNG é decodificado por `ferramentas/png.mjs`.
 * Uso:  node ferramentas/extrair-scale75.mjs [--saida arquivo.json] [--medidas arquivo.json] [--relatorio arquivo.md] [--cache pasta]
 *       (sem opções grava só `dados/scale75-cores.json`, `ferramentas/scale75-medidas.json` e o relatório em
 *       `ferramentas/scale75-conferir.md`)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hex2lab } from '../js/color/convert.js';
import { dE00 } from '../js/color/deltaE.js';
import { decodificarPng } from './png.mjs';

const SITE = 'https://scale75.com';
/** Largura pedida ao CDN: imagens menores, mesma proporção. */
const LARGURA = 350;
/** Raio (px) de recuo das bordas do traço. */
const RECUO = 4;
/** Abaixo disto (pixels no traço recuado) a amostra é pequena demais para confiar. */
const MIN_PIXELS = 1200;

/**
 * Coleções do site, na ordem em que as linhas aparecem na interface.
 * `acab` é o acabamento quando o texto do produto não diz; `serie` marca séries de efeito.
 */
const COLECOES = [
  { handle: 'scalecolor-individual', linha: 'Scalecolor', serie: '', acab: 'Matt' },
  { handle: 'metal-n-alchemy-individuales', linha: 'Scalecolor', serie: "Metal n' Alchemy", acab: 'Metallic' },
  { handle: 'inktensity-individuales', linha: 'Scalecolor', serie: 'Inktense', acab: 'Satin' },
  { handle: 'fantasy-games-individuales', linha: 'Fantasy & Games', serie: '', acab: 'Satin' },
  { handle: 'warfront-individuales', linha: 'Warfront', serie: '', acab: 'Matt' },
  { handle: 'instant-individuales', linha: 'Instant Colors', serie: '', acab: '' },
  { handle: 'fx-fluor-individuales', linha: 'FX Fluor', serie: '', acab: 'Fluo', fixo: true },
  { handle: 'artist-individuales', linha: 'Scalecolor Artist', serie: '', acab: 'Matt' },
  // Flow: tintas a ÓLEO (20 ml); o texto do produto não informa o acabamento
  // Drop & Paint e Scalecolor Games: só têm a foto do frasco (sem amostra); a cor vem do líquido
  { handle: 'drop-paint-individuales', linha: 'Drop & Paint', serie: '', acab: '' },
  { handle: 'scalecolor-games-individuales', linha: 'Scalecolor Games', serie: '', acab: '' },
  { handle: 'flow-individuales', linha: 'Flow', serie: '', acab: '' },
];

/** Siglas que ficam em maiúsculas nos nomes. */
const SIGLAS = new Set(['SS', 'US', 'USA', 'RAF', 'RLM', 'IJN', 'IJA', 'NATO', 'DAK', 'IDF', 'BS', 'FS', 'RAL', 'UV', 'AFV']);

/** Palavra toda em maiúsculas (4 letras ou mais) vira "Inicial maiúscula"; siglas ficam como estão. */
const palavra = (p) => (SIGLAS.has(p) || p.length < 4 || p !== p.toUpperCase() ? p : p.toLowerCase().replace(/^(\P{L}*)(\p{L})/u, (m, a, c) => a + c.toUpperCase()));

/** Iniciais maiúsculas em nomes escritos todo em maiúsculas (ou com palavras em maiúsculas no meio). */
function titulo(s) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t === t.toUpperCase()) {
    return t
      .split(' ')
      .map((p) => (SIGLAS.has(p) ? p : p.toLowerCase().replace(/(^|[-/(])(\p{L})/gu, (m, a, c) => a + c.toUpperCase())))
      .join(' ');
  }
  return t.split(' ').map(palavra).join(' ');
}

/** Acabamento dito no texto do produto ("Super matte finish", "Satin finish", "Metallic acrylic paint"…). */
function acabamentoDoTexto(html) {
  const t = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const m = t.match(/(super matte|matte|slightly satin|satin|gloss|metallic)\s+(finish\s+)?acrylic (paint|ink)/i);
  if (!m) return '';
  const k = m[1].toLowerCase();
  return /matte/.test(k) ? 'Matt' : /satin/.test(k) ? 'Satin' : k === 'gloss' ? 'Gloss' : 'Metallic';
}

/** Série de uma tinta Artist pelo nome (tintas-nanquim e neon não entram nas misturas). */
function serieArtist(nome) {
  if (/\bink\b/i.test(nome)) return 'Ink';
  if (/\bneon\b/i.test(nome)) return 'Fluo';
  return '';
}

const mediana = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Baixa um recurso, tentando de novo (com espera crescente) se o servidor limitar o ritmo (403/429) ou falhar. */
async function baixar(url, tipo) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return tipo === 'json' ? await r.json() : Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (tentativa === 5) throw new Error(`${url}: ${e.message}`);
      await espera(1500 * tentativa * tentativa);
    }
  }
}

/** Baixa uma imagem usando o cache em disco (cada imagem só é pedida ao servidor uma vez). */
async function imagem(url) {
  const arquivo = join(CACHE, url.replace(/[^A-Za-z0-9]+/g, '_').slice(-150) + '.png');
  if (existsSync(arquivo)) return readFileSync(arquivo);
  const dados = await baixar(url, 'bin');
  writeFileSync(arquivo, dados);
  await espera(120); // ritmo gentil com o servidor
  return dados;
}

/** Endereço da imagem redimensionada pelo CDN. */
const urlImagem = (src) => `${src}${src.includes('?') ? '&' : '?'}width=${LARGURA}`;

/**
 * Máscara da tinta numa imagem: pixels opacos (canal alfa) ou, em imagens sem transparência (fundo branco
 * opaco), pixels que diferem do fundo (mediana da borda) por mais de 30 em RGB.
 * @returns {{mascara: Uint8Array, fundoOpaco: boolean}}
 */
function mascaraDaTinta({ largura: W, altura: H, rgba }, limiar = 250) {
  const mascara = new Uint8Array(W * H);
  let n = 0;
  for (let i = 0; i < W * H; i++) if (rgba[i * 4 + 3] >= limiar) { mascara[i] = 1; n++; }
  if (n / (W * H) <= 0.9) return { mascara, fundoOpaco: false };
  // sem transparência: o fundo é a cor da borda da imagem
  const borda = [[], [], []];
  const amostra = (x, y) => { const o = (y * W + x) * 4; for (let c = 0; c < 3; c++) borda[c].push(rgba[o + c]); };
  for (let x = 0; x < W; x++) { amostra(x, 0); amostra(x, H - 1); }
  for (let y = 0; y < H; y++) { amostra(0, y); amostra(W - 1, y); }
  const bg = borda.map(mediana);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    mascara[i] = Math.hypot(rgba[o] - bg[0], rgba[o + 1] - bg[1], rgba[o + 2] - bg[2]) > 30 ? 1 : 0;
  }
  return { mascara, fundoOpaco: true };
}

/**
 * Cor do líquido num frasco (render com a mesma geometria em todos os produtos): faixa entre 88% e 96% da altura,
 * no corpo abaixo do rótulo, no terço central da largura. Mediana por canal.
 */
function corDoLiquido({ largura: W, rgba }, opaco, x0, x1, y0, y1) {
  const alt = y1 - y0;
  const cx = (x0 + x1) >> 1;
  const meia = Math.round((x1 - x0) * 0.2);
  const r = [], g = [], b = [];
  for (let y = Math.round(y0 + alt * 0.88); y <= Math.round(y0 + alt * 0.96); y++) {
    for (let x = cx - meia; x <= cx + meia; x++) {
      if (!opaco[y * W + x]) continue;
      const o = (y * W + x) * 4;
      r.push(rgba[o]); g.push(rgba[o + 1]); b.push(rgba[o + 2]);
    }
  }
  return r.length ? hex([mediana(r), mediana(g), mediana(b)]) : null;
}

/**
 * Analisa uma imagem: classifica (amostra, frasco, vazia) e, se for amostra, mede as cores.
 * Frasco/tubo: alto e estreito, ocupando bastante área. Amostra: traço largo ou mancha pequena.
 * @returns {{classe: string, pixels?: number, esq?: string, centro?: string, dir?: string, fundoOpaco?: boolean}}
 */
function analisar(png, limiar = 250) {
  const { largura: W, altura: H, rgba } = png;
  const { mascara: opaco, fundoOpaco } = mascaraDaTinta(png, limiar);
  let n = 0;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (opaco[y * W + x]) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const fracao = n / (W * H);
  if (fracao < 0.0005) return { classe: 'vazia', fundoOpaco };
  const larg = x1 - x0 + 1;
  const alt = y1 - y0 + 1;
  if (fracao > 0.25 || (alt > 1.3 * larg && fracao > 0.05)) return { classe: 'frasco', liquido: corDoLiquido(png, opaco, x0, x1, y0, y1), fundoOpaco };

  // recuo das bordas: só pixels cuja vizinhança (quadrado de raio R) é toda opaca; manchas pequenas usam R menor
  let xs, ys, R;
  for (R of [RECUO, 2]) {
    xs = [];
    ys = [];
    for (let y = y0 + R; y <= y1 - R; y++) {
      for (let x = x0 + R; x <= x1 - R; x++) {
        let ok = true;
        for (let dy = -R; dy <= R && ok; dy += 2) for (let dx = -R; dx <= R; dx += 2) if (!opaco[(y + dy) * W + x + dx]) { ok = false; break; }
        if (ok) { xs.push(x); ys.push(y); }
      }
    }
    if (xs.length >= 400) break;
  }
  if (!xs.length) return { classe: 'amostra', pixels: 0, fundoOpaco };
  const mx0 = Math.min(...xs);
  const mx1 = Math.max(...xs);
  const t = (mx1 - mx0) / 3;
  const cor = (lo, hi) => {
    const r = [], g = [], b = [];
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] >= lo && xs[i] < hi) {
        const o = (ys[i] * W + xs[i]) * 4;
        r.push(rgba[o]); g.push(rgba[o + 1]); b.push(rgba[o + 2]);
      }
    }
    return r.length ? { hex: hex([mediana(r), mediana(g), mediana(b)]), n: r.length } : null;
  };
  const esq = cor(mx0, mx0 + t + 1e-9);
  const centro = cor(mx0 + t + 1e-9, mx0 + 2 * t);
  const dir = cor(mx0 + 2 * t, mx1 + 1);
  return { classe: 'amostra', semitransparente: limiar < 250, pixels: xs.length, recuo: R, pixelsEsq: esq ? esq.n : 0, esq: esq?.hex, centro: centro?.hex, dir: dir?.hex, fundoOpaco };
}

/** Executa `fn` sobre os itens, `paralelo` de cada vez. */
async function emLotes(itens, paralelo, fn) {
  const saida = new Array(itens.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: paralelo }, async () => {
      while (i < itens.length) {
        const k = i++;
        saida[k] = await fn(itens[k], k);
      }
    })
  );
  return saida;
}

// ---- argumentos ----
const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : padrao;
};
const SAIDA = opcao('--saida', fileURLToPath(new URL('../dados/scale75-cores.json', import.meta.url)));
const MEDIDAS = opcao('--medidas', fileURLToPath(new URL('./scale75-medidas.json', import.meta.url)));
const CACHE = opcao('--cache', join(tmpdir(), 'scale75-imagens'));
mkdirSync(CACHE, { recursive: true });
const RELATORIO = opcao('--relatorio', fileURLToPath(new URL('./scale75-conferir.md', import.meta.url)));

// Correções manuais: { "SC-19": { "hex": "#e9b27a", "nota": "conferido no site" } }. Valem sobre a cor medida
// (o extrator não as sobrescreve) e tiram a tinta da lista de conferência.
const CORRECOES_ARQ = fileURLToPath(new URL('./scale75-correcoes.json', import.meta.url));
const correcoes = existsSync(CORRECOES_ARQ) ? JSON.parse(readFileSync(CORRECOES_ARQ, 'utf8')) : {};

// ---- coleta ----
const produtos = [];
const vistos = new Set();
for (const col of COLECOES) {
  const j = await baixar(`${SITE}/en/collections/${col.handle}/products.json?limit=250`, 'json');
  for (const p of j.products) {
    const code = (p.variants[0]?.sku || '').trim();
    if (!code || vistos.has(code)) continue;
    vistos.add(code);
    const nome = titulo(p.title);
    const serie = col.serie || (col.linha === 'Scalecolor Artist' ? serieArtist(nome) : '');
    produtos.push({
      col,
      code,
      nome,
      serie,
      finish: col.fixo ? col.acab : acabamentoDoTexto(p.body_html) || col.acab,
      pagina: `${SITE}/en/products/${p.handle}`,
      imagens: p.images.map((i) => i.src),
    });
  }
  console.log(`${col.handle}: ${j.products.length} produtos`);
}

console.log(`analisando imagens de ${produtos.length} produtos…`);
await emLotes(produtos, 3, async (p) => {
  p.analises = [];
  for (const src of p.imagens) {
    try {
      const png = decodificarPng(await imagem(urlImagem(src)));
      let a = analisar(png);
      if (a.classe === 'vazia') {
        const b = analisar(png, 100);
        if (b.classe === 'amostra') a = b;
      }
      p.analises.push({ src, ...a });
    } catch (e) {
      p.analises.push({ src, classe: 'erro', erro: e.message });
    }
  }
});

// ---- resultado e revisão ----
/** Coleções que só têm a foto do frasco (sem amostra de traço): a cor vem do líquido e é sempre aproximada. */
const SO_FRASCO = new Set(['drop-paint-individuales', 'scalecolor-games-individuales']);
/** Abaixo disto (pixels no traço recuado) a amostra é pequena demais; vai para a lista de conferência manual. */
const MUITO_PEQUENO = 700;

const revisar = [];
/**
 * `grau`: 1 = você precisa olhar no site (vai para o relatório de conferência); 2 = só registrado em
 * `scale75-medidas.json` (cor utilizável, com ressalva); 3 = método diferente, sem ação.
 */
const marca = (p, motivo, grau = 2) => revisar.push({ code: p.code, motivo, grau });
const cores = [];
const medidas = [];
for (const p of produtos) {
  const tracos = p.analises.filter((a) => a.classe === 'amostra' && a.pixels > 0);
  const frasco = p.analises.find((a) => a.classe === 'frasco' && a.liquido)?.liquido || null;
  p.frasco = frasco;
  const base = { code: p.code, nome: p.nome, linha: p.col.linha, serie: p.serie, pagina: p.pagina };
  if (!tracos.length && frasco) {
    if (SO_FRASCO.has(p.col.handle)) marca(p, `a linha não publica amostra: cor lida do líquido no frasco (${frasco})`, 3);
    else marca(p, `sem amostra utilizável nesta tinta (${p.analises.map((a) => a.classe).join(', ')}); cor lida do frasco (${frasco}). Veja no site se existe outra foto com a amostra`, 1);
    cores.push({ code: p.code, name: p.nome, line: p.col.linha, series: p.serie, finish: p.finish, hex: frasco, aprox: 'frasco' });
    medidas.push({ ...base, hex: frasco, origem: 'frasco', aprox: 'frasco', imagem: p.imagens[0] });
    continue;
  }
  if (!tracos.length) {
    const classes = p.analises.map((a) => a.classe + (a.erro ? `(${a.erro})` : '')).join(', ');
    marca(p, `sem cor: nenhuma imagem utilizável (${classes || 'nenhuma'})`, 1);
    medidas.push({ ...base, hex: null, imagens: p.analises.map((a) => ({ src: a.src, classe: a.classe })) });
    continue;
  }
  const tr = tracos.slice().sort((a, b) => b.pixels - a.pixels)[0]; // maior traço
  const aprox = tr.semitransparente ? 'diluida' : '';
  if (tracos.length > 1) marca(p, `${tracos.length} imagens de amostra; usada a de maior área`, 2);
  if (tr.fundoOpaco) marca(p, `imagem sem transparência: tinta separada do fundo por diferença de cor (${tr.esq})`, 3);
  if (tr.semitransparente) marca(p, `amostra diluída (semitransparente): medi ${tr.esq}, que pode estar mais claro que a tinta real`, 1);
  if (tr.recuo < RECUO) marca(p, `mancha pequena (${tr.pixels} px medidos)`, tr.pixels < MUITO_PEQUENO ? 1 : 2);
  if (tr.pixels < MIN_PIXELS) marca(p, `traço pequeno (${tr.pixels} px): cor ${tr.esq} pouco confiável`, tr.pixels < MUITO_PEQUENO ? 1 : 2);
  if (tr.pixelsEsq < 150) marca(p, `poucos pixels no lado esquerdo (${tr.pixelsEsq})`, 1);
  // Instant Colors: a tinta é feita para dar degradê numa demão; o terço esquerdo é só o tom mais carregado
  if (p.col.linha === 'Instant Colors') marca(p, `tinta de degradê por design: medido o tom mais carregado (${tr.esq}); centro ${tr.centro}`, 3);
  cores.push({ code: p.code, name: p.nome, line: p.col.linha, series: p.serie, finish: p.finish, hex: tr.esq, ...(aprox ? { aprox } : {}) });
  medidas.push({ ...base, hex: tr.esq, origem: 'traço', ...(aprox ? { aprox } : {}), frasco, centro: tr.centro, dir: tr.dir, pixels: tr.pixels, imagem: tr.src });
}
// aplica as correções manuais (a cor conferida substitui a medida e deixa de ser aproximada)
for (const [code, c] of Object.entries(correcoes)) {
  const cor = cores.find((x) => x.code === code);
  const m = medidas.find((x) => x.code === code);
  if (!cor || !m) { console.warn(`correção ignorada: ${code} não existe`); continue; }
  if (!/^#[0-9a-f]{6}$/.test(c.hex)) throw new Error(`correção de ${code}: hex inválido`);
  m.medido = m.hex;
  cor.hex = m.hex = c.hex;
  delete cor.aprox;
  delete m.aprox;
  m.origem = 'manual';
  m.nota = c.nota || '';
  for (let i = revisar.length - 1; i >= 0; i--) if (revisar[i].code === code && revisar[i].grau === 1) revisar.splice(i, 1);
}
// cores repetidas na mesma linha (possível foto trocada)
const porCor = {};
cores.filter((c) => !c.aprox).forEach((c) => ((porCor[c.line + c.hex] ||= []).push(c)));
for (const grupo of Object.values(porCor).filter((g) => g.length > 1)) {
  for (const c of grupo) {
    marca(produtos.find((x) => x.code === c.code), `mesma cor ${c.hex} que ${grupo.filter((o) => o !== c).map((o) => o.code).join(', ')} na mesma linha: uma das fotos pode estar trocada`, 1);
  }
}
for (const m of medidas) m.avisos = revisar.filter((r) => r.code === m.code).map((r) => r.motivo);

const num = (c) => +c.code.match(/\d+/)[0];
const ordem = COLECOES.map((c) => c.linha).filter((l, i, a) => a.indexOf(l) === i);
cores.sort((a, b) => ordem.indexOf(a.line) - ordem.indexOf(b.line) || a.code.replace(/\d+/, '').localeCompare(b.code.replace(/\d+/, '')) || num(a) - num(b));

// calibração: nas tintas que têm traço e frasco, quão perto está a cor do líquido da cor do traço?
// (só vale para os frascos das linhas acrílicas; Artist e Flow são tubos, com outra geometria)
const calib = {};
for (const m of medidas) {
  if (m.origem === 'traço' && m.frasco && !['Scalecolor Artist', 'Flow'].includes(m.linha)) (calib[m.linha] ||= []).push(dE00(hex2lab(m.hex), hex2lab(m.frasco)));
}
for (const [linha, v] of Object.entries(calib)) {
  v.sort((a, b) => a - b);
  console.log(`calibração ${linha.padEnd(18)} n=${String(v.length).padStart(3)} ΔE frasco×traço: mediana ${v[v.length >> 1].toFixed(1)}, p90 ${v[Math.floor(v.length * 0.9)].toFixed(1)}, máx ${v[v.length - 1].toFixed(1)}`);
}
writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
writeFileSync(MEDIDAS, JSON.stringify(medidas, null, 1) + '\n', 'utf8');

const porLinha = {};
cores.forEach((c) => { const k = c.line + (c.series ? ' / ' + c.series : ''); porLinha[k] = (porLinha[k] || 0) + 1; });

// relatório de conferência: só o que exige olhar no site (grau 1), uma linha por tinta
const conferir = [...new Set(revisar.filter((r) => r.grau === 1).map((r) => r.code))]
  .map((code) => medidas.find((m) => m.code === code))
  .sort((a, b) => ordem.indexOf(a.linha) - ordem.indexOf(b.linha) || a.code.localeCompare(b.code, 'en', { numeric: true }));
const nGrau = (g) => new Set(revisar.filter((r) => r.grau === g).map((r) => r.code)).size;
const md = [
  '# Scale75: tintas para conferir no site',
  '',
  `${cores.length} de ${produtos.length} tintas têm cor. **${conferir.length} precisam de uma olhada sua** no site (abaixo); as demais não precisam de ação.`,
  '',
  '| Código | Nome | Linha | Cor medida | O que conferir | Página | Imagem da amostra |',
  '|---|---|---|---|---|---|---|',
  ...conferir.map((m) => `| ${m.code} | ${m.nome} | ${m.linha}${m.serie ? ' / ' + m.serie : ''} | \`${m.hex || '—'}\` | ${revisar.filter((r) => r.code === m.code && r.grau === 1).map((r) => r.motivo).join('; ')} | ${m.pagina} | ${m.imagem || ''} |`),
  '',
  '## Sem ação',
  '',
  `- ${[...SO_FRASCO].map((h) => COLECOES.find((c) => c.handle === h).linha).join(' e ')}: ${medidas.filter((m) => SO_FRASCO.has(COLECOES.find((c) => c.linha === m.linha)?.handle) && m.origem === 'frasco').length} tintas sem amostra no site (a página do produto só mostra o frasco). A cor é lida do líquido (erro típico de ΔE 7) e o app a mostra como aproximada.`,
  `- ${nGrau(3) - 0} tintas medidas por um método diferente (sem transparência, degradê, frasco) e ${nGrau(2)} com ressalva leve: ficam registradas em \`scale75-medidas.json\` (campo \`avisos\`).`,
  '',
].join('\n');
writeFileSync(RELATORIO, md, 'utf8');
console.log(`gravado ${cores.length} cores em ${SAIDA}`);
console.log(porLinha);
console.log(`${conferir.length} tintas para conferir no site (${RELATORIO})`);
