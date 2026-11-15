/**
 * Extrai as cores das tintas acrílicas Humbrol e grava `dados/humbrol-cores.json`.
 *
 * Fonte: https://uk.humbrol.com/catalogue (filtro "Acrylic paint": 150 produtos, 13 páginas).
 * A lista de produtos é carregada por JavaScript, então ela foi coletada à parte, no navegador,
 * e está em `ferramentas/humbrol-lista.json` como [SKU, rótulo, caminho da imagem].
 * Cada imagem de produto mostra um respingo grande da tinta (à esquerda) e o frasco (à direita);
 * o script baixa a imagem, recorta uma caixa dentro do respingo e usa a MEDIANA dos pixels.
 *
 * Varnishes (sem cor) são ignorados. Amostras com muita variação interna (metálicas) recebem
 * `degrade: true`.
 *
 * Requer o `ffmpeg` no PATH (decodifica o JPEG e recorta a região).
 * Uso:  node ferramentas/extrair-humbrol.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LISTA = fileURLToPath(new URL('./humbrol-lista.json', import.meta.url));
const SAIDA = fileURLToPath(new URL('../dados/humbrol-cores.json', import.meta.url));
const CDN = 'https://d63oxfkn1m8sf.cloudfront.net/630x388/v2/';
/** Região do respingo (px da imagem de 620×388): x, y, largura, altura. */
const CAIXA = { x: 230, y: 150, w: 80, h: 60 };
/** Amplitude (percentis 15–85, 0–255) acima da qual a amostra é considerada degradê/metálica. */
const LIMITE_DEGRADE = 12;
/** Pausa entre downloads, para não sobrecarregar o servidor. */
const PAUSA_MS = 250;

const tmp = mkdtempSync(join(tmpdir(), 'humbrol-'));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const percentil = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];

/**
 * Interpreta o rótulo do site, ex.: "252 (RLM 82): Olivgrun - Matt".
 * @returns {{numero: string, ref: string, nome: string, acabamento: string}|null}
 */
function interpretar(rotulo) {
  const m = rotulo.match(/^(\d+)(?: \(([^)]+)\))?: (.+?) - ([A-Za-z]+)(?: - \(14ml\))?$/);
  if (!m) return null;
  return { numero: m[1], ref: m[2] || '', nome: m[3], acabamento: m[4] };
}

/** Baixa a imagem, recorta a caixa com o ffmpeg e devolve {hex, amplitude}. */
async function amostrar(caminho) {
  const url = CDN + caminho + '.jpg%3Ffit%3D1';
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const arquivo = join(tmp, 'img.jpg');
  writeFileSync(arquivo, Buffer.from(await resp.arrayBuffer()));
  const { x, y, w, h } = CAIXA;
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', arquivo, '-vf', `crop=${w}:${h}:${x}:${y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'ignore'] }
  );
  if (raw.length !== w * h * 3) throw new Error('recorte inesperado');
  const canais = [[], [], []];
  for (let i = 0; i < raw.length; i += 3) for (let c = 0; c < 3; c++) canais[c].push(raw[i + c]);
  canais.forEach((c) => c.sort((a, b) => a - b));
  const med = canais.map((c) => c[c.length >> 1]);
  const amplitude = canais.reduce((s, c) => s + percentil(c, 0.85) - percentil(c, 0.15), 0) / 3;
  return { hex: hex(...med), amplitude };
}

const lista = JSON.parse(readFileSync(LISTA, 'utf8'));
const cores = [];
const problemas = [];
for (const [sku, rotulo, caminho] of lista) {
  const info = interpretar(rotulo);
  if (!info) {
    problemas.push(`${sku}: ignorado (${rotulo})`); // varnishes etc.
    continue;
  }
  try {
    const { hex: cor, amplitude } = await amostrar(caminho);
    cores.push({
      code: info.numero,
      name: info.nome + (info.ref ? ` (${info.ref})` : ''),
      finish: info.acabamento,
      sku,
      hex: cor,
      ...(amplitude > LIMITE_DEGRADE ? { degrade: true } : {}),
    });
  } catch (e) {
    problemas.push(`${sku}: falha (${e.message})`);
  }
  await espera(PAUSA_MS);
}

cores.sort((a, b) => +a.code - +b.code);
writeFileSync(SAIDA, JSON.stringify(cores, null, 1) + '\n', 'utf8');
console.log(`gravado ${cores.length} cores em dados/humbrol-cores.json (de ${lista.length} produtos)`);
console.log('degradê:', cores.filter((c) => c.degrade).map((c) => c.code).join(' ') || '—');
if (problemas.length) console.log('ignorados/falhas:\n  ' + problemas.join('\n  '));
