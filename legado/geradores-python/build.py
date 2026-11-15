import re,json,os,sys
sys.path.insert(0,'.')
raw=dict(p.split() for p in open('official_raw.txt').read().strip().split(';'))
raw={int(k):v for k,v in raw.items()}
src=open(os.path.expanduser('~/mnt/paletas de cores/tamiya-catalog.html'),encoding='utf8').read()
old={m.group(1):(m.group(2),m.group(3)) for m in re.finditer(r"\['((?:X|XF|LP)-\d+[A-Z]?)','([^']*)',(?:'(#[0-9a-f]{6})'|null)",src)}
names={k:v[0] for k,v in old.items()}
names['XF-94']='Wood Brown'
# itens sem cor propria (aditivos / thinner)
ADD={'X-20A','X-21','X-22','X-35','XF-86','LP-9','LP-10','LP-22','LP-23','LP-24','LP-49','LP-2X'}
white_add={'LP-2','LP-4','LP-39','LP-43'}  # brancos reais (cor = branco)
def code(item):
    s=str(item)
    if s.startswith('815'): return f"X-{item-81500}"
    if s.startswith('817'): return f"XF-{item-81700}"
    if s.startswith('810'): return f"X-{item-81000}"
    if s.startswith('813'): return f"XF-{item-81300}"
    if s.startswith('800'): return f"X-{item-80000}"
    if s.startswith('803'): return f"XF-{item-80300}"
    if s.startswith('821'): return f"LP-{item-82100}"
fam={'815':'acrilica_mini','817':'acrilica_mini','810':'acrilica_23ml','813':'acrilica_23ml','800':'esmalte','803':'esmalte','821':'lacquer'}
data={}
for item,hexv in raw.items():
    c=code(item);f=fam[str(item)[:3]]
    if not c: continue
    n=int(c.split('-')[1])
    if c in ('X-20','X-30','X-20A'): continue
    d=data.setdefault(c,{'code':c,'name':names.get(c,'?')})
    d[f]=hexv
fixwhite={'LP-2','LP-4','LP-39','LP-43'}
for c,d in data.items():
    if c in fixwhite: d['lacquer']='#ffffff'
    d['aditivo']=c in ADD
    # hex principal: mini > 23ml > esmalte > lacquer
    for f in ('acrilica_mini','acrilica_23ml','esmalte','lacquer'):
        if f in d: d['hex']=d[f];d['base']=f;break
    if d['aditivo']: d.pop('hex',None)
# brancos que ficaram aditivo-like
out=sorted(data.values(),key=lambda d:(d['code'].split('-')[0],int(re.sub(r'\D','',d['code'].split('-')[1]))))
json.dump(out,open('tamiya-cores-oficial.json','w'),ensure_ascii=False,indent=1)
print(len(out),'codigos;',sum(1 for d in out if d.get('hex')),'com cor;',sum(1 for d in out if d['aditivo']),'aditivos')
print('sem nome:',[d['code'] for d in out if d['name']=='?'])
