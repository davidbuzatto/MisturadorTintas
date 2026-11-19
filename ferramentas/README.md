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
| `extrair-scale75.mjs` | `scale75-lista.json`, coletada no [Scalemates](https://www.scalemates.com/colors/scale75--683) com `coletar-scale75.js` | navegador | `dados/scale75-cores.json` |

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
- **Scale75:** o Scalemates recusa acesso fora do navegador (HTTP 403), então a coleta é feita pelo console:
  `coletar-scale75.js`, aberto na página de cada linha (`scale75--683` e `scalecolor-artist--888`), copia código,
  nome, acabamento e a cor da amostra de cada cartão (a mesma do "Color viewer" da página da tinta). O resultado vai
  para `scale75-lista.json`, uma chave por página, e `extrair-scale75.mjs` separa as linhas pelo prefixo do código
  e marca as séries Metal n' Alchemy, Inktense e Primer. Ficam de fora estojos, diluentes, washes a óleo, pigmentos e
  as tintas sem amostra no site (15 das 16 Prism Effect, 6 primers). Os "similar color chips" (FS/RAL) do Scalemates
  não são gravados: são calculados pelo site, não declarados pelo fabricante.
- **Equivalências:** os scripts da AK (págs. 16–22) e da AMMO (págs. 97–105) também leem as tabelas de conversão e
  gravam `ref` (referência de norma) e `equiv` (equivalências em outras marcas).

## Limites

São aproximações de tela: amostras impressas ou fotografadas, cada fonte com sua calibração. Metálicos, translúcidos
e fluorescentes são os que mais se afastam. Os catálogos mudam; confira a edição antes de reextrair. A **Acrilex**,
a **Tamiya** e a **Revell** foram extraídas com métodos anteriores (veja [`../legado/README.md`](../legado/README.md)
e o README principal).
