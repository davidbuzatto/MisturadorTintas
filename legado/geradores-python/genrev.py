import json,re,html
D=json.load(open('revell-cores-oficial.json'))
def label(d):
    n=d['name']; f=d['finish']
    s=(f+' ' if d['finish']!='Clear' or True else '')+n
    if d['ral']: s+=f" (RAL {d['ral']})"
    return s
def label(d):
    n=d['name']
    s=n if d['finish']=='Clear' and n.lower().find('clear')>=0 and not d['ral'] and d['sku'][2:] not in('101','102') else f"{d['finish']} {n}"
    if d['ral']: s+=f" (RAL {d['ral']})"
    return s
# fix: 36101/102 -> "Gloss Clear"/"Matte Clear" ; 36730.. -> "Orange Clear"
for d in D:
    d['label']=label(d)
ser={'Aqua Color':[],'Email Color':[]}
for d in D: ser[d['linha']].append(d)
bys={d['sku']:d for d in D}
def eq(d):
    o=('32' if d['sku'].startswith('36') else '36')+d['sku'][2:]
    return o if o in bys else None
n_tot=len(D)
jq=lambda s:json.dumps(s,ensure_ascii=False)
def item(d):
    e=eq(d); return '['+','.join([jq(d['sku']),jq(d['label']),jq(d['hex']),jq(e) if e else 'null',jq('')])+']'
out=open('tamiya-catalog-oficial.html',encoding='utf8').read()
data='var DATA = {\n'+',\n'.join(f"    {k}: [\n"+',\n'.join('      '+item(d) for d in ser[n])+'\n    ]' for k,n in (('aqua','Aqua Color'),('email','Email Color')))+'\n  };'
out=re.sub(r"var DATA = \{.*?\n  \};",lambda m:data,out,flags=re.S)
R=[('<title>Catálogo Tamiya</title>','<title>Catálogo Revell</title>'),
('<h1>Catálogo Tamiya</h1>','<h1>Catálogo Revell</h1>'),
('Referência · Acrílica (X / XF) + Lacquer (LP)','Referência · Aqua Color (acrílica) + Email Color (esmalte)'),
('190 cores das linhas Acrílica e Lacquer',f'{n_tot} cores das linhas Aqua Color e Email Color'),
('(ex: XF-60, dark yellow, khaki)','(ex: 36131, fiery red, RAL 3000)'),
('<button class="tab" data-tab="x">Acrílica X</button>','<button class="tab" data-tab="aqua">Aqua Color</button>'),
('<button class="tab" data-tab="xf">Acrílica XF</button>','<button class="tab" data-tab="email">Email Color</button>'),
('    <button class="tab" data-tab="lp">Lacquer LP</button>\n',''),
("tamiya-catalogo-acrilex-notes","revell-catalogo-acrilex-notes"),
('Acrílica — Série XF','Email Color — esmalte'),
('Acrílica — Série X','Aqua Color — acrílica à base d\'água'),
]
for a,b in R:
    assert a in out,a; out=out.replace(a,b)
# remove LP section & footer/note
out=re.sub(r'<section id="section-lp">.*?</section>\n\n','',out,flags=re.S)
out=out.replace('section-xf','section-email').replace('count-xf','count-email').replace('grid-xf','grid-email').replace('section-x','section-aqua').replace('count-x','count-aqua').replace('grid-x','grid-aqua')
out=re.sub(r"<strong>Escopo:</strong>.*?</div>",lambda m:'<strong>Escopo:</strong> todas as tintas Revell Aqua Color (18 ml, acrílica) e Email Color (14 ml, esmalte) da listagem oficial. Os acabamentos são Gloss, Matte, Silk, Metallic e as translúcidas (Clear). Não inclui sprays, Contacta, Painta nem produtos de weathering.\n  <br><br>\n  <strong>Sobre as cores:</strong> amostradas das esferas de cor mostradas no site oficial da Revell (novembro/2026): cor do corpo da esfera, descontando o reflexo branco dos acabamentos brilhantes. São aproximações para tela; metálicos e translúcidos são os que mais se afastam. "≈ código" aponta a mesma cor na outra linha (Aqua ↔ Email).\n</div>',out,count=1,flags=re.S)
out=re.sub(r"<footer>.*?</footer>","<footer>\n  Códigos e nomes conforme o catálogo público da Revell (carrera-revell-toys.com); cores amostradas das imagens oficiais. Os RAL entre parênteses são os informados no nome do produto.\n</footer>",out,flags=re.S)
# JS: remove lp refs, rename x/xf
out=out.replace("  var gridLP = document.getElementById('grid-lp');\n","").replace("  DATA.lp.forEach(function(item){ gridLP.appendChild(buildCard(item)); });\n","").replace("  document.getElementById('count-lp').textContent = DATA.lp.length + ' cores';\n","")
out=out.replace("gridXF","gridEmail").replace("gridX","gridAqua").replace("DATA.xf","DATA.email").replace("DATA.x.","DATA.aqua.").replace("DATA.x ","DATA.aqua ")
out=out.replace(", document.getElementById('section-lp')","").replace("    lp: [document.getElementById('section-lp')]\n","").replace("    xf: [document.getElementById('section-email')],","    email: [document.getElementById('section-email')]").replace("    x: [document.getElementById('section-aqua')],","    aqua: [document.getElementById('section-aqua')],")
open('revell-catalog-oficial.html','w',encoding='utf8').write(out)
# print
p=open('tamiya-catalog-print-oficial.html',encoding='utf8').read()
def card(d):
    e=eq(d);eqs=f'<span class="eq">≈ {e}</span>' if e else ''
    return f'<div class="card">\n  <div class="swatch" style="background:{d["hex"]}"></div>\n  <div class="code-row"><span class="code">{d["sku"]}</span>{eqs}</div>\n  <div class="name">{html.escape(d["label"])}</div>\n</div>'
secs=''.join(f'<section>\n  <div class="section-head"><h2>{t}</h2><span class="section-count">{len(ser[n])} cores</span></div>\n  <div class="grid">\n'+'\n'.join(card(d) for d in ser[n])+'\n  </div>\n</section>\n\n' for n,t in (('Aqua Color','Aqua Color — acrílica'),('Email Color','Email Color — esmalte')))
p=re.sub(r"<section>.*(?=<footer>)",lambda m:secs,p,count=1,flags=re.S)
for a,b in [('Catálogo Tamiya','Catálogo Revell'),('Referência · Acrílica (X / XF) + Lacquer (LP)','Referência · Aqua Color + Email Color'),('190 cores das linhas Acrílica e Lacquer',f'{n_tot} cores das linhas Aqua Color e Email Color')]:
    p=p.replace(a,b)
p=re.sub(r"<strong>Escopo:</strong>.*?</div>",lambda m:'<strong>Escopo:</strong> Revell Aqua Color (acrílica) e Email Color (esmalte).\n  <br><br>\n  <strong>Sobre as cores:</strong> amostradas das imagens oficiais da Revell (novembro/2026); a cor impressa depende da impressora/tela. "≈ código" indica a mesma cor na outra linha.\n</div>',p,count=1,flags=re.S)
p=re.sub(r"<footer>.*?</footer>","<footer>\n  Códigos e nomes conforme o catálogo público da Revell; cores amostradas das imagens oficiais.\n</footer>",p,flags=re.S)
open('revell-catalog-print-oficial.html','w',encoding='utf8').write(p)
print({k:len(v) for k,v in ser.items()})
