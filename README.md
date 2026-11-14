# Paletas de cores — plastimodelismo

Catálogos de cores aproximadas (para tela) de tintas, mais um misturador de pigmentos. Tudo em HTML
autocontido (não precisa de servidor nem dos JSONs para abrir).

## Estrutura
- `misturador-tintas.html` — misturador (ingredientes Acrilex Fosca → alvo Tamiya/Revell/Acrilex). Modelo espectral Kubelka-Munk.
- `catalogos/` — catálogos gerados (interativo + versão de impressão) de Tamiya, Revell e Acrilex Fosca.
- `dados/` — fontes de dados: `*-cores-oficial.json` (code, name, hex...) + comparações/Scalemates usadas na validação.
- `originais/` — primeiros catálogos Tamiya (cores inferidas, imprecisas). Só histórico.
- `fontes/` — PDF do catálogo Acrilex (Manualidades 2025; cores nas págs. 36–37).
- `ferramentas/` — scripts que geram tudo (ver abaixo).

## Como as cores foram obtidas (nov/2026)
- **Tamiya:** amostragem da cor dominante (não branca) da região central da imagem de cada tinta no site oficial; XF-94 incluída; aditivos sem cor.
- **Revell:** mediana da esfera de cor no site (descartando os 25% mais claros, por causa do reflexo nos acabamentos gloss).
- **Acrilex:** mediana dos pixels da cartela impressa no PDF (págs. 36–37). Branco fixado em #ffffff.
- São aproximações; metálicos e translúcidos são os que mais se afastam.

## Misturador
- Cada hex vira uma reflectância suave (sigmoide-polinômio, 3 coeficientes, CMFs de Wyman, iluminante D65);
  mistura por Kubelka-Munk (K/S ponderado por quantidade × força × espalhamento estimado S = 0,05 + 0,95·Y^0,7);
  correção de resíduo para a tinta pura voltar exatamente ao hex do catálogo.
- Modelos alternativos na página (KM com S igual, RGB linear, RGB direto) para comparar.
- ΔE00 como métrica; sugestão automática (grade de pesos + refino local) de 1 a 4 tintas, opcionalmente só as "que tenho".
- Receitas e "tenho" ficam no `localStorage` (por endereço da página); use "exportar JSON" para levar as receitas.
- Para calibrar: registrar a cor real obtida nas receitas salvas e ajustar `S`/força.

## Regerar
- Misturador: `python3 ferramentas/misturador/build_misturador.py` (lê `dados/*.json`, escreve `misturador-tintas.html`).
- Catálogos: `ferramentas/geradores/gen.py` (Tamiya) e `genrev.py` (Revell) — foram escritos com caminhos relativos à pasta raiz
  e usam `orig_i.html`/`orig_p.html` (modelos); copie-os para a raiz ou ajuste os caminhos antes de rodar.
- Acrilex: ver `ferramentas/misturador/extrair_acrilex.py` (descrição do método de extração do PDF).
