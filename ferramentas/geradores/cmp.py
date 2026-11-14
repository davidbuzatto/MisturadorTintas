import re,math,sys,json
src=open(sys.argv[1],encoding='utf8').read()
cur={}
for m in re.finditer(r"\['((?:X|XF|LP)-\d+[A-Z]?)','([^']*)','(#[0-9a-fA-F]{6})'",src): cur[m.group(1)]=(m.group(2),m.group(3).lower())
sm={}
for l in open(sys.argv[2]):
    p=l.split()
    if len(p)==2: sm[p[0]]=p[1].lower()
def lab(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    r,g,b=f(r),f(g),f(b)
    X=(0.4124564*r+0.3575761*g+0.1804375*b)/0.95047
    Y=(0.2126729*r+0.7151522*g+0.0721750*b)
    Z=(0.0193339*r+0.1191920*g+0.9503041*b)/1.08883
    g_=lambda t: t**(1/3) if t>0.008856 else 7.787*t+16/116
    fx,fy,fz=g_(X),g_(Y),g_(Z)
    return 116*fy-16,500*(fx-fy),200*(fy-fz)
def de00(a,b):
    L1,a1,b1=a;L2,a2,b2=b
    C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)))
    a1p,a2p=(1+G)*a1,(1+G)*a2
    C1p,C2p=math.hypot(a1p,b1),math.hypot(a2p,b2)
    h=lambda y,x:(math.degrees(math.atan2(y,x))%360) if (x or y) else 0
    h1,h2=h(b1,a1p),h(b2,a2p)
    dL=L2-L1;dC=C2p-C1p
    if C1p*C2p==0: dh=0
    else:
        dh=h2-h1
        if dh>180: dh-=360
        elif dh<-180: dh+=360
    dH=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2))
    Lb=(L1+L2)/2;Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hb=h1+h2
    elif abs(h1-h2)<=180: hb=(h1+h2)/2
    elif h1+h2<360: hb=(h1+h2+360)/2
    else: hb=(h1+h2-360)/2
    T=1-0.17*math.cos(math.radians(hb-30))+0.24*math.cos(math.radians(2*hb))+0.32*math.cos(math.radians(3*hb+6))-0.2*math.cos(math.radians(4*hb-63))
    dth=30*math.exp(-((hb-275)/25)**2)
    Rc=2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    Sl=1+0.015*(Lb-50)**2/math.sqrt(20+(Lb-50)**2)
    Sc=1+0.045*Cbp;Sh=1+0.015*Cbp*T
    Rt=-math.sin(math.radians(2*dth))*Rc
    return math.sqrt((dL/Sl)**2+(dC/Sc)**2+(dH/Sh)**2+Rt*(dC/Sc)*(dH/Sh))
rows=[]
for k,h in sm.items():
    if k in cur:
        n,c=cur[k]; rows.append((de00(lab(c),lab(h)),k,n,c,h))
rows.sort(reverse=True)
import statistics
d=[r[0] for r in rows]
print("n=",len(rows),"mediana=%.1f media=%.1f"%(statistics.median(d),statistics.mean(d)))
for lo,hi,lbl in [(0,5,'<5 (quase igual)'),(5,10,'5-10 (perceptivel)'),(10,20,'10-20 (claramente diferente)'),(20,999,'>20 (outra cor)')]:
    print(lbl,sum(1 for x in d if lo<=x<hi))
print("missing in SM:",[k for k in cur if k.split('-')[0] in('X','XF') and k not in sm])
print("--- piores 25")
for r in rows[:25]: print("%5.1f %-6s %-26s atual %s  scalemates %s"%r)
print("--- melhores 8")
for r in rows[-8:]: print("%5.1f %-6s %-26s atual %s  scalemates %s"%r)
json.dump([dict(code=r[1],name=r[2],current=r[3],scalemates=r[4],dE00=round(r[0],1)) for r in rows],open('cmp_acrylic.json','w'),ensure_ascii=False,indent=1)
