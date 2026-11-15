# Misturador de tintas — plastimodelismo

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
  data/catalogs.js       carrega/normaliza os JSONs; nomes de catálogos e tintas âncora
  state/store.js         estado + persistência em localStorage
  ui/                    um módulo por seção da tela
    ingredients.js  targets.js  result.js  picker.js  suggestions.js  recipes.js  dom.js
tests/                   testes de equivalência (golden.json gravado do motor original)
tools/servidor.mjs       servidor estático para desenvolvimento
catalogos/               catálogos HTML (interativo e de impressão) de Tamiya, Revell e Acrilex
ferramentas/, originais/ material histórico da extração das cores (scripts Python, ver abaixo)
```

## Como as cores foram obtidas (nov/2026)
- **Tamiya:** cor dominante (não branca) da região central da imagem de cada tinta no site oficial; XF-94 incluída; aditivos sem cor.
- **Revell:** mediana da esfera de cor no site (descartando os 25% mais claros, por causa do reflexo nos acabamentos gloss).
- **Acrilex:** mediana dos pixels da cartela impressa no PDF (págs. 36–37). Branco fixado em #ffffff.
- São aproximações; metálicos e translúcidos são os que mais se afastam.

## Modelo de mistura
- Cada hex vira uma reflectância suave (sigmoide-polinômio, 3 coeficientes; CMFs de Wyman; iluminante D65).
- Mistura por Kubelka-Munk: K/S ponderado por quantidade × força × espalhamento estimado `S = 0,05 + 0,95·Y^0,7`;
  correção de resíduo para a tinta pura voltar exatamente ao hex do catálogo.
- Modelos alternativos na página (KM com S igual, RGB linear, RGB direto) para comparar. Métrica: ΔE00.
- Sugestão automática (grade de pesos + refino local) de 1 a 4 tintas, opcionalmente só as "que tenho".
- Receitas e "tenho" ficam no `localStorage` (por endereço da página); use "exportar JSON" para levar as receitas.
- Para calibrar: registrar a cor real obtida nas receitas salvas e ajustar `força`.

## Dados
Os JSONs em `dados/` são lidos diretamente pela aplicação. Para ampliar uma paleta, edite/adicione registros
neles (formatos em `js/data/catalogs.js`). Os scripts Python em `ferramentas/` (extração do PDF da Acrilex e
geração dos catálogos HTML) são históricos e não fazem parte da aplicação.
