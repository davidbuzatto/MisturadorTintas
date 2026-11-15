/**
 * @module color/suggest
 * Busca automática de receitas: dado um alvo, procura combinações de 1 a 4
 * tintas (e suas proporções) que minimizam o ΔE00 com o modelo Kubelka-Munk.
 */

import { hex2lab, lin2lab, labOfLin } from './convert.js';
import { dE00 } from './deltaE.js';
import { mixLin } from './mixing.js';

/**
 * @typedef {Object} SuggestPaint
 * @property {string} code  código da tinta.
 * @property {import('./spectral.js').PaintFit} fit  ajuste espectral.
 * @property {boolean} anchor  tinta "âncora" (branco, preto, primárias) sempre
 *                             incluída nos conjuntos candidatos.
 */

/**
 * @typedef {Object} Suggestion
 * @property {number[]} idx  índices (em `paints`) das tintas usadas.
 * @property {number[]} ws   proporção de cada tinta (soma 1).
 * @property {number} de     ΔE00 entre a mistura e o alvo.
 */

/**
 * Procura as melhores receitas para uma cor-alvo.
 *
 * Estratégia: melhor tinta pura; depois busca em grade (passos de 5% para 2 e
 * 3 tintas, 10% para 4) sobre um conjunto reduzido de candidatas (as mais
 * próximas do alvo mais as âncoras); por fim refina cada resultado movendo
 * 1% de peso entre pares de tintas enquanto o ΔE00 diminuir.
 *
 * @param {SuggestPaint[]} paints tintas disponíveis.
 * @param {string} targetHex cor-alvo "#rrggbb".
 * @param {number} maxN número máximo de tintas na receita (1 a 4).
 * @returns {Suggestion[]} uma sugestão por quantidade de tintas (1, 2, 3, …).
 */
export function suggest(paints, targetHex, maxN) {
  const tl = hex2lab(targetHex);
  const P = paints;

  // ΔE00 da mistura (modelo km) das tintas `idxs` com pesos `ws`.
  const evaluate = (idxs, ws) => {
    const items = idxs.map((i, k) => ({ p: P[i].fit, w: ws[k] }));
    return dE00(tl, labOfLin(mixLin(items, 'km')));
  };

  const results = [];

  // 1 tinta: a mais próxima do alvo.
  const dist1 = P.map((p, i) => ({ i, d: dE00(tl, lin2lab(p.fit.lin)) })).sort((a, b) => a.d - b.d);
  results.push({ idx: [dist1[0].i], ws: [1], de: dist1[0].d });

  // Busca em grade: combinações de `n` tintas do `pool`, pesos múltiplos de `step`.
  function gridSearch(pool, n, step) {
    let best = { de: 1e9 };
    const units = Math.round(1 / step);
    const rec = (start, chosen) => {
      if (chosen.length === n) {
        const weights = (pos, left, cur) => {
          if (pos === n - 1) {
            cur[pos] = left;
            if (left < 1) return;
            const d = evaluate(chosen, cur.map((v) => v / units));
            if (d < best.de) best = { de: d, idx: chosen.slice(), ws: cur.map((v) => v / units) };
            return;
          }
          for (let v = 1; v <= left - (n - 1 - pos); v++) {
            cur[pos] = v;
            weights(pos + 1, left - v, cur);
          }
        };
        weights(0, units, new Array(n).fill(0));
        return;
      }
      for (let a = start; a < pool.length; a++) {
        chosen.push(pool[a]);
        rec(a + 1, chosen);
        chosen.pop();
      }
    };
    rec(0, []);
    return best;
  }

  const allIdx = P.map((_, i) => i);
  if (maxN >= 2 && P.length >= 2) {
    const b = gridSearch(allIdx, 2, 0.05);
    if (b.idx) results.push(b);
  }
  const anchors = [];
  P.forEach((p, i) => {
    if (p.anchor) anchors.push(i);
  });
  // candidatas: as `k` mais próximas do alvo + âncoras
  const poolN = (k) => {
    const s = new Set(dist1.slice(0, k).map((o) => o.i));
    anchors.forEach((a) => s.add(a));
    return [...s];
  };
  if (maxN >= 3 && P.length >= 3) {
    const b = gridSearch(poolN(20), 3, 0.05);
    if (b.idx) results.push(b);
  }
  if (maxN >= 4 && P.length >= 4) {
    const b = gridSearch(poolN(14), 4, 0.1);
    if (b.idx) results.push(b);
  }

  // Refino local: transfere 1% de peso entre pares enquanto melhorar.
  for (const r of results) {
    if (r.idx.length < 2) continue;
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      for (let a = 0; a < r.idx.length; a++) {
        for (let b = 0; b < r.idx.length; b++) {
          if (a === b) continue;
          if (r.ws[a] <= 0.0101) continue;
          const w = r.ws.slice();
          w[a] -= 0.01;
          w[b] += 0.01;
          const d = evaluate(r.idx, w);
          if (d < r.de - 1e-6) {
            r.ws = w;
            r.de = d;
            improved = true;
          }
        }
      }
    }
  }
  return results;
}
