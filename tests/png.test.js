import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodificarPng } from '../ferramentas/png.mjs';

/** CRC32 (necessário para montar um PNG válido nos testes). */
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function bloco(nome, corpo) {
  const cab = Buffer.alloc(8);
  cab.writeUInt32BE(corpo.length, 0);
  cab.write(nome, 4, 'latin1');
  const fim = Buffer.alloc(4);
  fim.writeUInt32BE(crc32(Buffer.concat([cab.subarray(4), corpo])), 0);
  return Buffer.concat([cab, corpo, fim]);
}

/** Monta um PNG 8 bits sem entrelaçamento a partir de linhas já filtradas (cada linha começa com o byte do filtro). */
function png(largura, altura, tipo, linhasFiltradas, extras = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = tipo;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    ...extras,
    bloco('IDAT', deflateSync(Buffer.from(linhasFiltradas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

test('PNG RGBA: filtros Nenhum, Sub, Up, Média e Paeth reconstroem os pixels', () => {
  // 2x5 pixels RGBA; cada linha usa um filtro diferente e guarda os mesmos valores originais
  const orig = [
    [10, 20, 30, 255, 40, 50, 60, 128],
    [11, 21, 31, 255, 41, 51, 61, 128],
    [12, 22, 32, 255, 42, 52, 62, 128],
    [13, 23, 33, 255, 43, 53, 63, 128],
    [14, 24, 34, 255, 44, 54, 64, 128],
  ];
  const linhas = [];
  const prev = (y, i) => (y > 0 ? orig[y - 1][i] : 0);
  const esq = (y, i) => (i >= 4 ? orig[y][i - 4] : 0);
  const canto = (y, i) => (y > 0 && i >= 4 ? orig[y - 1][i - 4] : 0);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  orig.forEach((linha, y) => {
    const filtro = y; // 0..4
    linhas.push(filtro);
    linha.forEach((v, i) => {
      const pred = [0, esq(y, i), prev(y, i), (esq(y, i) + prev(y, i)) >> 1, paeth(esq(y, i), prev(y, i), canto(y, i))][filtro];
      linhas.push((v - pred) & 255);
    });
  });
  const r = decodificarPng(png(2, 5, 6, linhas));
  assert.equal(r.largura, 2);
  assert.equal(r.altura, 5);
  assert.deepEqual([...r.rgba], orig.flat());
});

test('PNG RGB ganha alfa opaco e PNG com paleta usa tRNS', () => {
  const rgb = decodificarPng(png(1, 1, 2, [0, 200, 100, 50]));
  assert.deepEqual([...rgb.rgba], [200, 100, 50, 255]);
  const plte = bloco('PLTE', Buffer.from([255, 0, 0, 0, 255, 0]));
  const trns = bloco('tRNS', Buffer.from([0]));
  const pal = decodificarPng(png(2, 1, 3, [0, 0, 1], [plte, trns]));
  assert.deepEqual([...pal.rgba], [255, 0, 0, 0, 0, 255, 0, 255]);
});

test('arquivos que não são PNG suportado dão erro', () => {
  assert.throws(() => decodificarPng(Buffer.from('não sou um png')), /PNG/);
});
