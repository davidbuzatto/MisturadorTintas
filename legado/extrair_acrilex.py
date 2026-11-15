# Extrai as cores da cartela Acrilex (PDF, págs. 36-37) -> dados/acrilex-cores-oficial.json
# Método: pdftoppm (150 dpi) + pdftotext -bbox para localizar o código de cada tinta; a amostra é a
# MEDIANA dos pixels não-brancos de uma caixa ~49x37 px acima do rótulo (centro do "pincelado").
# Nomes foram conferidos à mão contra as imagens das páginas. Branco (519) fixado em #ffffff.
# Requer: poppler-utils, pillow, numpy. Caminho do PDF: fontes/ACRILEX-Catalogo-Manualidades-2025-WEB.pdf
# (O script original rodou inline; ajuste 'names' se o catálogo mudar.)
import subprocess,re,json
from PIL import Image
import numpy as np
PDF='fontes/ACRILEX-Catalogo-Manualidades-2025-WEB.pdf'
for pg in (36,37):
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r','150','-png',PDF,'pg'])
    subprocess.run(['pdftotext','-f',str(pg),'-l',str(pg),'-bbox',PDF,f'b{pg}.html'])
    # para cada código (3 dígitos) em (x,y) pts: centro da amostra = (x*150/72+52, y*150/72-68)
    # box = im[cy-18:cy+19, cx-24:cx+25]; descartar pixels com todos canais >= 246; mediana por canal
