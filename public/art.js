// Small, hand-drawn spacecraft built from faceted hull and engine panels.
export const ships = ['Atlas','Orión','Vega','Lince','Nova'];
const hulls = [
  [[-49,-9],[-29,-12],[-13,-22],[20,-22],[12,-10],[45,-7],[57,0],[45,7],[12,10],[20,22],[-13,22],[-29,12],[-49,9]],
  [[-44,-12],[-12,-13],[-31,-25],[0,-21],[24,-8],[48,0],[24,8],[0,21],[-31,25],[-12,13],[-44,12]],
  [[-38,-8],[-29,-12],[-37,-23],[-12,-18],[8,-9],[37,-4],[46,0],[37,4],[8,9],[-12,18],[-37,23],[-29,12],[-38,8]],
  [[-47,-19],[-5,-11],[39,-4],[47,0],[39,4],[-5,11],[-47,19],[-24,3],[-24,-3]],
  [[-29,-17],[-14,-7],[27,-4],[39,0],[27,4],[-14,7],[-29,17],[-34,11],[-24,0],[-34,-11]]
];
function polygon(g,points,fill) {
  g.fillStyle=fill; g.beginPath();
  points.forEach(([x,y],i)=>i ? g.lineTo(x,y) : g.moveTo(x,y));
  g.closePath(); g.fill();
}
function craft(g,type,x,y,scale,angle=0) {
  g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
  const h=hulls[type];
  const rear=Math.min(...h.map(v=>v[0]))+4;
  for (const y of [-5,5]) {
    const flame=g.createLinearGradient(rear-25,0,rear,0);
    flame.addColorStop(0,'#4fe2fb00'); flame.addColorStop(1,'#b8ffff');
    polygon(g,[[rear,y-2],[rear-26,y],[rear,y+2]],flame);
  }
  polygon(g,h.map(([x,y])=>[x,y+2.5]),'#263c4a');
  polygon(g,h,'#8eabb6');
  g.save();g.clip(); polygon(g,[[-60,-30],[60,-30],[60,0],[-60,0]],'#d6e0df');
  for(let i=-39;i<40;i+=11) polygon(g,[[i,-24],[i+2,-24],[i+9,24],[i+8,24]],'#687c89');
  polygon(g,[[-18,-24],[-11,-24],[-4,24],[-11,24]],'#ef8654');
  g.restore();
  polygon(g,[[-30,0],[-12,-6],[15,-4],[31,0],[10,4],[-16,5]],'#435866');
  polygon(g,[[-12,-3],[10,-3],[19,0],[5,1]],'#baf9ec');
  g.restore();
}
function context(canvas,w,h) {
  const d=Math.min(devicePixelRatio || 1,2);
  canvas.width=w*d;canvas.height=h*d;
  const g=canvas.getContext('2d');g.scale(d,d);return g;
}
export function mini(canvas,i) {
  const g=context(canvas,120,58);craft(g,i,59,29,0.97,-0.08);
}
export function scene(canvas) {
  const w=960,h=480,g=context(canvas,w,h);
  const sky=g.createLinearGradient(0,0,w,h);
  sky.addColorStop(0,'#0e202d');sky.addColorStop(.58,'#213443');sky.addColorStop(1,'#101e31');
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  let seed=17;
  function rnd(){ seed=(1664525*seed+1013904223)>>>0;return seed/4294967296; }
  for(let i=0;i<550;i++){
    g.globalAlpha=.15+rnd()*.7;g.fillStyle='#e4faf9';const s=.4+rnd()*1.4;g.fillRect(rnd()*w,rnd()*h,s,s);
  }
  g.globalAlpha=1;
  g.save();g.translate(687,245);g.rotate(-.29);
  for(let i=0;i<55;i++) {
    g.strokeStyle='rgba(186,173,151,'+(.02+rnd()*.12)+')';
    g.beginPath();g.ellipse(0,0,183+i*2.8,47+i*.74,0,0,Math.PI*2);g.stroke();
  }
  const planet=g.createRadialGradient(-112,-70,5,0,0,154);
  planet.addColorStop(0,'#ffcb94');planet.addColorStop(.45,'#cf8468');planet.addColorStop(.76,'#875856');planet.addColorStop(1,'#343847');
  g.fillStyle=planet;g.beginPath();g.arc(0,0,151,0,Math.PI*2);g.fill();g.save();g.clip();
  for(let i=0;i<360;i++){
    const y=rnd()*330-165;g.beginPath();g.moveTo(-165,y);g.bezierCurveTo(-50,y+35+rnd()*10,70,y+40,168,y+13);
    g.lineWidth=rnd()*4+.5;g.strokeStyle=rnd()>.5?'#ffd0a21b':'#4c344c23';g.stroke();
  }
  g.restore();
  for(let i=0;i<70;i++) {
    g.strokeStyle='rgba(226,189,152,'+(.08+rnd()*.32)+')';
    g.beginPath();g.ellipse(0,0,183+i*2.2,47+i*.6,0,0,Math.PI);g.stroke();
  }
  g.restore();
  craft(g,0,503,257,1.95,-.47);craft(g,1,516,340,.85,-.49);craft(g,3,391,294,.76,-.48);
}
