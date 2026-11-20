# Extratores de dados

Scripts em Node (sem dependências npm) que geram os JSONs de `dados/` a partir das fontes originais. **Não são
necessários para usar o aplicativo**: os JSONs já estão no repositório. Servem para refazer ou atualizar um catálogo.

| Script | Fonte | Requer | Saída |
|---|---|---|---|
| `extrair-fs595.mjs` | site <https://ams-std-595-color.com/> | rede | `dados/fs595-cores.json` |
| `extrair-ral.mjs` | 9 páginas de <https://www.ralcolorchart.com/ral-classic/> | rede | `dados/ral-cores.json` |
| `extrair-vallejo.mjs "arquivo.pdf"` | *Catalogue 2026* (PDF) | poppler | `dados/vallejo-cores.json` |
| `extrair-mrcolor.mjs "arquivo.pdf"` | *Mr.Hobby Catalogue 2024-2025* (PDF) | poppler | `dados/mrcolor-cores.json` |
| `extrair-ak.mjs "arquivo.pdf"` | catálogo AK Real Colors (PDF) | poppler | `dados/ak-cores.json` |
| `extrair-ammo.mjs "arquivo.pdf"` | *AMMO Catalogue 2024* (PDF) | poppler | `dados/ammo-cores.json` |
| `extrair-humbrol.mjs` | imagens do site <https://uk.humbrol.com/catalogue> | rede, ffmpeg | `dados/humbrol-cores.json` |
| `extrair-scale75.mjs` | site oficial <https://scale75.com> (11 coleções) | rede (Node puro; usa `png.mjs`) | `dados/scale75-cores.json`, `scale75-medidas.json`, `scale75-conferir.md` |

"poppler" são os programas `pdftohtml` e `pdftoppm`; `ffmpeg` decodifica as imagens da Humbrol. Todos precisam estar no `PATH`.

## Como cada um funciona

- **PDFs (Vallejo, Mr. Hobby, AK, AMMO):** o texto posicionado (`pdftohtml -xml`) dá a posição do código de cada cor;
  a página é renderizada (`pdftoppm`) e a cor é a **mediana dos pixels** de uma caixa dentro da amostra impressa, num
  ponto fixo em relação ao código. Amostras com muita variação interna (degradês, metálicos) recebem `degrade: true`.
  Cada script confere a própria saída (contagens, códigos únicos) e imprime avisos.
- **Sites (FS 595, RAL):** a cor já está no HTML (`background-color`), então basta ler. O RAL confere a contagem de
  cada página com a que o site informa.
- **Humbrol:** a lista de produtos é carregada por JavaScript e foi coletada no navegador (150 produtos, 13 páginas);
  está em `humbrol-lista.json` (SKU, rótulo e caminho da imagem). O script baixa cada imagem (uma por vez, com pausa) e
  tira a mediana de uma caixa dentro do respingo de tinta.
- **Scale75:** a loja é Shopify, e cada coleção tem um JSON público (`/en/collections/<coleção>/products.json`) com SKU,
  nome e imagens. A foto da **amostra** é um traço de pincel em PNG com fundo transparente, e o script a procura entre
  todas as imagens do produto (a posição varia). O canal alfa isola a tinta; recua-se 4 px das bordas e a cor é a
  **mediana do terço esquerdo do traço**, onde a tinta está mais carregada (para a direita ela vai esmaecendo, como num
  pincel). As imagens ficam num cache em disco, com ritmo lento e espera maior se o CDN responder 403/429.
  Casos especiais: imagens sem transparência (Artist) são separadas do fundo por diferença de cor; amostras
  semitransparentes recebem `aprox: "diluida"`; a **Drop & Paint** e a **Scalecolor Games** não têm amostra, então a cor é
  lida do líquido na foto do frasco (faixa de 88% a 96% da altura) e recebe `aprox: "frasco"` — na calibração contra o
  traço, esse método erra em mediana ΔE 6 a 8, sem viés, o que serve para consulta e não para calcular misturas. O script
  também grava `scale75-medidas.json` (cor da esquerda, do centro e da direita, e avisos por tinta) e
  `scale75-conferir.md`, a lista curta de tintas para conferir à mão no site (amostra diluída, traço minúsculo, foto
  trocada ou sem amostra utilizável). Como não há mais lista coletada no navegador, rodar de novo basta
  `node ferramentas/extrair-scale75.mjs`.
- **Equivalências:** os scripts da AK (págs. 16–22) e da AMMO (págs. 97–105) também leem as tabelas de conversão e
  gravam `ref` (referência de norma) e `equiv` (equivalências em outras marcas).

## Limites

São aproximações de tela: amostras impressas ou fotografadas, cada fonte com sua calibração. Metálicos, translúcidos
e fluorescentes são os que mais se afastam. Os catálogos mudam; confira a edição antes de reextrair. A **Acrilex**,
a **Tamiya** e a **Revell** foram extraídas com métodos anteriores (veja [`../legado/README.md`](../legado/README.md)
e o README principal).
