import sharp from "sharp";
import fs from "fs";
const SRC = "C:/Users/alber/Downloads/loh.jpeg", S = 4;
const { data, info } = await sharp(SRC).resize({ width: 230 * S, kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const ink = new Uint8Array(W*H), navy = new Uint8Array(W*H), blue = new Uint8Array(W*H);
for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
  const i=(y*W+x)*C, r=data[i], g=data[i+1], b=data[i+2], lum=.299*r+.587*g+.114*b, k=y*W+x;
  if (lum>195) continue; ink[k]=1;
  if (b>110 && b-r>55 && lum>65) blue[k]=1; else if (lum<95) navy[k]=1;
}
let minx=1e9,maxx=-1,miny=1e9,maxy=-1;
for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(ink[y*W+x]){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}
const SQ3=Math.sqrt(3), DL=[-SQ3,1], DR=[SQ3,1], UL=[-SQ3,-1];
const add=(p,d,t)=>[p[0]+d[0]*t,p[1]+d[1]*t];
function navyPoly(P){const{cx,cy,A,Hh,t1,t2,t3,t4,t5,t6}=P,drop=A/SQ3;
  const apex=[cx,cy-Hh],hexUR=[cx+A,cy-Hh+drop],hexUL=[cx-A,cy-Hh+drop];
  const p3=add(hexUR,DL,t1),p4=add(p3,UL,t2),p5=add(p4,DL,t3),p6=[p5[0],p5[1]+t4],p7=add(p6,DR,t5),p8=add(p7,DL,t6);
  const p9=[cx-A,p8[1]-(p8[0]-(cx-A))/SQ3];
  return [apex,hexUR,p3,p4,p5,p6,p7,p8,p9,hexUL];}
const rot=(p,cx,cy)=>[2*cx-p[0],2*cy-p[1]];
function inside(poly,x,y){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&x<((xj-xi)*(y-yi))/(yj-yi)+xi)c=!c;}return c;}
function score(P){const n=navyPoly(P),b=n.map(p=>rot(p,P.cx,P.cy));let inter=0,uni=0,sp=0,spN=0;
  for(let y=miny-6;y<=maxy+6;y++)for(let x=minx-6;x<=maxx+6;x++){const k=y*W+x,
    iN=inside(n,x+.5,y+.5),iB=inside(b,x+.5,y+.5),m=(iN||iB)?1:0,g=ink[k]?1:0;
    if(m&&g)inter++; if(m||g)uni++;
    if(navy[k]){spN++;if(iN)sp++;} if(blue[k]){spN++;if(iB)sp++;}}
  return {iou:inter/uni,split:sp/spN};}
const KEYS=["cx","cy","A","Hh","t1","t2","t3","t4","t5","t6"];
let P={cx:451.5,cy:405.5,A:174,Hh:214.25,t1:43.4065,t2:57.05285,t3:51.4041,t4:54.486,t5:50.0735,t6:48.897};
let best=score(P).iou;
for(let step=4;step>=0.0625;step/=2){let imp=true;while(imp){imp=false;
  for(const k of KEYS)for(const d of [step,-step]){const Q={...P,[k]:P[k]+d},s=score(Q).iou;
    if(s>best+1e-7){best=s;P=Q;imp=true;}}}}
// randomized polish (deterministic LCG) — escapes shallow greedy optima
let seed=12345; const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
for(let it=0;it<400;it++){const Q={...P};for(const k of KEYS)Q[k]+=(rnd()-.5)*2.0;
  const s=score(Q).iou; if(s>best){best=s;P=Q;}}
for(let step=1;step>=0.0625;step/=2){let imp=true;while(imp){imp=false;
  for(const k of KEYS)for(const d of [step,-step]){const Q={...P,[k]:P[k]+d},s=score(Q).iou;
    if(s>best+1e-7){best=s;P=Q;imp=true;}}}}
const fin=score(P);
console.log("FIT IoU",fin.iou.toFixed(4),"split-acc",fin.split.toFixed(4));
// ---- model space (centered, height 2, y up) ----
const n=navyPoly(P), b=n.map(p=>rot(p,P.cx,P.cy));
const toM=p=>[Number(((p[0]-P.cx)/P.Hh).toFixed(5)),Number((-(p[1]-P.cy)/P.Hh).toFixed(5))];
const nM=n.map(toM), bM=b.map(toM);
fs.writeFileSync("design/logo-mark/mark-geometry.json",JSON.stringify({
  note:"SERSAN hex mark fitted to the reference raster. Model space: centered, height=2 (y up). Every edge is vertical or +/-30 deg. blue = navy rotated 180 deg about the origin.",
  source:"Downloads/loh.jpeg (230x177 reference)", fit:fin, halfWidth:Number((P.A/P.Hh).toFixed(5)),
  pixelFit:P, navy:nM, blue:bM},null,2));
console.log("half-width(height=2) =",(P.A/P.Hh).toFixed(4),"→ width",(2*P.A/P.Hh).toFixed(4));
nM.forEach((p,i)=>console.log("  n"+i,p.join(", ")));
// ---- SVG + proofs ----
const SC=90, pt=p=>`${(100+p[0]*SC).toFixed(3)},${(100-p[1]*SC).toFixed(3)}`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <polygon fill="#132741" points="${nM.map(pt).join(" ")}"/>
  <polygon fill="#2280DC" points="${bM.map(pt).join(" ")}"/>
</svg>\n`;
fs.writeFileSync("design/logo-mark/sersan-hex-mark.svg",svg);
const strokeSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`+
  [[n,"#00FF66"],[b,"#FF2299"]].map(([q,c])=>`<polygon fill="none" stroke="${c}" stroke-width="2.5" points="${q.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}"/>`).join("")+`</svg>`;
await sharp(SRC).resize({width:230*4,kernel:"lanczos3"})
  .composite([{input:await sharp(Buffer.from(strokeSvg)).resize({width:W,height:H,fit:"fill"}).png().toBuffer(),top:0,left:0}])
  .extract({left:250,top:170,width:430,height:480}).png().toFile("design/logo-mark/_overlay.png");
await sharp(Buffer.from(svg)).resize({width:430}).flatten({background:"#F9F9F9"}).png().toFile("design/logo-mark/_recon.png");
console.log("wrote sersan-hex-mark.svg, mark-geometry.json, _overlay.png, _recon.png");
