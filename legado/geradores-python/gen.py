import json,re,html
D=json.load(open('tamiya-cores-oficial.json'))
orig=open('orig_i.html',encoding='utf8').read()
# equivalencias LP (mantidas do catalogo anterior)
eq={m.group(1):m.group(2) for m in re.finditer(r"\['(LP-\d+)','[^']*',(?:'#[0-9a-f]{6}'|null),'((?:X|XF)-\d+)'\]",orig)}
def avail(d):
    return ''
    a=[]
    if 'acrilica_mini' in d:a.append('Mini 10 ml')
    if 'acrilica_23ml' in d:a.append('Acrílica 23 ml')
    if 'esmalte' in d:a.append('Esmalte')
    if 'lacquer' in d:a.append('Lacquer')
    return ' · '.join(a)
ser={'X':[], 'XF':[], 'LP':[]}
for d in D:
    s=d['code'].split('-')[0]
    if s in ser: ser[s].append(d)
def hexv(d): return None if d.get('aditivo') else d.get('hex')
n_tot=sum(len(v) for v in ser.values())
# ---------- interativo
def js(d):
    h=hexv(d);e=eq.get(d['code'])
    parts=[repr(d['code']),repr(d['name']),repr(h) if h else 'null',repr(e) if e else 'null',repr(avail(d))]
    return '['+','.join(p.replace('"',"'") if False else p for p in parts)+']'
def jsq(s): return json.dumps(s,ensure_ascii=False)
def jsitem(d):
    h=hexv(d);e=eq.get(d['code'])
    return '['+','.join([jsq(d['code']),jsq(d['name']),jsq(h) if h else 'null',jsq(e) if e else 'null',jsq(avail(d))])+']'
data='var DATA = {\n'+',\n'.join(f"    {k.lower()}: [\n"+',\n'.join('      '+jsitem(d) for d in ser[k])+'\n    ]' for k in ('X','XF','LP'))+'\n  };'
out=re.sub(r"var DATA = \{.*?\n  \};",lambda m:data,orig,flags=re.S)
out=out.replace("card.appendChild(nameEl);","card.appendChild(nameEl);\n    if (item[4]) { var av = document.createElement('div'); av.className = 'avail'; av.textContent = item[4]; card.appendChild(av); }\n    card.dataset.search += ' ' + (item[4]||'').toLowerCase();")
out=out.replace("  .name{font-size:12.5px; font-weight:500; line-height:1.3;}","  .name{font-size:12.5px; font-weight:500; line-height:1.3;}\n  .avail{font-size:10px; color:var(--ink-dim); font-family:'IBM Plex Mono',monospace; line-height:1.35;}")
out=out.replace("189 cores das linhas Acrílica e Lacquer, pesquisáveis",f"{n_tot} cores das linhas Acrílica e Lacquer, pesquisáveis")
out=re.sub(r"<strong>Escopo:</strong>.*?</div>",lambda m:"<strong>Escopo:</strong> linha Acrylic Mini (X = brilhante/gloss, XF = fosco/flat) e linha Lacquer Paint (LP). Não inclui sprays TS/AS, Panel Line Accent nem produtos de weathering.\n  <br><br>\n  <strong>Sobre as cores:</strong> amostradas diretamente das imagens de cada tinta no site oficial da Tamiya (novembro/2026). A própria Tamiya informa que são aproximações para exibição na tela; o tom real da tinta pode variar. Metálicos e perolizados são os que mais se afastam. Onde uma cor LP é comercializada como equivalente de uma X/XF, aparece como \"≈ código\".\n</div>",out,count=1,flags=re.S)
out=out.replace("Códigos e nomes conferidos contra o catálogo público da Tamiya (linhas Acrylic Mini e Lacquer Paint).","Códigos e nomes conferidos contra o catálogo público da Tamiya; cores amostradas das imagens oficiais do site da Tamiya. XF-94 não aparece na listagem oficial, mas tem página de imagem.")
open('tamiya-catalog-oficial.html','w',encoding='utf8').write(out)
# ---------- impressao
p=open('orig_p.html',encoding='utf8').read()
def card(d):
    h=hexv(d);e=eq.get(d['code']);a=avail(d)
    sw=f'<div class="swatch" style="background:{h}"></div>' if h else '<div class="swatch-additive">aditivo</div>'
    eqs=f'<span class="eq">≈ {e}</span>' if e else ''
    return f'<div class="card">\n  {sw}\n  <div class="code-row"><span class="code">{d["code"]}</span>{eqs}</div>\n  <div class="name">{html.escape(d["name"])}</div>\n</div>'
titles={'X':'Acrílica — Série X','XF':'Acrílica — Série XF','LP':'Lacquer — Série LP'}
secs=''.join(f'<section>\n  <div class="section-head"><h2>{titles[k]}</h2><span class="section-count">{len(ser[k])} cores</span></div>\n  <div class="grid">\n'+'\n'.join(card(d) for d in ser[k])+'\n  </div>\n</section>\n\n' for k in ('X','XF','LP'))
p=re.sub(r"<section>.*(?=<footer>)",lambda m:secs,p,count=1,flags=re.S)
p=p.replace("  .name{font-size:12.5px; font-weight:500; line-height:1.3;}","  .name{font-size:12.5px; font-weight:500; line-height:1.3;}\n  .avail{font-size:9px; color:var(--ink-dim); font-family:'IBM Plex Mono',monospace; line-height:1.3;}",1)
p=p.replace("189 cores das linhas Acrílica e Lacquer.",f"{n_tot} cores das linhas Acrílica e Lacquer.")
p=re.sub(r"<strong>Escopo:</strong>.*?</div>",lambda m:"<strong>Escopo:</strong> linha Acrylic Mini (X = brilhante/gloss, XF = fosco/flat) e linha Lacquer Paint (LP). Não inclui sprays TS/AS, Panel Line Accent nem produtos de weathering.\n  <br><br>\n  <strong>Sobre as cores:</strong> amostradas das imagens oficiais da Tamiya (novembro/2026), que a própria marca descreve como aproximações para tela. A cor impressa depende da impressora/tela. Onde uma cor LP é equivalente de uma X/XF, aparece como \"≈ código\".\n</div>",p,count=1,flags=re.S)
p=p.replace("Códigos e nomes conferidos contra o catálogo público da Tamiya (linhas Acrylic Mini e Lacquer Paint).","Códigos e nomes conferidos contra o catálogo público da Tamiya; cores amostradas das imagens oficiais do site.")
open('tamiya-catalog-print-oficial.html','w',encoding='utf8').write(p)
print({k:len(v) for k,v in ser.items()},n_tot)
