/**
 * Textos da interface em português do Brasil (idioma padrão).
 * Marcadores como `{n}` são substituídos por `t()`. Chaves terminadas em `.html` ou usadas em
 * `data-i18n-html` podem conter marcação simples (<b>, <a>), escrita só aqui.
 */
export default {
  // ---- aplicativo ----
  'app.title': 'Misturador de Tintas',
  'app.subtitle':
    'Calcule misturas de tinta para plastimodelismo: escolha a linha de tintas que você tem, a cor que quer alcançar ' +
    '(de qualquer catálogo, inclusive FS 595 e RAL) e veja a receita. A tinta é tratada como <b>pigmento</b> ' +
    '(modelo espectral de Kubelka-Munk), não como média de RGB.',
  'app.error':
    'Não foi possível iniciar o aplicativo: {erro}. Se você abriu o arquivo direto do disco (file://), sirva a pasta por HTTP (veja o README).',
  'a11y.skip': 'Ir para o conteúdo',
  'lang.label': 'Idioma',
  'common.all': 'Todas',
  'common.noName': 'Sem nome',
  'common.close': 'fechar',
  'common.approx': 'amostra em degradê/metálica: cor aproximada',

  // ---- "Como funciona" ----
  'help.title': 'Como funciona',
  'help.step1': '<b>Escolha as tintas que você tem</b> (card 1) e monte uma mistura com os controles de quantidade.',
  'help.step2': '<b>Escolha a cor-alvo</b> (card 2): qualquer cor de qualquer catálogo, ou uma cor livre.',
  'help.step3':
    'O <b>resultado</b> (card 3) mostra a cor calculada e o quanto ela difere do alvo (ΔE00). A <b>sugestão automática</b> procura a receita por você.',
  'help.step4': 'Em <b>equivalentes</b> (card 4), veja as tintas mais parecidas em outras marcas.',
  'help.step5':
    'Salve suas <b>receitas</b> (card 5) e, depois de misturar de verdade, registre a cor obtida para medir o erro do modelo.',
  'help.local':
    'Tudo roda no seu navegador e nada é enviado a servidor algum. Receitas e preferências ficam no armazenamento local do navegador: use “exportar JSON” para levá-las para outro lugar.',
  'help.limits':
    'As cores dos catálogos são aproximações para tela, e tinta metálica, translúcida ou fluorescente não é bem representada. Trate o resultado como ponto de partida e teste sempre antes de pintar.',

  // ---- cards ----
  'card.mix': '1 · Mistura',
  'card.target': '2 · Cor-alvo',
  'card.result': '3 · Resultado',
  'card.equiv': '4 · Equivalentes em outras marcas',
  'card.recipes': '5 · Receitas salvas',

  // ---- 1 · Mistura ----
  'mix.help': 'Escolha a linha de tintas que você tem. Cada receita usa uma linha só, porque tintas de químicas diferentes não se misturam na bancada.',
  'mix.set.label': 'tintas',
  'mix.set.title': 'Linha de tintas usada como ingrediente nesta receita. Cada receita usa uma linha só: tintas de químicas diferentes não se misturam na bancada.',
  'mix.set.info': '{n} tintas · {quimica}',
  'mix.set.hidden': ' · {n} metálicas/translúcidas ocultas',
  'mix.set.confirm': 'Trocar a linha de tintas limpa a mistura atual. Continuar?',
  'chem.acrilica': 'acrílica',
  'chem.lacquer': 'lacquer',
  'chem.esmalte': 'esmalte',
  'set.acrilex': 'Fosca',
  'set.tamiya-acrilica': 'Acrílica',
  'set.humbrol': 'Acrílica',
  'line.Acrylic': 'Acrílica',
  'mix.empty': 'Nenhuma tinta ainda. Clique em “adicionar tinta”.',
  'mix.add': '+ adicionar tinta',
  'mix.norm': 'normalizar 100%',
  'mix.norm.title': 'Escala as quantidades para somarem 100%',
  'mix.clear': 'limpar',
  'mix.total': 'total',
  'mix.total.title': 'Volume total da mistura, usado só para converter as porcentagens em ml',
  'mix.sum': 'soma das quantidades: {n}',
  'mix.sum.hint': ' (as proporções valem sobre a soma; “normalizar 100%” ajusta os números)',
  'ing.qty.title': 'quantidade relativa',
  'ing.qty.aria': 'quantidade de {nome}',
  'ing.strength.title': 'força de tingimento',
  'ing.strength.aria': 'força de tingimento de {nome}',
  'ing.strength': 'força',
  'ing.remove': 'remover',
  'mix.model.summary': 'Modelo de mistura e força de tingimento',
  'mix.model.label': 'modelo',
  'mix.model.help':
    'A coluna “força” de cada tinta multiplica sua participação: use &gt;1 para pigmentos fortes (preto, azul, magenta) e &lt;1 para os fracos. Ajuste até a mistura calculada bater com o que você vê na bancada. O modelo padrão trata a tinta como pigmento; os outros existem para comparação.',
  'model.km': 'Pigmento (Kubelka-Munk, espalhamento estimado)',
  'model.kmeq': 'Pigmento (Kubelka-Munk, espalhamento igual)',
  'model.lin': 'RGB linear (luz)',
  'model.srgb': 'RGB direto (média de hex)',
  'model.km.short': 'Pigmento · KM (espalh. estimado)',
  'model.kmeq.short': 'Pigmento · KM (espalh. igual)',
  'model.lin.short': 'RGB linear',
  'model.srgb.short': 'RGB direto',

  // ---- 2 · Cor-alvo ----
  'target.help':
    'Escolha a cor que você quer reproduzir, em qualquer catálogo; “Livre” permite escolher qualquer cor. Digite para filtrar por código ou nome. Pelo teclado, use Tab para navegar e Enter para escolher.',
  'target.search': 'buscar código ou nome…',
  'tab.free': 'Livre',
  'target.free.color': 'cor livre',
  'target.free.hex': 'cor livre em hexadecimal',
  'target.free.label': 'Cor livre',

  // ---- 3 · Resultado ----
  'result.target': 'alvo',
  'result.mix': 'mistura',
  'result.de': 'ΔE {x}',
  'de.0': 'imperceptível',
  'de.1': 'só lado a lado',
  'de.2': 'muito parecida',
  'de.3': 'parecida',
  'de.4': 'diferente',
  'de.5': 'bem diferente',
  'result.save': 'salvar receita',
  'result.suggest': 'sugerir mistura automática',
  'result.upto': 'até',
  'result.paints': 'tintas',
  'result.onlyOwn': 'só as que tenho',
  'result.col.model': 'modelo',
  'result.col.color': 'cor',
  'result.col.de': 'ΔE00',
  'result.scale':
    'ΔE00 &lt; 1: imperceptível · 1–2: só lado a lado · 2–5: parecida · &gt;5: diferente. A diferença entre “pigmento” e “RGB” é justamente o erro de misturar em RGB.',
  'result.warn':
    'Aviso: tinta acrílica úmida costuma secar um pouco mais escura; o acabamento muda a percepção; e as cores dos catálogos são aproximadas. Trate o resultado como ponto de partida e registre a cor real obtida nas receitas salvas.',
  'sug.calc': 'calculando…',
  'sug.none': 'Nenhuma tinta marcada como “tenho”. Marque no seletor (botão direito) ou desligue o filtro.',
  'sug.count.um': '{n} tinta',
  'sug.count.outros': '{n} tintas',
  'sug.line': '{contagem} · ΔE {x} ({texto})',
  'sug.use': 'usar',

  // ---- 4 · Equivalentes ----
  'eq.from': 'a partir da',
  'eq.from.target': 'cor-alvo',
  'eq.from.mix': 'mistura calculada',
  'eq.hint': 'menor ΔE00 = mais parecida · clique numa cor para usá-la como alvo',
  'eq.help':
    'O número é o ΔE00 (diferença de cor percebida). O selo AMMO ou AK indica que o próprio fabricante declara a equivalência; vale conferir o ΔE ao lado, porque os catálogos usam amostras de origens diferentes.',
  'eq.empty': 'Adicione tintas à mistura para ver os equivalentes da mistura calculada.',
  'eq.tip': '{code} {nome} {hex} · ΔE00 {de} ({texto})',
  'eq.tip.official': 'equivalência indicada no catálogo {fontes}',
  'eq.tip.click': 'clique para usar como cor-alvo',
  'eq.and': ' e ',

  // ---- 5 · Receitas ----
  'rec.help':
    'Depois de misturar de verdade, registre a “cor obtida”: o app mostra o erro real do modelo, que ajuda a calibrar a “força” das tintas.',
  'rec.empty':
    'Nenhuma receita salva. Monte uma mistura e clique em “salvar receita”. Depois de misturar de verdade, registre a cor obtida para ver o erro real do modelo.',
  'rec.default': 'Receita',
  'rec.target': 'alvo',
  'rec.calc': 'calculada',
  'rec.obtained': 'obtida',
  'rec.de.calc': 'ΔE calculado {x}',
  'rec.de.real': 'ΔE real {x}',
  'rec.err': 'erro do modelo {x}',
  'rec.got': 'cor obtida',
  'rec.note': 'anotação',
  'rec.load': 'carregar',
  'rec.delete': 'excluir',
  'rec.prompt': 'Nome da receita:',
  'rec.needMix': 'Adicione tintas à mistura primeiro.',
  'rec.badFile': 'Arquivo inválido.',
  'rec.export': 'exportar JSON',
  'rec.import': 'importar JSON',

  // ---- seletor de tintas (janela) ----
  'picker.title': 'Escolha uma tinta {linha}',
  'picker.search': 'buscar…',
  'picker.help':
    'Clique (ou Enter) para adicionar. Botão direito, toque longo ou a tecla T marcam “tenho esta tinta” (borda verde).',

  // ---- sobre ----
  'about.title': 'Sobre',
  'about.credits':
    'Ideia e direção: <a href="https://davidbuzatto.com.br/" target="_blank" rel="noopener">Prof. Dr. David Buzatto</a>. ' +
    'Desenvolvimento: <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude</a> (Anthropic), assistente de IA, sob a direção do autor.',
  'about.license':
    'O código é distribuído sob a <a href="https://github.com/davidbuzatto/misturador-tintas/blob/HEAD/LICENSE" target="_blank" rel="noopener">licença MIT</a> ' +
    '(<a href="https://github.com/davidbuzatto/misturador-tintas" target="_blank" rel="noopener">repositório</a>).',
  'about.data':
    'As cores são aproximações obtidas de catálogos e sites dos fabricantes, sem vínculo, patrocínio ou aprovação deles. Nomes e marcas ' +
    'pertencem aos seus titulares. Os valores servem como ponto de partida: confira sempre com a tinta real, e lembre que impressão, tela e ' +
    'acabamento alteram a aparência.',
  'about.refs.title': 'Para saber mais',
  'about.refs.intro': 'A teoria e os algoritmos por trás do cálculo:',
  'ref.km': 'Teoria de Kubelka-Munk: como a luz se espalha e é absorvida numa camada de tinta (Wikipédia, em inglês)',
  'ref.subtractive': 'Mistura subtrativa de cores: por que misturar tintas não é o mesmo que misturar luzes (Wikipédia, em inglês)',
  'ref.mixbox': 'Mixbox: mistura realista de pigmentos para pintura digital, de Sochorová e Jamriška (2021), baseada em Kubelka-Munk',
  'ref.jakob': 'Jakob e Hanika (2019): espaço de funções de baixa dimensão para obter espectros a partir de cores RGB. A reflectância suave de 3 coeficientes usada aqui segue essa ideia',
  'ref.wyman': 'Wyman, Sloan e Shirley (2013): aproximações analíticas simples das funções de casamento de cor CIE XYZ',
  'ref.illuminant': 'Iluminantes-padrão da CIE, incluindo o D65 usado nos cálculos (Wikipédia, em inglês)',
  'ref.srgb': 'sRGB: o espaço de cor das telas e a curva de gama (Wikipédia, em inglês)',
  'ref.cielab': 'Espaço de cor CIELAB (L*a*b*), em que as diferenças de cor são medidas (Wikipédia, em inglês)',
  'ref.de00': 'Sharma, Wu e Dalal (2005): fórmula de diferença de cor CIEDE2000 (ΔE00), notas de implementação e dados de teste',
  'ref.nm': 'Método de Nelder-Mead: otimização sem derivadas, usada para ajustar o espectro de cada tinta (Wikipédia, em inglês)',
};
