/**
 * @module color/deltaE
 * Diferença de cor perceptual CIEDE2000 (ΔE00).
 */

/**
 * Calcula a diferença de cor CIEDE2000 entre duas cores em L*a*b*.
 *
 * Interpretação usada na interface: &lt;1 imperceptível · 1–2 só lado a lado ·
 * 2–5 parecida · &gt;5 diferente.
 *
 * @param {number[]} a [L*, a*, b*] da primeira cor.
 * @param {number[]} b [L*, a*, b*] da segunda cor.
 * @returns {number} ΔE00 (0 = idênticas).
 */
export function dE00(a, b) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const C1 = Math.hypot(a[1], a[2]);
  const C2 = Math.hypot(b[1], b[2]);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
  const a1 = (1 + G) * a[1];
  const a2 = (1 + G) * b[1];
  const c1 = Math.hypot(a1, a[2]);
  const c2 = Math.hypot(a2, b[2]);
  let h1 = Math.atan2(a[2], a1) * deg;
  if (h1 < 0) h1 += 360;
  let h2 = Math.atan2(b[2], a2) * deg;
  if (h2 < 0) h2 += 360;
  const dL = b[0] - a[0];
  const dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh * rad) / 2);
  const Lm = (a[0] + b[0]) / 2;
  const cm = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) > 180) hm = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
    else hm = (h1 + h2) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hm - 30) * rad) +
    0.24 * Math.cos(2 * hm * rad) +
    0.32 * Math.cos((3 * hm + 6) * rad) -
    0.2 * Math.cos((4 * hm - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hm - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(cm, 7) / (Math.pow(cm, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lm - 50, 2)) / Math.sqrt(20 + Math.pow(Lm - 50, 2));
  const Sc = 1 + 0.045 * cm;
  const Sh = 1 + 0.015 * cm * T;
  const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt(
    Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh)
  );
}
