/**
 * @module state/tenho
 * Marcação em lote das tintas "tenho" (usada pela janela de tintas, junto com a busca).
 * Funções puras sobre o mapa `{ codigo: true }` de uma linha de ingredientes.
 */

/**
 * Marca ou desmarca várias tintas de uma vez.
 * @param {Object<string, boolean>} mapa mapa "tenho" da linha (alterado).
 * @param {string[]} codigos códigos das tintas.
 * @param {boolean} marcar `true` para marcar, `false` para desmarcar.
 * @returns {number} quantas tintas realmente mudaram de estado.
 */
export function marcarEmLote(mapa, codigos, marcar) {
  let mudaram = 0;
  for (const codigo of codigos) {
    if (!!mapa[codigo] === marcar) continue;
    if (marcar) mapa[codigo] = true;
    else delete mapa[codigo];
    mudaram++;
  }
  return mudaram;
}

/**
 * Quantas das tintas dadas estão marcadas.
 * @param {Object<string, boolean>} mapa mapa "tenho" da linha.
 * @param {{code: string}[]} tintas tintas a conferir.
 * @returns {number}
 */
export function contarMarcadas(mapa, tintas) {
  return tintas.reduce((n, p) => n + (mapa[p.code] ? 1 : 0), 0);
}
