import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBackup, lerBackup, mesclarBackup, tenhoLimpo, APP_ID, VERSAO_BACKUP } from '../js/state/backup.js';
import { marcarEmLote, contarMarcadas } from '../js/state/tenho.js';

const rec = (name, v = 5) => ({ date: '2026-01-01', name, mix: '#112233', target: { hex: '#aabbcc' }, ing: [{ code: 'A', v }] });

test('criarBackup: formato, versão e só marcas verdadeiras', () => {
  const b = criarBackup({ hist: [rec('x')], own: { l1: { A: true, B: false }, l2: {} } }, new Date('2026-02-03T00:00:00Z'));
  assert.equal(b.app, APP_ID);
  assert.equal(b.versao, VERSAO_BACKUP);
  assert.equal(b.exportadoEm, '2026-02-03T00:00:00.000Z');
  assert.deepEqual(b.tenho, { l1: { A: true } });
  assert.equal(b.receitas.length, 1);
});

test('tenhoLimpo ignora entradas inválidas', () => {
  assert.deepEqual(tenhoLimpo({ a: null, b: 'x', c: { Z: true } }), { c: { Z: true } });
  assert.deepEqual(tenhoLimpo(undefined), {});
});

test('lerBackup: formato novo, antigo, inválidos e erros', () => {
  const novo = lerBackup(JSON.stringify({ receitas: [rec('a'), { lixo: 1 }], tenho: { l1: { A: true } } }));
  assert.equal(novo.receitas.length, 1);
  assert.equal(novo.ignoradas, 1);
  assert.deepEqual(novo.tenho, { l1: { A: true } });
  const antigo = lerBackup(JSON.stringify([rec('a'), rec('b')]));
  assert.equal(antigo.receitas.length, 2);
  assert.deepEqual(antigo.tenho, {});
  assert.throws(() => lerBackup('não é json'));
  assert.throws(() => lerBackup('{"x":1}'));
});

test('mesclarBackup: soma sem duplicar, une "tenho" e ignora tintas desconhecidas', () => {
  const state = { hist: [rec('velha')], own: { l1: { A: true } } };
  const dados = lerBackup(JSON.stringify({ receitas: [rec('velha'), rec('nova')], tenho: { l1: { A: true, B: true }, l9: { Q: true } } }));
  const existe = (linha) => linha !== 'l9';
  const r1 = mesclarBackup(state, dados, existe);
  assert.deepEqual(r1, { receitasNovas: 1, tintasNovas: 1, linhas: 1, tintasIgnoradas: 1 });
  assert.equal(state.hist.length, 2);
  assert.equal(state.hist[0].name, 'nova');
  assert.deepEqual(state.own, { l1: { A: true, B: true } });
  const r2 = mesclarBackup(state, dados, existe);
  assert.deepEqual(r2, { receitasNovas: 0, tintasNovas: 0, linhas: 0, tintasIgnoradas: 1 });
  assert.equal(state.hist.length, 2);
});

test('marcarEmLote e contarMarcadas', () => {
  const mapa = { A: true };
  assert.equal(marcarEmLote(mapa, ['A', 'B', 'C'], true), 2);
  assert.equal(contarMarcadas(mapa, [{ code: 'A' }, { code: 'B' }, { code: 'Z' }]), 2);
  assert.equal(marcarEmLote(mapa, ['A', 'Z'], false), 1);
  assert.deepEqual(mapa, { B: true, C: true });
});
