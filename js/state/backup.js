/**
 * @module state/backup
 * Backup do que o usuário construiu: **receitas salvas** e **tintas "tenho"** (por linha de ingredientes).
 *
 * Formato (versão 2):
 *   { app: "misturador-tintas", versao: 2, exportadoEm: "<ISO>",
 *     receitas: [ ...receitas... ],
 *     tenho: { "<id da linha>": { "<código da tinta>": true, ... }, ... } }
 *
 * A importação também aceita o formato antigo (versão 1: só a lista de receitas) e **soma** ao que já existe,
 * sem substituir nem duplicar. Para começar do zero, use "Restaurar configurações" antes.
 * Tudo aqui é puro (sem DOM), para poder ser testado no Node.
 */

/** Identificador gravado no arquivo, para reconhecê-lo na importação. */
export const APP_ID = 'misturador-tintas';
/** Versão atual do formato do backup. */
export const VERSAO_BACKUP = 2;

/** Cópia profunda de dados simples (JSON). */
const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * Mapa "tenho" só com as marcas verdadeiras (descarta `false` e linhas vazias).
 * @param {Object<string, Object<string, boolean>>} own estado `own`.
 * @returns {Object<string, Object<string, true>>}
 */
export function tenhoLimpo(own) {
  const saida = {};
  for (const [linha, mapa] of Object.entries(own || {})) {
    if (!mapa || typeof mapa !== 'object') continue;
    const marcadas = Object.keys(mapa).filter((codigo) => mapa[codigo] === true);
    if (marcadas.length) saida[linha] = Object.fromEntries(marcadas.map((c) => [c, true]));
  }
  return saida;
}

/**
 * Monta o conteúdo do arquivo de backup a partir do estado.
 * @param {{hist: object[], own: object}} state estado da aplicação.
 * @param {Date} [agora] data do backup (para teste).
 * @returns {{app: string, versao: number, exportadoEm: string, receitas: object[], tenho: object}}
 */
export function criarBackup(state, agora = new Date()) {
  return {
    app: APP_ID,
    versao: VERSAO_BACKUP,
    exportadoEm: agora.toISOString(),
    receitas: clone(state.hist),
    tenho: tenhoLimpo(state.own),
  };
}

/** Receita com a forma mínima que o app precisa para exibi-la e carregá-la. */
function receitaValida(r) {
  return (
    r && typeof r === 'object' &&
    Array.isArray(r.ing) && r.ing.every((i) => i && typeof i.code === 'string' && Number.isFinite(i.v)) &&
    r.target && typeof r.target.hex === 'string' && /^#[0-9a-f]{6}$/i.test(r.target.hex) &&
    typeof r.mix === 'string'
  );
}

/**
 * Interpreta o texto de um arquivo de backup (versão 2) ou de uma lista antiga de receitas (versão 1).
 * Itens inválidos são descartados e contados em `ignoradas`.
 *
 * @param {string} texto conteúdo do arquivo.
 * @returns {{receitas: object[], tenho: Object<string, Object<string, true>>, ignoradas: number}}
 * @throws {SyntaxError|Error} se não for JSON ou não tiver o formato esperado.
 */
export function lerBackup(texto) {
  const dados = JSON.parse(texto);
  let receitasBrutas;
  let tenhoBruto = {};
  if (Array.isArray(dados)) {
    receitasBrutas = dados; // formato antigo: só receitas
  } else if (dados && typeof dados === 'object' && (Array.isArray(dados.receitas) || (dados.tenho && typeof dados.tenho === 'object'))) {
    receitasBrutas = Array.isArray(dados.receitas) ? dados.receitas : [];
    tenhoBruto = dados.tenho || {};
  } else {
    throw new Error('formato desconhecido');
  }
  const receitas = receitasBrutas.filter(receitaValida);
  return { receitas: clone(receitas), tenho: tenhoLimpo(tenhoBruto), ignoradas: receitasBrutas.length - receitas.length };
}

/** Chave que identifica uma receita, para não duplicá-la ao importar o mesmo arquivo duas vezes. */
const chaveReceita = (r) => `${r.date || ''}|${r.name || ''}|${r.mix}|${JSON.stringify(r.ing)}`;

/**
 * Soma o conteúdo lido de um backup ao estado, sem substituir nem duplicar:
 * receitas novas vão para o início da lista; marcas "tenho" são unidas às existentes.
 *
 * @param {{hist: object[], own: object}} state estado (alterado).
 * @param {{receitas: object[], tenho: object}} dados resultado de `lerBackup`.
 * @param {(linha: string, codigo: string) => boolean} [existe] diz se a tinta existe no app (as demais são ignoradas).
 * @returns {{receitasNovas: number, tintasNovas: number, linhas: number, tintasIgnoradas: number}}
 */
export function mesclarBackup(state, dados, existe = () => true) {
  const conhecidas = new Set(state.hist.map(chaveReceita));
  const novas = [];
  for (const r of dados.receitas) {
    const k = chaveReceita(r);
    if (conhecidas.has(k)) continue;
    conhecidas.add(k);
    novas.push(r);
  }
  state.hist = novas.concat(state.hist);

  let tintasNovas = 0;
  let tintasIgnoradas = 0;
  const linhasComNovidade = new Set();
  for (const [linha, mapa] of Object.entries(dados.tenho)) {
    for (const codigo of Object.keys(mapa)) {
      if (!existe(linha, codigo)) {
        tintasIgnoradas++;
        continue;
      }
      const atual = (state.own[linha] ||= {});
      if (!atual[codigo]) {
        atual[codigo] = true;
        tintasNovas++;
        linhasComNovidade.add(linha);
      }
    }
  }
  return { receitasNovas: novas.length, tintasNovas, linhas: linhasComNovidade.size, tintasIgnoradas };
}
