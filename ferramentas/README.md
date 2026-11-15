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
- **Equivalências:** os scripts da AK (págs. 16–22) e da AMMO (págs. 97–105) também leem as tabelas de conversão e
  gravam `ref` (referência de norma) e `equiv` (equivalências em outras marcas).

## Limites

São aproximações de tela: amostras impressas ou fotografadas, cada fonte com sua calibração. Metálicos, translúcidos
e fluorescentes são os que mais se afastam. Os catálogos mudam; confira a edição antes de reextrair. A **Acrilex**,
a **Tamiya** e a **Revell** foram extraídas com métodos anteriores (veja [`../legado/README.md`](../legado/README.md)
e o README principal).
