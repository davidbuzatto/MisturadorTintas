/**
 * Testes de equivalência: o motor modular deve reproduzir exatamente os
 * valores gravados em `golden.json` (gerados pelo motor original antes da
 * refatoração). Roda com o executor nativo do Node, sem dependências:
 *
 *     node --test tests/*.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fitHex } from '../js/color/spectral.js';
import { mixHex, mixLin } from '../js/color/mixing.js';
import { dE00 } from '../js/color/deltaE.js';
import { hex2lab } from '../js/color/convert.js';
import { suggest } from '../js/color/suggest.js';
import { ANCHOR_CODES } from '../js/data/catalogs.js';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(here, 'golden.json'), 'utf8'));
const acr = golden.CATALOGS.acrilex;
const byCode = Object.fromEntries(acr.map((p) => [p.code, p]));

test('ajuste espectral (fitHex) idêntico ao original', () => {
  for (const [hex, g] of Object.entries(golden.fits)) {
    const f = fitHex(hex);
    assert.deepEqual(Array.from(f.R), g.R, `R de ${hex}`);
    assert.deepEqual(Array.from(f.ks), g.ks, `K/S de ${hex}`);
    assert.deepEqual(f.resid, g.resid, `resíduo de ${hex}`);
    assert.equal(f.Y, g.Y);
    assert.equal(f.S, g.S);
    assert.equal(f.err, g.err);
  }
});

test('misturas (4 modelos × 4 receitas) idênticas ao original', () => {
  for (const m of golden.mixes) {
    const items = m.recipe.map(([c, v, s]) => ({ p: fitHex(byCode[c].hex), w: v * s }));
    assert.equal(mixHex(items, m.model), m.hex, `${m.model} ${JSON.stringify(m.recipe)}`);
    assert.deepEqual(mixLin(items, m.model), m.lin);
  }
});

test('ΔE00 idêntico ao original', () => {
  for (const d of golden.de) assert.equal(dE00(hex2lab(d.a), hex2lab(d.b)), d.v, `${d.a} ${d.b}`);
});

test('sugestão automática idêntica ao original', () => {
  const P = acr.map((p) => ({ code: p.code, fit: fitHex(p.hex), anchor: ANCHOR_CODES.includes(p.code) }));
  for (const s of golden.sug) {
    const res = suggest(P, s.target, s.maxN).map((r) => ({
      codes: r.idx.map((i) => P[i].code),
      ws: r.ws,
      de: r.de,
    }));
    assert.deepEqual(res, s.res, `alvo ${s.target}`);
  }
});
