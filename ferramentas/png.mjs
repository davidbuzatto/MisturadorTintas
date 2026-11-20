/**
 * Decodificador mínimo de PNG, sem dependências (usa só o `zlib` do Node).
 *
 * Suporta PNG sem entrelaçamento, 8 bits por canal, nos tipos de cor 0 (cinza), 2 (RGB), 3 (paleta),
 * 4 (cinza + alfa) e 6 (RGBA). É o bastante para as imagens de amostra dos sites de tintas que servem
 * PNG com fundo transparente (usado por `extrair-scale75.mjs`).
 */

import { inflateSync } from 'node:zlib';

const ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Canais por tipo de cor do PNG. */
const CANAIS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Predição de Paeth (filtro 4 do PNG). */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Decodifica um PNG para pixels RGBA.
 * @param {Buffer} buf conteúdo do arquivo PNG.
 * @returns {{largura: number, altura: number, rgba: Uint8Array}} `rgba` tem 4 bytes por pixel, linha a linha.
 * @throws {Error} se o arquivo não for um PNG suportado.
 */
export function decodificarPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(ASSINATURA)) throw new Error('não é um PNG');
  let largura = 0;
  let altura = 0;
  let profundidade = 0;
  let tipo = 0;
  let entrelacado = 0;
  let paleta = null;
  let transparencia = null;
  const dados = [];
  for (let pos = 8; pos + 8 <= buf.length; ) {
    const tamanho = buf.readUInt32BE(pos);
    const nome = buf.toString('latin1', pos + 4, pos + 8);
    const corpo = buf.subarray(pos + 8, pos + 8 + tamanho);
    if (nome === 'IHDR') {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);
      profundidade = corpo[8];
      tipo = corpo[9];
      entrelacado = corpo[12];
    } else if (nome === 'PLTE') paleta = corpo;
    else if (nome === 'tRNS') transparencia = corpo;
    else if (nome === 'IDAT') dados.push(corpo);
    else if (nome === 'IEND') break;
    pos += 12 + tamanho;
  }
  if (!CANAIS[tipo]) throw new Error(`tipo de cor PNG não suportado: ${tipo}`);
  if (profundidade !== 8) throw new Error(`profundidade PNG não suportada: ${profundidade}`);
  if (entrelacado) throw new Error('PNG entrelaçado não suportado');

  const canais = CANAIS[tipo];
  const linha = largura * canais;
  const cru = inflateSync(Buffer.concat(dados));
  const px = new Uint8Array(altura * linha);
  for (let y = 0; y < altura; y++) {
    const filtro = cru[y * (linha + 1)];
    const de = y * (linha + 1) + 1;
    const para = y * linha;
    for (let i = 0; i < linha; i++) {
      const x = cru[de + i];
      const a = i >= canais ? px[para + i - canais] : 0;
      const b = y > 0 ? px[para - linha + i] : 0;
      const c = y > 0 && i >= canais ? px[para - linha + i - canais] : 0;
      px[para + i] = (x + (filtro === 0 ? 0 : filtro === 1 ? a : filtro === 2 ? b : filtro === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
    }
  }

  const rgba = new Uint8Array(largura * altura * 4);
  for (let i = 0, n = largura * altura; i < n; i++) {
    const o = i * 4;
    if (tipo === 6) {
      rgba.set(px.subarray(i * 4, i * 4 + 4), o);
    } else if (tipo === 2) {
      rgba[o] = px[i * 3];
      rgba[o + 1] = px[i * 3 + 1];
      rgba[o + 2] = px[i * 3 + 2];
      rgba[o + 3] = 255;
    } else if (tipo === 0) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = px[i];
      rgba[o + 3] = 255;
    } else if (tipo === 4) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = px[i * 2];
      rgba[o + 3] = px[i * 2 + 1];
    } else {
      const k = px[i];
      rgba[o] = paleta[k * 3];
      rgba[o + 1] = paleta[k * 3 + 1];
      rgba[o + 2] = paleta[k * 3 + 2];
      rgba[o + 3] = transparencia && k < transparencia.length ? transparencia[k] : 255;
    }
  }
  return { largura, altura, rgba };
}
