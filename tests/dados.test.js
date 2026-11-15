/**
 * Validação dos arquivos de dados em `dados/`: formato dos registros, hex
 * válido e códigos únicos. Roda com: node --test tests/*.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (arquivo) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${arquivo}`, import.meta.url)), 'utf8'));
const HEX = /^#[0-9a-f]{6}$/;

test('FS 595: registros completos, hex válido e códigos únicos', () => {
  const cores = ler('fs595-cores.json');
  assert.ok(cores.length >= 600, `esperava ~650 cores, veio ${cores.length}`);
  for (const c of cores) {
    assert.match(c.code, /^\d{5}$/, `código ${c.code}`);
    assert.match(c.hex, HEX, `hex de ${c.code}`);
    assert.ok(['Gloss', 'Semi-gloss', 'Flat'].includes(c.finish), `acabamento de ${c.code}: ${c.finish}`);
    assert.equal(typeof c.name, 'string');
  }
  const codigos = cores.map((c) => c.code);
  assert.equal(new Set(codigos).size, codigos.length, 'códigos repetidos');
});

test('FS 595: o 1º dígito do código é coerente com o acabamento', () => {
  const porDigito = { 1: 'Gloss', 2: 'Semi-gloss', 3: 'Flat' };
  for (const c of ler('fs595-cores.json')) {
    assert.equal(c.finish, porDigito[c.code[0]], `${c.code} (${c.finish})`);
  }
});

test('catálogos existentes: hex válido', () => {
  for (const arquivo of ['acrilex-cores-oficial.json', 'tamiya-cores-oficial.json', 'revell-cores-oficial.json']) {
    for (const c of ler(arquivo)) if (c.hex) assert.match(c.hex, HEX, `${arquivo} ${c.code || c.sku}`);
  }
});

test('buildCatalogs: catálogos antigos inalterados e Tamiya dividido sem perda', async () => {
  const { buildCatalogs, normalizeTab } = await import('../js/data/catalogs.js');
  const golden = JSON.parse(readFileSync(fileURLToPath(new URL('./golden.json', import.meta.url)), 'utf8')).CATALOGS;
  const cat = buildCatalogs({
    ac: ler('acrilex-cores-oficial.json'),
    tm: ler('tamiya-cores-oficial.json'),
    rv: ler('revell-cores-oficial.json'),
    fs: ler('fs595-cores.json'),
  });
  assert.deepEqual(cat.acrilex, golden.acrilex);
  assert.deepEqual(cat.revellA, golden.revellA);
  assert.deepEqual(cat.revellE, golden.revellE);
  // Tamiya: união das duas partes == catálogo único original (mesma ordem relativa)
  assert.equal(cat.tamiyaL.length, 79);
  assert.equal(cat.tamiyaA.length, 102);
  assert.ok(cat.tamiyaL.every((p) => p.code.startsWith('LP-')));
  assert.ok(cat.tamiyaA.every((p) => /^XF?-/.test(p.code)));
  const chave = (p) => p.code;
  assert.deepEqual([...cat.tamiyaL, ...cat.tamiyaA].map(chave).sort(), golden.tamiya.map(chave).sort());
  assert.deepEqual([...cat.tamiyaL, ...cat.tamiyaA].sort((a, b) => a.code.localeCompare(b.code)),
    [...golden.tamiya].sort((a, b) => a.code.localeCompare(b.code)));
  // migração da aba salva
  assert.equal(normalizeTab('tamiya'), 'tamiyaA');
  assert.equal(normalizeTab('revellE'), 'revellE');
  assert.equal(normalizeTab('inexistente'), 'tamiyaA');
});
