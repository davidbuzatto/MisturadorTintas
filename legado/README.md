# Material histórico

Esta pasta guarda o que ajudou a construir os primeiros catálogos, mas **não faz parte do aplicativo** e não é
publicada no site. Nada aqui é usado em tempo de execução nem nos testes.

| Item | O que é |
|---|---|
| `extrair_acrilex.py` | Método (descrito em comentários) usado para extrair as cores da Acrilex do PDF de 2025 (págs. 36–37): `pdftoppm` a 150 dpi + posição dos códigos com `pdftotext -bbox` + mediana dos pixels acima de cada rótulo. O script original rodou "inline"; este arquivo documenta o procedimento. Requer Python, poppler, pillow e numpy. |
| `geradores-python/` | Scripts em Python que geravam as páginas estáticas de `catalogos/` (Tamiya e Revell) a partir dos JSONs, com seus modelos HTML. Superados pelo aplicativo, mas as páginas geradas continuam publicadas em `catalogos/`. |
| `originais/` | Primeiros catálogos Tamiya, com cores inferidas e imprecisas. Só histórico. |
| `validacao/` | Comparações entre as cores do catálogo Tamiya e as do Scalemates (`comparacao-*.json`, `scalemates-*.txt`), usadas para corrigir as cores da Tamiya. |

Para refazer a extração de qualquer catálogo atual, veja [`../ferramentas/README.md`](../ferramentas/README.md).
