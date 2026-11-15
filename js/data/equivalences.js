/**
 * @module data/equivalences
 * Equivalências entre marcas declaradas pelos próprios fabricantes.
 *
 * Duas fontes trazem tabelas de conversão: a AMMO (págs. 97–105 do catálogo 2024) e a AK Real Colors
 * (págs. 16–22). Cada cor delas guarda, em `equiv`, os códigos equivalentes em outras marcas e, em
 * `ref`, a referência de norma (RAL/FS). Aqui esses códigos são resolvidos para as tintas dos nossos
 * catálogos e cada relação é guardada nos dois sentidos, com o nome de quem a declarou: dado um alvo
 * Tamiya XF-1, descobre-se que a AMMO indica A.MIG-0046 e a AK indica RC804.
 *
 * Nada aqui é calculado por cor: é a informação "oficial", complementar ao ΔE.
 */

/** Tira o hífen: "C-33" (AMMO) e "C33" (AK) viram "C33", o código usado no catálogo Mr. Hobby. */
const semHifen = (c) => c.replace('-', '');
const igual = (c) => c;

/**
 * Fontes de equivalência. `aba`: catálogo onde estão as cores da fonte. `colunas`: para cada chave de
 * `equiv`, em quais catálogos procurar (`abas`) e como converter o texto no código usado aqui.
 */
const FONTES = [
  {
    nome: 'AMMO',
    aba: 'ammo',
    colunas: {
      tamiya: { abas: ['tamiya'], codigo: igual },
      hobbyColor: { abas: ['mrhobby'], codigo: semHifen }, // "H-48"
      mrColor: { abas: ['mrhobby'], codigo: semHifen }, //    "C-52"
      modelColor: { abas: ['vallejo'], codigo: igual },
      modelAir: { abas: ['vallejo'], codigo: igual },
      atom: { abas: ['ammo'], codigo: igual },
      ammo: { abas: ['ammo'], codigo: igual },
    },
  },
  {
    nome: 'AK',
    aba: 'ak',
    colunas: {
      mrHobby: { abas: ['mrhobby'], codigo: semHifen }, // "C33 / H12"
      tamiya: { abas: ['tamiya'], codigo: igual },
      vallejo: { abas: ['vallejo'], codigo: igual },
    },
  },
];

/** Um valor de `equiv` pode listar vários códigos ("H-47 / H-460", "C33 / H12"). */
const separar = (valor) => valor.split(/[\/,\s]+/).filter(Boolean);

/**
 * Referências de norma citadas em `ref` ("FS34082-RAL 6003", "RAL 9005", "FS 36081"), convertidas para
 * os catálogos RAL e FS 595. Outras normas (BS, RLM, MS…) não têm catálogo aqui e são ignoradas.
 * @param {string} ref texto da referência.
 * @returns {{aba: string, codigo: string}[]}
 */
export function normasDe(ref) {
  const achados = [];
  for (const m of ref.matchAll(/\bRAL\s*(\d{4})\b/g)) achados.push({ aba: 'ral', codigo: m[1] });
  for (const m of ref.matchAll(/\bFS\s*-?\s*(\d{5})\b/g)) achados.push({ aba: 'fs595', codigo: m[1] });
  return achados;
}

/** Chave de uma tinta no mapa de ligações. */
const chave = (aba, codigo) => `${aba}|${codigo}`;

/**
 * Monta o mapa de equivalências declaradas.
 *
 * @param {Object<string, import('./catalogs.js').CatalogPaint[]>} catalogs catálogos por aba.
 * @returns {{
 *   declaradasPara: (aba: string, codigo: string) => {aba: string, paint: import('./catalogs.js').CatalogPaint, fontes: string[]}[],
 *   total: number,
 *   naoResolvidas: number,
 * }}
 */
export function buildLinks(catalogs) {
  // índice aba → código → tinta
  const indice = {};
  for (const [aba, tintas] of Object.entries(catalogs)) {
    indice[aba] = new Map(tintas.map((p) => [p.code, p]));
  }

  /** @type {Map<string, Map<string, {aba: string, paint: object, fontes: Set<string>}>>} */
  const ligacoes = new Map();
  const ligar = (a, b, fonte) => {
    for (const [x, y] of [[a, b], [b, a]]) {
      const k = chave(x.aba, x.paint.code);
      if (!ligacoes.has(k)) ligacoes.set(k, new Map());
      const mapa = ligacoes.get(k);
      const ky = chave(y.aba, y.paint.code);
      if (!mapa.has(ky)) mapa.set(ky, { aba: y.aba, paint: y.paint, fontes: new Set() });
      mapa.get(ky).fontes.add(fonte);
    }
  };

  const vistas = new Set(); // pares já contados (um par declarado em várias colunas conta uma vez)
  let total = 0;
  let naoResolvidas = 0;
  const registrar = (origem, destino, fonte) => {
    const id = `${chave(origem.aba, origem.paint.code)}>${chave(destino.aba, destino.paint.code)}>${fonte}`;
    if (vistas.has(id)) return;
    vistas.add(id);
    ligar(origem, destino, fonte);
    total++;
  };

  for (const fonte of FONTES) {
    for (const paint of catalogs[fonte.aba] || []) {
      const origem = { aba: fonte.aba, paint };
      // equivalências em outras marcas
      for (const [coluna, valor] of Object.entries(paint.equiv || {})) {
        const cfg = fonte.colunas[coluna];
        if (!cfg) continue;
        for (const bruto of separar(valor)) {
          const codigo = cfg.codigo(bruto);
          const aba = cfg.abas.find((a) => indice[a] && indice[a].has(codigo));
          if (!aba) {
            naoResolvidas++;
            continue;
          }
          const destino = indice[aba].get(codigo);
          if (destino !== paint) registrar(origem, { aba, paint: destino }, fonte.nome);
        }
      }
      // referências de norma (RAL / FS)
      for (const { aba, codigo } of normasDe(paint.ref || '')) {
        const destino = indice[aba] && indice[aba].get(codigo);
        if (destino) registrar(origem, { aba, paint: destino }, fonte.nome);
      }
    }
  }

  return {
    /**
     * Tintas que algum fabricante declara equivalentes a uma tinta do catálogo.
     * @param {string} aba aba do catálogo da tinta (ex.: "tamiya").
     * @param {string} codigo código da tinta.
     */
    declaradasPara(aba, codigo) {
      return [...(ligacoes.get(chave(aba, codigo))?.values() || [])].map((l) => ({
        aba: l.aba,
        paint: l.paint,
        fontes: [...l.fontes],
      }));
    },
    total,
    naoResolvidas,
  };
}
