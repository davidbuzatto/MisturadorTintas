/**
 * Testes da internacionalização: os dois dicionários têm as mesmas chaves e marcadores, e toda
 * chave usada no código ou no HTML existe. Roda com: node --test tests/*.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import ptBR from '../js/i18n/pt-BR.js';
import en from '../js/i18n/en.js';
import { IDIOMAS, getLang, has, lineName, setLang, t, tn } from '../js/i18n/index.js';
import { INGREDIENT_SETS } from '../js/data/sets.js';
import { MODELS } from '../js/color/mixing.js';
import { REFERENCIAS } from '../js/ui/about.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));

/** Arquivos .js sob uma pasta (recursivo). */
function arquivosJs(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivosJs(caminho) : caminho.endsWith('.js') ? [caminho] : [];
  });
}

/** Marcadores {nome} de um texto, ordenados. */
const marcadores = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('os dois dicionários têm exatamente as mesmas chaves', () => {
  const pt = Object.keys(ptBR).sort();
  const ing = Object.keys(en).sort();
  assert.deepEqual(pt.filter((k) => !(k in en)), [], 'chaves só em pt-BR');
  assert.deepEqual(ing.filter((k) => !(k in ptBR)), [], 'chaves só em en');
});

test('os dois dicionários usam os mesmos marcadores {variavel} em cada texto', () => {
  for (const k of Object.keys(ptBR)) {
    assert.equal(marcadores(en[k]), marcadores(ptBR[k]), `marcadores diferentes em "${k}"`);
  }
});

test('nenhum texto está vazio e o HTML embutido tem tags balanceadas', () => {
  for (const [nome, dic] of [['pt-BR', ptBR], ['en', en]]) {
    for (const [k, v] of Object.entries(dic)) {
      assert.ok(v.trim().length > 0, `${nome}: "${k}" vazio`);
      for (const tag of ['b', 'a']) {
        const abre = (v.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
        const fecha = (v.match(new RegExp(`</${tag}>`, 'g')) || []).length;
        assert.equal(abre, fecha, `${nome}: tag <${tag}> desbalanceada em "${k}"`);
      }
    }
  }
});

test('toda chave usada no código (t, tn, has) existe', () => {
  const usadas = new Set();
  for (const arq of arquivosJs(join(raiz, 'js'))) {
    if (arq.includes(`${join('js', 'i18n')}`)) continue;
    const src = readFileSync(arq, 'utf8');
    for (const m of src.matchAll(/\b(?:t|has)\(\s*(['`])([\w.-]+)\1/g)) usadas.add(m[2]);
    for (const m of src.matchAll(/\btn\(\s*'([\w.-]+)'/g)) {
      usadas.add(`${m[1]}.um`);
      usadas.add(`${m[1]}.outros`);
    }
  }
  assert.ok(usadas.size > 40, `esperava dezenas de chaves, achei ${usadas.size}`);
  for (const k of usadas) assert.ok(k in ptBR, `chave "${k}" usada no código não existe`);
});

test('toda chave referenciada no HTML (data-i18n*) existe', () => {
  const html = readFileSync(join(raiz, 'index.html'), 'utf8');
  const chaves = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([\w.-]+)"/g)].map((m) => m[1]);
  assert.ok(chaves.length > 40, `esperava dezenas de chaves no HTML, achei ${chaves.length}`);
  for (const k of chaves) assert.ok(k in ptBR, `chave "${k}" do HTML não existe`);
});

test('chaves montadas dinamicamente (ΔE, modelos, química, linhas, referências) existem', () => {
  for (let i = 0; i <= 5; i++) assert.ok(`de.${i}` in ptBR, `de.${i}`);
  for (const [id] of MODELS) {
    assert.ok(`model.${id}` in ptBR, `model.${id}`);
    assert.ok(`model.${id}.short` in ptBR, `model.${id}.short`);
  }
  for (const s of INGREDIENT_SETS) assert.ok(`chem.${s.quimica}` in ptBR, `chem.${s.quimica}`);
  for (const [chave] of REFERENCIAS) assert.ok(chave in ptBR, chave);
  // as linhas de dados com nome traduzido e os rótulos de linhas de ingredientes traduzidos
  assert.ok('line.Acrylic' in ptBR);
  for (const k of Object.keys(ptBR).filter((x) => x.startsWith('set.'))) {
    assert.ok(INGREDIENT_SETS.some((s) => `set.${s.id}` === k), `${k} não corresponde a nenhuma linha`);
  }
});

test('referências: endereços https únicos e bem formados', () => {
  const urls = REFERENCIAS.map(([, url]) => url);
  assert.equal(new Set(urls).size, urls.length, 'endereços repetidos');
  for (const u of urls) assert.match(u, /^https:\/\/[\w.-]+\.[a-z]{2,}\/\S*$/, u);
});

test('t, tn, has, lineName e setLang', () => {
  assert.deepEqual(IDIOMAS.map(([c]) => c), ['pt-BR', 'en']);
  setLang('pt-BR');
  assert.equal(getLang(), 'pt-BR');
  assert.equal(t('mix.add'), '+ adicionar tinta');
  assert.equal(t('mix.sum', { n: 100 }), 'soma das quantidades: 100');
  assert.equal(tn('sug.count', 1), '1 tinta');
  assert.equal(tn('sug.count', 3), '3 tintas');
  assert.equal(lineName('Acrylic'), 'Acrílica');
  assert.equal(lineName('Model Air'), 'Model Air'); // nome comercial: igual em todos os idiomas
  setLang('en');
  assert.equal(t('mix.add'), '+ add paint');
  assert.equal(tn('sug.count', 1), '1 paint');
  assert.equal(tn('sug.count', 2), '2 paints');
  assert.equal(lineName('Acrylic'), 'Acrylic');
  // chave inexistente devolve a própria chave; marcador sem valor fica como está
  assert.equal(t('nao.existe'), 'nao.existe');
  assert.equal(t('mix.sum'), 'sum of amounts: {n}');
  assert.equal(has('nao.existe'), false);
  // idioma desconhecido volta ao padrão
  assert.equal(setLang('xx'), 'pt-BR');
  setLang('pt-BR');
});
