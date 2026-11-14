// ===== Motor de cor: reflectância espectral + Kubelka-Munk =====
const WL=[];for(let l=380;l<=730;l+=10)WL.push(l);
const NB=WL.length;
function _g(l,mu,s1,s2){const t=(l-mu)/(l<mu?s1:s2);return Math.exp(-0.5*t*t);}
const _D65=[49.98,54.65,82.75,91.49,93.43,86.68,104.86,117.01,117.81,114.86,115.92,108.81,109.35,107.80,104.79,107.69,104.41,104.05,100.00,96.33,95.79,88.69,90.01,89.60,87.70,83.29,83.70,80.03,80.21,82.28,78.28,69.72,71.61,74.35,61.60,69.89];
const WX=WL.map((l,i)=>(1.056*_g(l,599.8,37.9,31.0)+0.362*_g(l,442.0,16.0,26.7)-0.065*_g(l,501.1,20.4,26.2))*_D65[i]);
const WY=WL.map((l,i)=>(0.821*_g(l,568.8,46.9,40.5)+0.286*_g(l,530.9,16.3,31.1))*_D65[i]);
const WZ=WL.map((l,i)=>(1.217*_g(l,437.0,11.8,36.0)+0.681*_g(l,459.0,26.0,13.8))*_D65[i]);
const SX=WX.reduce((a,b)=>a+b,0),SY=WY.reduce((a,b)=>a+b,0),SZ=WZ.reduce((a,b)=>a+b,0);
const XN=0.95047,YN=1,ZN=1.08883;
function s2l(c){return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function l2s(c){c=c<0?0:c>1?1:c;return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;}
function hex2lin(h){h=h.replace('#','');return [0,2,4].map(i=>s2l(parseInt(h.substr(i,2),16)/255));}
function lin2hex(l){return '#'+l.map(v=>Math.round(l2s(v)*255).toString(16).padStart(2,'0')).join('');}
function lin2xyz(r,g,b){return [0.4124564*r+0.3575761*g+0.1804375*b,0.2126729*r+0.7151522*g+0.0721750*b,0.0193339*r+0.1191920*g+0.9503041*b];}
function xyz2lin(x,y,z){return [3.2404542*x-1.5371385*y-0.4985314*z,-0.9692660*x+1.8760108*y+0.0415560*z,0.0556434*x-0.2040259*y+1.0572252*z];}
function _f(t){return t>0.008856?Math.cbrt(t):7.787*t+16/116;}
function xyz2lab(x,y,z){const fx=_f(x/XN),fy=_f(y/YN),fz=_f(z/ZN);return [116*fy-16,500*(fx-fy),200*(fy-fz)];}
function lin2lab(l){const x=lin2xyz(l[0],l[1],l[2]);return xyz2lab(x[0],x[1],x[2]);}
function hex2lab(h){return lin2lab(hex2lin(h));}
function spec2xyz(R){let x=0,y=0,z=0;for(let i=0;i<NB;i++){x+=R[i]*WX[i];y+=R[i]*WY[i];z+=R[i]*WZ[i];}return [x/SX*XN,y/SY*YN,z/SZ*ZN];}
function spec2lin(R){const x=spec2xyz(R);return xyz2lin(x[0],x[1],x[2]);}
// ΔE 2000
function dE00(a,b){
  const rad=Math.PI/180,deg=180/Math.PI;
  const C1=Math.hypot(a[1],a[2]),C2=Math.hypot(b[1],b[2]),Cm=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Math.pow(Cm,7)/(Math.pow(Cm,7)+Math.pow(25,7))));
  const a1=(1+G)*a[1],a2=(1+G)*b[1];
  const c1=Math.hypot(a1,a[2]),c2=Math.hypot(a2,b[2]);
  let h1=Math.atan2(a[2],a1)*deg;if(h1<0)h1+=360;
  let h2=Math.atan2(b[2],a2)*deg;if(h2<0)h2+=360;
  const dL=b[0]-a[0],dC=c2-c1;let dh=0;
  if(c1*c2!==0){dh=h2-h1;if(dh>180)dh-=360;else if(dh<-180)dh+=360;}
  const dH=2*Math.sqrt(c1*c2)*Math.sin(dh*rad/2);
  const Lm=(a[0]+b[0])/2,cm=(c1+c2)/2;
  let hm=h1+h2;
  if(c1*c2!==0){if(Math.abs(h1-h2)>180)hm=(h1+h2+(h1+h2<360?360:-360))/2;else hm=(h1+h2)/2;}
  const T=1-0.17*Math.cos((hm-30)*rad)+0.24*Math.cos(2*hm*rad)+0.32*Math.cos((3*hm+6)*rad)-0.20*Math.cos((4*hm-63)*rad);
  const dTh=30*Math.exp(-Math.pow((hm-275)/25,2));
  const Rc=2*Math.sqrt(Math.pow(cm,7)/(Math.pow(cm,7)+Math.pow(25,7)));
  const Sl=1+0.015*Math.pow(Lm-50,2)/Math.sqrt(20+Math.pow(Lm-50,2));
  const Sc=1+0.045*cm,Sh=1+0.015*cm*T,Rt=-Math.sin(2*dTh*rad)*Rc;
  return Math.sqrt(Math.pow(dL/Sl,2)+Math.pow(dC/Sc,2)+Math.pow(dH/Sh,2)+Rt*(dC/Sc)*(dH/Sh));
}
// ----- reflectância suave por sigmoide-polinômio (3 coeficientes) -----
function specFromCoefs(c,out){
  out=out||new Float64Array(NB);
  for(let i=0;i<NB;i++){const t=(WL[i]-380)/350;const x=(c[0]*t+c[1])*t+c[2];let R=0.5+x/(2*Math.sqrt(1+x*x));out[i]=R<0.0005?0.0005:R>0.9995?0.9995:R;}
  return out;
}
function _nm(f,x0,step,iters){
  const n=x0.length;let S=[x0.slice()];
  for(let i=0;i<n;i++){const p=x0.slice();p[i]+=step;S.push(p);}
  let F=S.map(f);
  for(let it=0;it<iters;it++){
    const idx=F.map((_,i)=>i).sort((a,b)=>F[a]-F[b]);S=idx.map(i=>S[i]);F=idx.map(i=>F[i]);
    const c=new Array(n).fill(0);for(let i=0;i<n;i++)for(let j=0;j<n;j++)c[j]+=S[i][j]/n;
    const w=S[n];
    const xr=c.map((v,j)=>v+(v-w[j])),fr=f(xr);
    if(fr<F[0]){const xe=c.map((v,j)=>v+2*(v-w[j])),fe=f(xe);if(fe<fr){S[n]=xe;F[n]=fe;}else{S[n]=xr;F[n]=fr;}}
    else if(fr<F[n-1]){S[n]=xr;F[n]=fr;}
    else{
      const xc=c.map((v,j)=>v+0.5*(w[j]-v)),fc=f(xc);
      if(fc<F[n]){S[n]=xc;F[n]=fc;}
      else{for(let i=1;i<=n;i++){S[i]=S[i].map((v,j)=>S[0][j]+0.5*(v-S[0][j]));F[i]=f(S[i]);}}
    }
  }
  let b=0;for(let i=1;i<=n;i++)if(F[i]<F[b])b=i;return {x:S[b],f:F[b]};
}
const _fitCache=new Map();
function fitHex(hex){
  hex=hex.toLowerCase();
  if(_fitCache.has(hex))return _fitCache.get(hex);
  const lin=hex2lin(hex),tl=lin2lab(lin);
  const buf=new Float64Array(NB);
  const obj=c=>{specFromCoefs(c,buf);const x=spec2xyz(buf);const l=xyz2lab(x[0],x[1],x[2]);return (l[0]-tl[0])**2+(l[1]-tl[1])**2+(l[2]-tl[2])**2+1e-6*(c[0]*c[0]+c[1]*c[1]+c[2]*c[2]);};
  let best=_nm(obj,[0,0,0],20,160);
  let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
  for(let k=0;k<8&&best.f>0.4;k++){
    const x0=[(rnd()-0.5)*160,(rnd()-0.5)*160,(rnd()-0.5)*40];
    const r=_nm(obj,x0,15,160);if(r.f<best.f)best=r;
  }
  best=_nm(obj,best.x,2,200);
  const R=specFromCoefs(best.x);
  const ks=new Float64Array(NB);for(let i=0;i<NB;i++)ks[i]=(1-R[i])*(1-R[i])/(2*R[i]);
  const fl=spec2lin(R);
  const Y=0.2126729*lin[0]+0.7151522*lin[1]+0.0721750*lin[2];
  const o={hex,lin,R,ks,resid:[lin[0]-fl[0],lin[1]-fl[1],lin[2]-fl[2]],Y,S:0.05+0.95*Math.pow(Math.max(Y,0),0.7),err:Math.sqrt(best.f)};
  _fitCache.set(hex,o);return o;
}
// ----- mistura -----
// items: [{p:fit, w:peso (já multiplicado pela força)}]; modelo: km | kmeq | lin | srgb
function mixLin(items,model){
  let tot=0;for(const it of items)tot+=it.w;
  if(tot<=0)return [0,0,0];
  if(model==='lin'){const o=[0,0,0];for(const it of items)for(let k=0;k<3;k++)o[k]+=it.w/tot*it.p.lin[k];return o;}
  if(model==='srgb'){const o=[0,0,0];for(const it of items)for(let k=0;k<3;k++)o[k]+=it.w/tot*l2s(it.p.lin[k]);return o.map(s2l);}
  let den=0;const ks=new Float64Array(NB);
  for(const it of items){const s=model==='kmeq'?1:it.p.S;const a=it.w*s;den+=a;const k=it.p.ks;for(let i=0;i<NB;i++)ks[i]+=a*k[i];}
  const R=new Float64Array(NB);
  for(let i=0;i<NB;i++){const q=ks[i]/den;R[i]=1+q-Math.sqrt(q*q+2*q);}
  const l=spec2lin(R);
  for(const it of items)for(let k=0;k<3;k++)l[k]+=it.w/tot*it.p.resid[k]; // correção p/ que tinta pura = hex exato
  return l;
}
function mixHex(items,model){return lin2hex(mixLin(items,model).map(v=>v<0?0:v>1?1:v));}
function labOfLin(l){return lin2lab(l.map(v=>v<0?0:v>1?1:v));}
// ----- busca automática de receita -----
// paints: [{code,fit,anchor}], targetHex, maxN
function suggest(paints,targetHex,maxN){
  const tl=hex2lab(targetHex);
  const P=paints;
  const ev=(idxs,ws)=>{const items=idxs.map((i,k)=>({p:P[i].fit,w:ws[k]}));return dE00(tl,labOfLin(mixLin(items,'km')));};
  const results=[];
  const dist1=P.map((p,i)=>({i,d:dE00(tl,lin2lab(p.fit.lin))})).sort((a,b)=>a.d-b.d);
  results.push({idx:[dist1[0].i],ws:[1],de:dist1[0].d});
  function gridSearch(pool,n,step){
    let best={de:1e9};
    const units=Math.round(1/step);
    const rec=(start,chosen)=>{
      if(chosen.length===n){
        const wr=(pos,left,cur)=>{
          if(pos===n-1){cur[pos]=left;if(left<1)return;const d=ev(chosen,cur.map(v=>v/units));if(d<best.de)best={de:d,idx:chosen.slice(),ws:cur.map(v=>v/units)};return;}
          for(let v=1;v<=left-(n-1-pos);v++){cur[pos]=v;wr(pos+1,left-v,cur);}
        };
        wr(0,units,new Array(n).fill(0));
        return;
      }
      for(let a=start;a<pool.length;a++){chosen.push(pool[a]);rec(a+1,chosen);chosen.pop();}
    };
    rec(0,[]);return best;
  }
  const allIdx=P.map((_,i)=>i);
  if(maxN>=2&&P.length>=2){const b=gridSearch(allIdx,2,0.05);if(b.idx)results.push(b);}
  const anchors=[];P.forEach((p,i)=>{if(p.anchor)anchors.push(i);});
  const poolN=(k)=>{const s=new Set(dist1.slice(0,k).map(o=>o.i));anchors.forEach(a=>s.add(a));return [...s];};
  if(maxN>=3&&P.length>=3){const b=gridSearch(poolN(20),3,0.05);if(b.idx)results.push(b);}
  if(maxN>=4&&P.length>=4){const b=gridSearch(poolN(14),4,0.1);if(b.idx)results.push(b);}
  for(const r of results){
    if(r.idx.length<2)continue;
    let improved=true,guard=0;
    while(improved&&guard++<200){
      improved=false;
      for(let a=0;a<r.idx.length;a++)for(let b=0;b<r.idx.length;b++){
        if(a===b)continue;
        if(r.ws[a]<=0.0101)continue;
        const w=r.ws.slice();w[a]-=0.01;w[b]+=0.01;
        const d=ev(r.idx,w);
        if(d<r.de-1e-6){r.ws=w;r.de=d;improved=true;}
      }
    }
  }
  return results;
}
if(typeof module!=='undefined')module.exports={fitHex,mixHex,mixLin,dE00,hex2lab,lin2lab,suggest,lin2hex};
