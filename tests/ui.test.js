/**
 * Testes dos auxiliares de interface que não dependem de um navegador (usam um elemento falso).
 * Roda com: node --test tests/*.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ativavel, deText, esc } from '../js/ui/dom.js';
import { setLang } from '../js/i18n/index.js';

/** Elemento mínimo que guarda os ouvintes de evento e os atributos. */
function elementoFalso() {
  const ouvintes = {};
  const atributos = {};
  return {
    tabIndex: -1,
    ouvintes,
    atributos,
    setAttribute: (k, v) => { atributos[k] = v; },
    addEventListener: (tipo, fn) => { (ouvintes[tipo] ||= []).push(fn); },
    dispara(tipo, evento = {}) {
      (ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },
  };
}

test('ativavel: o elemento vira botão e responde ao clique do mouse', () => {
  const el = elementoFalso();
  let cliques = 0;
  ativavel(el, () => cliques++);
  assert.equal(el.tabIndex, 0, 'precisa ser focável por Tab');
  assert.equal(el.atributos.role, 'button');
  assert.ok(el.ouvintes.click?.length === 1, 'sem ouvinte de clique (o mouse deixaria de funcionar)');
  el.dispara('click');
  assert.equal(cliques, 1);
});

test('ativavel: Enter e Espaço ativam; outras teclas não; T aciona a ação alternativa', () => {
  const el = elementoFalso();
  let principal = 0;
  let alternativa = 0;
  ativavel(el, () => principal++, () => alternativa++);
  el.dispara('keydown', { key: 'Enter' });
  el.dispara('keydown', { key: ' ' });
  assert.equal(principal, 2);
  el.dispara('keydown', { key: 'a' });
  el.dispara('keydown', { key: 'Tab' });
  assert.equal(principal, 2);
  assert.equal(alternativa, 0);
  el.dispara('keydown', { key: 't' });
  el.dispara('keydown', { key: 'T' });
  assert.equal(alternativa, 2);
  assert.equal(principal, 2);
});

test('ativavel: sem ação alternativa a tecla T não faz nada', () => {
  const el = elementoFalso();
  let n = 0;
  ativavel(el, () => n++);
  el.dispara('keydown', { key: 't' });
  assert.equal(n, 0);
});

test('esc escapa HTML e deText descreve o ΔE nos dois idiomas', () => {
  // escapa &, < e " (o > não precisa)
  assert.equal(esc('<a href="x">&'), '&lt;a href=&quot;x&quot;>&amp;');
  setLang('pt-BR');
  assert.equal(deText(0.5), 'imperceptível');
  assert.equal(deText(1.5), 'só lado a lado');
  assert.equal(deText(3), 'muito parecida');
  assert.equal(deText(4), 'parecida');
  assert.equal(deText(7), 'diferente');
  assert.equal(deText(20), 'bem diferente');
  setLang('en');
  assert.equal(deText(0.5), 'imperceptible');
  assert.equal(deText(20), 'very different');
  setLang('pt-BR');
});

test('guia passo a passo: o exemplo (Tamiya XF-18) existe nos dados e rende uma boa receita com a Acrilex', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { buildCatalogs } = await import('../js/data/catalogs.js');
  const { buildSets } = await import('../js/data/sets.js');
  const { suggest } = await import('../js/color/suggest.js');
  const { EXEMPLO } = await import('../js/ui/help.js');
  const ler = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${f}`, import.meta.url)), 'utf8'));
  const cat = buildCatalogs({
    ac: ler('acrilex-cores-oficial.json'), tm: ler('tamiya-cores-oficial.json'), rv: ler('revell-cores-oficial.json'),
    fs: ler('fs595-cores.json'), vl: ler('vallejo-cores.json'), mr: ler('mrcolor-cores.json'), hb: ler('humbrol-cores.json'),
    ral: ler('ral-cores.json'), ak: ler('ak-cores.json'), am: ler('ammo-cores.json'),
  });
  const alvo = cat[EXEMPLO.tab].find((p) => p.code === EXEMPLO.code);
  assert.ok(alvo, 'a cor do exemplo sumiu dos dados');
  assert.equal(alvo.name, 'Medium Blue');
  assert.equal(alvo.line, 'Acrylic'); // o texto do passo 2 manda deixar a linha "Acrílica"
  const set = buildSets(cat).prepare('acrilex'); // linha padrão do exemplo
  const P = set.paints.map((p) => ({ code: p.code, fit: p.fit, anchor: set.anchors.has(p.code) }));
  const receitas = suggest(P, alvo.hex, 3);
  assert.ok(receitas.length >= 2, 'o passo 3 promete receitas de várias tintas');
  assert.ok(receitas.some((r) => r.idx.length >= 2 && r.de < 2), 'esperava uma receita de 2+ tintas com ΔE < 2');
});
