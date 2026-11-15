# Misturador de Tintas — plastimodelismo

Calcula misturas de tintas **Acrilex Fosca** (ingredientes) para chegar a uma cor-alvo de qualquer catálogo
(Tamiya, Revell, Acrilex ou cor livre). A mistura é calculada como **pigmentos** (modelo espectral
Kubelka-Munk), não como média de RGB. JavaScript puro, módulos ES, **sem build e sem dependências**.

## Como executar
Módulos ES e `fetch` não funcionam abrindo o `index.html` direto do disco (`file://`). Sirva a pasta por HTTP:

```bash
node tools/servidor.mjs        # http://localhost:8080/  (porta opcional: node tools/servidor.mjs 3000)
```

(qualquer servidor estático serve, ex.: extensão Live Server do VS Code). Testes: `npm test`.

## Estrutura
```
index.html               marcação da página
css/styles.css           estilos (tema claro/escuro automático)
dados/*.json             catálogos de cores (fonte de dados da aplicação)
js/
  main.js                ponto de entrada: carrega dados, cria estado, liga os módulos
  color/                 motor de cor (puro, sem DOM — roda também no Node)
    convert.js           hex ⇄ sRGB ⇄ RGB linear ⇄ XYZ ⇄ L*a*b*
    deltaE.js            diferença de cor CIEDE2000
    optimize.js          Nelder-Mead
    spectral.js          hex → reflectância espectral (fitHex) e inverso
    mixing.js            modelos de mistura (KM, KM igual, RGB linear, RGB direto)
    suggest.js           busca automática de receitas
    nearest.js           tintas de um catálogo mais próximas de uma cor (ΔE00)
  data/catalogs.js       carrega/normaliza os JSONs; nomes de catálogos e abas
  data/sets.js           linhas de tintas que podem ser ingredientes (filtros e tintas âncora)
  state/store.js         estado + persistência em localStorage
  ui/                    um módulo por seção da tela
    ingredients.js  targets.js  result.js  equivalents.js  picker.js  suggestions.js  recipes.js  dom.js
tests/                   testes de equivalência (golden.json gravado do motor original)
tools/servidor.mjs       servidor estático para desenvolvimento
catalogos/               catálogos HTML (interativo e de impressão) de Tamiya, Revell e Acrilex
ferramentas/, originais/ material histórico da extração das cores (scripts Python, ver abaixo)
```

## Como as cores foram obtidas (nov/2026)
- **Tamiya:** cor dominante (não branca) da região central da imagem de cada tinta no site oficial; XF-94 incluída; aditivos sem cor.
- **Revell:** mediana da esfera de cor no site (descartando os 25% mais claros, por causa do reflexo nos acabamentos gloss).
- **Acrilex:** mediana dos pixels da cartela impressa no PDF (págs. 36–37). Branco fixado em #ffffff.
- **FS 595 (AMS-STD-595):** cores das amostras exibidas em <https://ams-std-595-color.com/> (revendedor de leques
  de cores, sem vínculo com GSA/SAE), extraídas por `node ferramentas/extrair-fs595.mjs` para `dados/fs595-cores.json`
  (653 cores). Acabamento derivado do 1º dígito do número (1 gloss, 2 semi-gloss, 3 flat). São aproximações de tela.
- **Vallejo:** cartelas do *Catalogue 2026* (PDF): posição de cada código (`pdftohtml`) + mediana dos pixels da amostra
  impressa logo acima (`pdftoppm`), via `node ferramentas/extrair-vallejo.mjs "Catalogo.pdf"` (requer poppler).
  892 cores em 9 linhas (Model Color, Liquid Metal, Model Air, Game Color, Xpress Color, Game Air, True Metallic Metal,
  Mecha Color, Premium Color). Fora: Metal Color, Primers, Hobby Paint e "Auxiliary Products" (sem cor). Amostras em
  degradê/metálicas têm `degrade: true` (borda tracejada na grade): a cor é só uma aproximação.
- **Mr. Hobby (Gunze):** *Mr.Hobby Catalogue 2024-2025* (PDF), com o mesmo método da Vallejo (etiqueta de código em
  texto branco + mediana da amostra ao lado): `node ferramentas/extrair-mrcolor.mjs "Catalogo.pdf"` (requer poppler).
  443 cores em 3 linhas: Mr. Color (lacquer, códigos C…, com GX, Super Metallic 2, Ultra Metallic, Revival e Velvet),
  Aqueous Hobby Color (H…) e Acrysion (N…). O catálogo mostra os mesmos números de cor nas três linhas (C1 = H1 = N1).
  Ficam de fora aditivos, kits, marcadores, Lascivus (pele), Clear GX e Metallic GX (amostras sem nome).
- **Humbrol (acrílicas):** site <https://uk.humbrol.com/catalogue> (filtro "Acrylic paint", 150 produtos em 13 páginas).
  A lista é carregada por JavaScript, então foi coletada no navegador e guardada em `ferramentas/humbrol-lista.json`
  (SKU, rótulo e imagem). Cada imagem mostra um respingo da tinta e o frasco: `node ferramentas/extrair-humbrol.mjs`
  baixa as imagens (uma por vez, com pausa) e usa a mediana de uma caixa dentro do respingo (requer `ffmpeg`).
  147 cores (os 3 vernizes ficam de fora). Fluorescentes e metálicos são só aproximações (o site usa a mesma tinta
  de tela para o 37 Bright Green e o 208 Fluorescent Signal Green).
- **RAL Classic:** 9 páginas de <https://www.ralcolorchart.com/ral-classic/> (uma por família de tons), com a cor em
  hex no próprio HTML: `node ferramentas/extrair-ral.mjs`. 216 cores; o script confere a contagem de cada página com a
  que o site informa. São as cores exibidas pelo site (aproximações de tela), não os valores colorimétricos oficiais.
  Só o RAL Classic: RAL Design e RAL Effect não aparecem em manuais de modelismo.
- **AK (Real Colors):** cartela "RC RANGE" (págs. 9–11) do catálogo da AK Interactive, mesmo método da Vallejo:
  `node ferramentas/extrair-ak.mjs "Catalogo.pdf"` (requer poppler). 177 cores em 3 seções (Standard, Civil, Military);
  os vernizes RC801–803 ficam de fora. Tintas transparentes e metálicas têm `degrade: true`. As páginas 16–22 do PDF
  trazem a tabela de conversão ("CONVERSION CHART"), que o mesmo script lê: referência de norma (`ref`, ex.: "RAL 9005")
  e equivalências (`equiv`) em Mr. Hobby, Tamiya, Vallejo, Hataka, MRP, Model Master e Lifecolor (seções Standard e
  Military) ou Tamiya, Number Five, MRP, Gravity e Zero Paints (seção Civil, que tem outro layout).
- **AMMO by Mig:** *AMMO Catalogue 2024*: as tabelas de conversão do fim do PDF (págs. 97–105) têm uma linha por cor, com
  amostra colorida, nome, referência RAL/RLM/FS e equivalências em Hobby Color, Mr. Color, Tamiya, Model Color e Model Air.
  `node ferramentas/extrair-ammo.mjs "Catalogo.pdf"` (requer poppler) lê as duas tabelas: Acrylic Colors (A.MIG, 236 cores,
  amostras chapadas) e ATOM (181 cores, amostras com sombreado suave: vale a cor do meio). A cor vem de faixas da célula
  sem o texto escrito por cima. As equivalências ficam em `equiv` (ainda não usadas na interface). Fora do app: filtros,
  washes, oilbrushers, Rail Center e demais produtos que não são tintas de cor sólida.
- São aproximações; metálicos e translúcidos são os que mais se afastam.

## Modelo de mistura
- Cada hex vira uma reflectância suave (sigmoide-polinômio, 3 coeficientes; CMFs de Wyman; iluminante D65).
- Mistura por Kubelka-Munk: K/S ponderado por quantidade × força × espalhamento estimado `S = 0,05 + 0,95·Y^0,7`;
  correção de resíduo para a tinta pura voltar exatamente ao hex do catálogo.
- Modelos alternativos na página (KM com S igual, RGB linear, RGB direto) para comparar. Métrica: ΔE00.
- Sugestão automática (grade de pesos + refino local) de 1 a 4 tintas, opcionalmente só as "que tenho".
- Receitas e "tenho" ficam no `localStorage` (por endereço da página); use "exportar JSON" para levar as receitas.
- Para calibrar: registrar a cor real obtida nas receitas salvas e ajustar `força`.

## Linha de tintas dos ingredientes
No card "1 · Mistura" você escolhe a **marca e a linha** das tintas que tem (Acrilex, Tamiya Acrílica ou Lacquer, Vallejo
Model Color/Model Air…, Mr. Hobby, Humbrol, AK, AMMO). Cada receita usa **uma linha só**: tintas de químicas diferentes
(acrílica, lacquer, esmalte) não se misturam na bancada. Detalhes:
- Metálicas, perolizadas, translúcidas e fluorescentes ficam ocultas, porque o modelo de mistura (Kubelka-Munk, para
  pigmentos opacos e foscos) não as representa. O texto ao lado do seletor diz quantas foram ocultadas.
- "Tenho" é guardado por linha, e a receita salva guarda a linha dos ingredientes (receitas antigas valem como Acrilex).
- Trocar de linha limpa a mistura atual (com confirmação); carregar uma receita de outra linha troca a linha sozinho.
- A sugestão automática usa tintas âncora (branco, preto e primárias), escolhidas por proximidade de cor em cada linha;
  na Acrilex são fixas, como sempre foram. Em linhas com mais de 120 tintas, a busca de pares usa as 60 mais próximas do
  alvo (mais as âncoras), para responder em cerca de 1 s.
- Para acrescentar uma linha: uma entrada em `INGREDIENT_SETS` (`js/data/sets.js`).

## Equivalentes em outras marcas
Para a cor-alvo (ou para a mistura calculada, à escolha), a seção 4 mostra em cada catálogo as 3 tintas mais
parecidas, por ΔE00 (`js/color/nearest.js`); menor é mais parecida (verde: ΔE < 2). Clicar numa cor a usa como alvo.
Quando o fabricante declara a equivalência, a linha ganha o selo **AMMO**, **AK** ou **AMMO · AK**: as tabelas de
conversão dos dois catálogos (`equiv` e `ref` em `dados/ammo-cores.json` e `dados/ak-cores.json`) são resolvidas para as
tintas dos nossos catálogos, nos dois sentidos (`js/data/equivalences.js`; ~1500 ligações com Tamiya, Mr. Color/Hobby
Color, Vallejo e entre A.MIG e ATOM). As referências de norma citadas (`RAL 9005`, `FS 36081`) também ligam a cor ao
nosso RAL e ao FS 595. Marcas sem catálogo aqui (Hataka, MRP, Model Master, Lifecolor, Number Five, Gravity, Zero Paints)
ficam guardadas nos JSONs, mas não aparecem na tela. O selo mostra o que o fabricante *afirma*; o ΔE ao lado mostra o
quanto as cores de tela concordam (os catálogos usam amostras de origens diferentes, então pode haver diferença).

## Organização dos catálogos na tela
Cada marca é uma aba da seção "Cor-alvo". As que têm mais de uma linha de produto (Tamiya: Acrílica e Lacquer; Revell:
Aqua Color e Email Color; Vallejo; Mr. Hobby; AK; AMMO) mostram abaixo das abas uma fileira de botões de linha, com
"Todas" para buscar em todas elas. No código, é só marcar cada tinta com `line` em `buildCatalogs`
(`js/data/catalogs.js`); catálogos de linha única (FS 595, Humbrol, RAL, Acrilex) não mostram a fileira.

## Dados
Os JSONs em `dados/` são lidos diretamente pela aplicação. Para ampliar uma paleta, edite/adicione registros
neles (formatos em `js/data/catalogs.js`). Os scripts Python em `ferramentas/` (extração do PDF da Acrilex e
geração dos catálogos HTML) são históricos e não fazem parte da aplicação.
