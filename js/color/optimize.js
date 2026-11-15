/**
 * @module color/optimize
 * Otimização numérica sem derivadas (Nelder-Mead).
 */

/**
 * Minimiza `f` pelo método simplex de Nelder-Mead.
 *
 * @param {(x: number[]) => number} f função objetivo.
 * @param {number[]} x0 ponto inicial.
 * @param {number} step tamanho do passo usado para montar o simplex inicial.
 * @param {number} iters número fixo de iterações.
 * @returns {{x: number[], f: number}} melhor ponto encontrado e seu valor.
 */
export function nelderMead(f, x0, step, iters) {
  const n = x0.length;
  let S = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += step;
    S.push(p);
  }
  let F = S.map(f);
  for (let it = 0; it < iters; it++) {
    const idx = F.map((_, i) => i).sort((a, b) => F[a] - F[b]);
    S = idx.map((i) => S[i]);
    F = idx.map((i) => F[i]);
    // centróide de todos os pontos exceto o pior
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const w = S[n];
    const xr = c.map((v, j) => v + (v - w[j]));
    const fr = f(xr);
    if (fr < F[0]) {
      // expansão
      const xe = c.map((v, j) => v + 2 * (v - w[j]));
      const fe = f(xe);
      if (fe < fr) {
        S[n] = xe;
        F[n] = fe;
      } else {
        S[n] = xr;
        F[n] = fr;
      }
    } else if (fr < F[n - 1]) {
      // reflexão
      S[n] = xr;
      F[n] = fr;
    } else {
      // contração; se falhar, encolhe o simplex em direção ao melhor ponto
      const xc = c.map((v, j) => v + 0.5 * (w[j] - v));
      const fc = f(xc);
      if (fc < F[n]) {
        S[n] = xc;
        F[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j]));
          F[i] = f(S[i]);
        }
      }
    }
  }
  let b = 0;
  for (let i = 1; i <= n; i++) if (F[i] < F[b]) b = i;
  return { x: S[b], f: F[b] };
}
