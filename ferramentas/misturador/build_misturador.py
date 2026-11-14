# Regera ../../misturador-tintas.html a partir de tpl.html + engine.js + ../../dados/*.json
import json,re
import os
U=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','dados')+os.sep
ac=json.load(open(U+'acrilex-cores-oficial.json',encoding='utf8'))
tm=json.load(open(U+'tamiya-cores-oficial.json',encoding='utf8'))
rv=json.load(open(U+'revell-cores-oficial.json',encoding='utf8'))
def rl(d):
    n=d['name']
    s=n if (d['finish']=='Clear' and 'lear' in n and d['sku'][2:] not in('101','102')) else f"{d['finish']} {n}"
    if d.get('ral'):s+=f" (RAL {d['ral']})"
    return s
C={'acrilex':[{'code':d['code'],'name':d['name'],'hex':d['hex']} for d in ac],
 'tamiya':[{'code':d['code'],'name':d['name'],'hex':d['hex']} for d in tm if d.get('hex') and not d.get('aditivo')],
 'revellA':[{'code':d['sku'],'name':rl(d),'hex':d['hex']} for d in rv if d['linha']=='Aqua Color'],
 'revellE':[{'code':d['sku'],'name':rl(d),'hex':d['hex']} for d in rv if d['linha']=='Email Color']}
HERE=os.path.dirname(os.path.abspath(__file__))
t=open(os.path.join(HERE,'tpl.html'),encoding='utf8').read()
eng=open(os.path.join(HERE,'engine.js'),encoding='utf8').read().split("if(typeof module")[0]
t=t.replace('/*ENGINE*/',eng).replace('/*DATA*/','var CATALOGS='+json.dumps(C,ensure_ascii=False,separators=(',',':'))+';')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','misturador-tintas.html'),'w',encoding='utf8').write(t)
print({k:len(v) for k,v in C.items()},len(t))
