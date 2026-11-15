/**
 * @module color/spectral
 * Reflectância espectral: converte um hex em uma curva de reflectância suave
 * (ajustada numericamente) e a curva de volta em cor.
 *
 * O espectro é amostrado de 380 a 730 nm em passos de 10 nm (36 bandas).
 * A cor é obtida com as funções de casamento de cor CIE 1931 aproximadas por
 * Wyman et al. (2013) ponderadas pelo iluminante D65.
 */

import {
  XN, YN, ZN,
  hex2lin, lin2lab, xyz2lab, xyz2lin,
} from './convert.js';
import { nelderMead } from './optimize.js';

/** Comprimentos de onda amostrados (nm). */
export const WL = [];
for (let l = 380; l <= 730; l += 10) WL.push(l);

/** Número de bandas espectrais. */
export const NB = WL.length;

/** Gaussiana assimétrica usada nas aproximações de Wyman. */
function gauss(l, mu, s1, s2) {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
}

/** Potência espectral relativa do iluminante D65 nas bandas de WL. */
const D65 = [
  49.98, 54.65, 82.75, 91.49, 93.43, 86.68, 104.86, 117.01, 117.81, 114.86, 115.92, 108.81,
  109.35, 107.8, 104.79, 107.69, 104.41, 104.05, 100.0, 96.33, 95.79, 88.69, 90.01, 89.6, 87.7,
  83.29, 83.7, 80.03, 80.21, 82.28, 78.28, 69.72, 71.61, 74.35, 61.6, 69.89,
];

// Funções de casamento de cor x̄, ȳ, z̄ já multiplicadas por D65.
const WX = WL.map(
  (l, i) =>
    (1.056 * gauss(l, 599.8, 37.9, 31.0) +
      0.362 * gauss(l, 442.0, 16.0, 26.7) -
      0.065 * gauss(l, 501.1, 20.4, 26.2)) *
    D65[i]
);
const WY = WL.map(
  (l, i) => (0.821 * gauss(l, 568.8, 46.9, 40.5) + 0.286 * gauss(l, 530.9, 16.3, 31.1)) * D65[i]
);
const WZ = WL.map(
  (l, i) => (1.217 * gauss(l, 437.0, 11.8, 36.0) + 0.681 * gauss(l, 459.0, 26.0, 13.8)) * D65[i]
);
// Somas usadas para normalizar o branco (R = 1 em todas as bandas → XN, YN, ZN).
const SX = WX.reduce((a, b) => a + b, 0);
const SY = WY.reduce((a, b) => a + b, 0);
const SZ = WZ.reduce((a, b) => a + b, 0);

/**
 * Integra uma reflectância contra as funções de cor → XYZ.
 * @param {ArrayLike<number>} R reflectância por banda (0..1).
 * @returns {number[]} [X, Y, Z].
 */
export function spec2xyz(R) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < NB; i++) {
    x += R[i] * WX[i];
    y += R[i] * WY[i];
    z += R[i] * WZ[i];
  }
  return [(x / SX) * XN, (y / SY) * YN, (z / SZ) * ZN];
}

/**
 * Reflectância → RGB linear.
 * @param {ArrayLike<number>} R reflectância por banda.
 * @returns {number[]} [r, g, b] linear.
 */
export function spec2lin(R) {
  const x = spec2xyz(R);
  return xyz2lin(x[0], x[1], x[2]);
}

/**
 * Gera uma reflectância suave a partir de 3 coeficientes (sigmoide de um
 * polinômio de grau 2). Os valores ficam limitados a [0,0005; 0,9995].
 *
 * @param {number[]} c coeficientes [c0, c1, c2].
 * @param {Float64Array} [out] vetor de saída reutilizável.
 * @returns {Float64Array} reflectância por banda.
 */
export function specFromCoefs(c, out) {
  out = out || new Float64Array(NB);
  for (let i = 0; i < NB; i++) {
    const t = (WL[i] - 380) / 350;
    const x = (c[0] * t + c[1]) * t + c[2];
    let R = 0.5 + x / (2 * Math.sqrt(1 + x * x));
    out[i] = R < 0.0005 ? 0.0005 : R > 0.9995 ? 0.9995 : R;
  }
  return out;
}

/**
 * @typedef {Object} PaintFit
 * @property {string} hex   cor original (minúscula).
 * @property {number[]} lin cor original em RGB linear.
 * @property {Float64Array} R   reflectância ajustada.
 * @property {Float64Array} ks  razão K/S por banda: (1-R)² / 2R.
 * @property {number[]} resid   diferença (original − reconstruída) em RGB linear;
 *                              somada à mistura para a tinta pura voltar ao hex exato.
 * @property {number} Y     luminância da cor original.
 * @property {number} S     coeficiente de espalhamento estimado: 0,05 + 0,95·Y^0,7.
 * @property {number} err   raiz do erro quadrático (em Lab) do ajuste.
 */

const fitCache = new Map();

/**
 * Ajusta uma reflectância espectral a um hex (com cache por cor).
 *
 * Procura os 3 coeficientes que minimizam a distância em Lab entre a cor
 * reconstruída e o hex, com uma pequena regularização. Usa um gerador
 * pseudoaleatório determinístico para os reinícios, então o resultado é
 * sempre o mesmo para o mesmo hex.
 *
 * @param {string} hex cor "#rrggbb".
 * @returns {PaintFit} ajuste da tinta.
 */
export function fitHex(hex) {
  hex = hex.toLowerCase();
  if (fitCache.has(hex)) return fitCache.get(hex);
  const lin = hex2lin(hex);
  const tl = lin2lab(lin);
  const buf = new Float64Array(NB);
  const obj = (c) => {
    specFromCoefs(c, buf);
    const x = spec2xyz(buf);
    const l = xyz2lab(x[0], x[1], x[2]);
    return (
      (l[0] - tl[0]) ** 2 + (l[1] - tl[1]) ** 2 + (l[2] - tl[2]) ** 2 +
      1e-6 * (c[0] * c[0] + c[1] * c[1] + c[2] * c[2])
    );
  };
  let best = nelderMead(obj, [0, 0, 0], 20, 160);
  // gerador congruencial linear determinístico para os reinícios
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let k = 0; k < 8 && best.f > 0.4; k++) {
    const x0 = [(rnd() - 0.5) * 160, (rnd() - 0.5) * 160, (rnd() - 0.5) * 40];
    const r = nelderMead(obj, x0, 15, 160);
    if (r.f < best.f) best = r;
  }
  best = nelderMead(obj, best.x, 2, 200);
  const R = specFromCoefs(best.x);
  const ks = new Float64Array(NB);
  for (let i = 0; i < NB; i++) ks[i] = ((1 - R[i]) * (1 - R[i])) / (2 * R[i]);
  const fl = spec2lin(R);
  const Y = 0.2126729 * lin[0] + 0.7151522 * lin[1] + 0.072175 * lin[2];
  const fit = {
    hex,
    lin,
    R,
    ks,
    resid: [lin[0] - fl[0], lin[1] - fl[1], lin[2] - fl[2]],
    Y,
    S: 0.05 + 0.95 * Math.pow(Math.max(Y, 0), 0.7),
    err: Math.sqrt(best.f),
  };
  fitCache.set(hex, fit);
  return fit;
}
