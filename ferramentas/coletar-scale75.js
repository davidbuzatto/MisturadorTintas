/**
 * Coleta as cores de uma linha da Scale75 no Scalemates, para `ferramentas/scale75-lista.json`.
 *
 * O Scalemates recusa acesso fora do navegador (HTTP 403), por isso este script roda no console:
 *   1. abra a página da linha no navegador:
 *        https://www.scalemates.com/colors/scale75--683            (Scalecolor, Fantasy & Games, Warfront…)
 *        https://www.scalemates.com/colors/scalecolor-artist--888  (Scalecolor Artist)
 *   2. cole este arquivo no console (DevTools);
 *   3. o JSON da linha é copiado para a área de transferência: cole-o em `scale75-lista.json`, na chave
 *      com o nome da página (ex.: "scale75--683"), e rode `node ferramentas/extrair-scale75.mjs`.
 *
 * Cada cartão da lista traz código, nome, acabamento e uma amostra com a cor (a mesma do "Color viewer"
 * da página da tinta). Estojos, diluentes, pigmentos e tintas sem amostra no site ficam de fora.
 */
(() => {
  const hex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('');
  const vistos = new Set();
  const cores = [];
  for (const card of document.querySelectorAll('div.ac.dg')) {
    const amostra = card.querySelector('div.pr.dib');
    if (!amostra) continue;
    const [code, name] = card.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (vistos.has(code)) continue;
    vistos.add(code);
    cores.push({
      code,
      name,
      finish: card.querySelector('.ccf')?.textContent.trim() || '',
      hex: hex(getComputedStyle(amostra).backgroundColor),
    });
  }
  const chave = location.pathname.split('/').filter(Boolean).pop();
  copy(JSON.stringify(cores, null, 1)); // `copy` é do console do Chrome/Firefox
  console.log(`${cores.length} cores de "${chave}" copiadas para a área de transferência`);
})();
