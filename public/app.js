import { scene,mini,ships } from './art.js';

const $ = s => document.querySelector(s);
const main=$('#main'), lengths=[5,4,3,3,2], letters='ABCDEFGHIJ';
const params=new URLSearchParams(location.search);
let code=(params.get('sala') || '').toUpperCase();
const spectator=params.get('vista')==='central';
let token=spectator ? '' : sessionStorage.getItem('piloto-'+code) || '';
let state=null, draft=[], selectedShip=0, vertical=false, selection=null, busy=false, reading=false, timer;
let boardMode='radar', editFleet=false;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function say(message){$('#notice').textContent=message;clearTimeout(timer);timer=setTimeout(()=>$('#notice').textContent='',5500);}
function coord(c){return letters[Math.floor(c/10)]+(c%10+1);}
function name(id){return escape(state.players.find(p=>p.id===id)?.name || 'Piloto');}
function link(central){const u=new URL('/',location.origin);u.searchParams.set('sala',code);if(central)u.searchParams.set('vista','central');return u.href;}
function randomFleet(){
  const used=new Set();
  return lengths.map(len=>{
    for(;;){
      const v=Math.random()<.5;
      const row=Math.floor(Math.random()*(v?11-len:10)),col=Math.floor(Math.random()*(v?10:11-len));
      const cells=Array.from({length:len},(_,i)=>row*10+col+i*(v?10:1));
      if(cells.some(c=>used.has(c)))continue;
      cells.forEach(c=>used.add(c));return cells;
    }
  });
}
async function api(action,data){
  const res=await fetch('/api/'+action+'?room='+encodeURIComponent(code),{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});
  const value=await res.json();if(!res.ok)throw Error(value.error || 'No se pudo conectar.');return value;
}
function fleetStrip(){
  return '<div class="fleetline">'+ships.map((s,i)=>'<div><canvas data-ship="'+i+'" aria-hidden="true"></canvas><strong>'+s+'</strong><small>'+lengths[i]+' casillas</small></div>').join('')+'</div>';
}
function art(){document.querySelectorAll('canvas[data-ship]').forEach(c=>mini(c,Number(c.dataset.ship)));}
function home(){
  main.innerHTML=`<section class="hero"><canvas id="space" aria-hidden="true"></canvas><div class="hero-text"><div class="eyebrow"><i></i> BATALLA NAVAL ESPACIAL</div><h1>Flota<br><em>Orbital</em></h1><p>Una coordenada. Hasta tres flotas enemigas.<br>Si aciertas, vuelves a disparar.</p></div></section>
  <div class="homegrid"><section class="panel"><div class="eyebrow">MULTIJUGADOR · 2–4 PILOTOS</div><h2>${code?'Entra a la sala '+escape(code):'Entra en órbita'}</h2><form id="entry"><label for="alias">Tu apodo</label><input id="alias" maxlength="20" required placeholder="Nombre de piloto" autocomplete="nickname"><div class="actions">${code?'<button class="primary" data-action="join">Unirme a la sala →</button>':'<button class="primary" data-action="create">Crear sala privada →</button><button data-action="match">Buscar partida</button>'}</div></form>
  ${code?'<a class="sub" href="/">Volver al inicio</a>':'<form id="byCode" class="codeform"><label for="roomcode">¿Tienes un código de sala?</label><div><input id="roomcode" maxlength="8" required pattern="[a-fA-F0-9]{8}" placeholder="Código de 8 caracteres"><button>Entrar →</button></div></form>'}</section>
  <section class="panel hangar"><div class="eyebrow">HANGAR</div><h2>Tu escuadrón</h2>${fleetStrip()}<p class="sub">Cinco naves por piloto en un tablero secreto de 10 × 10.</p></section></div>`;
  scene($('#space'));art();$('#alias').value=localStorage.getItem('flota-apodo') || '';
  $('#entry').onsubmit=async e=>{
    e.preventDefault();if(busy)return;busy=true;const alias=$('#alias').value.trim();
    try{
      const result=await api(e.submitter?.dataset.action || (code?'join':'create'),{name:alias});
      localStorage.setItem('flota-apodo',alias);sessionStorage.setItem('piloto-'+result.code,result.token);
      location.assign('/?sala='+result.code);
    } catch(err){say(err.message);busy=false;}
  };
  if($('#byCode'))$('#byCode').onsubmit=e=>{e.preventDefault();location.assign('/?sala='+$('#roomcode').value.trim().toUpperCase());};
}
function grid(kind){
  const fleet=kind==='place'?draft:state.me?.fleet || [];
  const shots=new Map();
  for(const shot of state.shots){if(!shots.has(shot.cell))shots.set(shot.cell,[]);shots.get(shot.cell).push(shot);}
  let html='<div class="board"><span></span>'+Array.from({length:10},(_,i)=>'<span>'+ (i+1)+'</span>').join('');
  for(let c=0;c<100;c++){
    if(c%10===0)html+='<span>'+letters[c/10]+'</span>';
    const logs=shots.get(c) || [], hits=logs.flatMap(s=>s.hits);
    let text='',style='',desc='';
    if(kind==='radar'){
      if(hits.length){text='✦'+(hits.length>1?hits.length:'');style='hit';desc=hits.map(h=>name(h.id)).join(', ');}
      else if(logs.length){text='·';style='miss';desc='Sin impacto';}
    }else{
      const ship=fleet.findIndex(cells=>cells.includes(c));
      if(ship>=0){style='occupied'+(kind==='place'&&ship===selectedShip?' chosen':'');text='━';desc=ships[ship];}
      if(kind==='own' && state.me.damage.includes(c)){text='✦';style='hit';desc+=' · impacto';}
    }
    if(kind==='radar' && c===selection)style+=' selected';
    html+='<button type="button" class="cell '+style+'" data-cell="'+c+'" aria-label="'+coord(c)+' '+desc+'" title="'+coord(c)+' '+desc+'">'+text+'</button>';
  }
  return html+'</div>';
}
function roster(){
  return state.players.map((p,i)=>{
    const lobby=state.phase==='lobby';
    const label=lobby?(p.ready?'Flota lista':'En el hangar'):(p.retired?'Retirada':p.remaining+' / 5 naves');
    return '<div class="pilot"><span class="piloticon c'+i+'">◈</span><div><strong>'+escape(p.name)+(p.id===state.me?.id?' · tú':'')+'</strong><small>'+label+'</small></div><div class="pips" aria-hidden="true">'+Array.from({length:5},(_,j)=>'<i class="'+(j<(lobby?(p.ready?5:0):p.remaining)?'lit':'')+'"></i>').join('')+'</div></div>';
  }).join('');
}
function lobby(){
  const me=state.me, ready=!!me?.fleet.length;
  if(!me)return '<section class="panel"><div class="eyebrow">PANTALLA CENTRAL</div><h2>Esperando el despegue</h2><p>Los pilotos preparan las flotas en sus dispositivos.</p></section>';
  if(ready && !editFleet)return '<section class="panel"><div class="eyebrow">HANGAR PRIVADO</div><h2>Tu flota está lista</h2>'+fleetStrip()+'<div class="actions"><button data-act="edit">Ajustar formación</button></div></section>';
  if(!draft.length)draft=ready?me.fleet.map(s=>[...s]):randomFleet();
  return '<section class="panel"><div class="eyebrow">HANGAR PRIVADO</div><h2>Despliega tu flota</h2><p>Elige una nave y toca la casilla donde empieza.</p><div class="picker">'+ships.map((s,i)=>'<button class="'+(selectedShip===i?'active':'')+'" data-idx="'+i+'"><canvas data-ship="'+i+'"></canvas>'+s+' · '+lengths[i]+'</button>').join('')+'</div>'+grid('place')+'<div class="actions"><button data-act="rotate">Girar · '+(vertical?'vertical':'horizontal')+'</button><button data-act="shuffle">Al azar</button><button data-act="ready" class="primary">Flota lista ✓</button></div></section>';
}
function shotLine(s){
  return '<b>'+coord(s.cell)+'</b> · '+name(s.by)+' → '+(s.hits.length?s.hits.map(h=>name(h.id)+(h.sunk?' (nave destruida)':'')).join(' + '):'sin impacto');
}
function combat(){
  const mine=state.turn===state.me?.id && state.phase==='playing';
  const own=boardMode==='own' && state.me;
  const logs=state.shots.filter(s=>s.cell===selection);
  const used=logs.some(s=>s.by===state.me?.id);
  const title=state.phase==='over'?'Victoria de '+name(state.turn):mine?'Tu turno de disparar':'Turno de '+name(state.turn);
  return '<section class="panel"><div class="eyebrow">'+(spectator?'PANTALLA CENTRAL':'CONSOLA DE VUELO')+'</div><h2>'+title+'</h2><div class="tabs"><button data-act="radar" class="'+(!own?'active':'')+'">Radar común</button>'+(state.me?'<button data-act="own" class="'+(own?'active':'')+'">Mi flota</button>':'')+'</div>'+grid(own?'own':'radar')+
  '<div class="legend"><span>✦ Impacto</span><span>· Sin impacto</span>'+(own?'<span>━ Tu nave</span>':'')+'</div>'+
  (!own && selection!==null?'<div class="target"><strong>Sector '+coord(selection)+'</strong> '+(logs.length?logs.map(shotLine).join('<br>'):'Sin disparos registrados')+'</div>':'')+
  (mine&&!own?'<button class="primary wide" data-act="fire" '+(selection===null||used?'disabled':'')+'>'+(used?'Ya disparaste aquí':selection===null?'Selecciona una coordenada':'Disparar a '+coord(selection))+'</button>':'')+'</section>';
}
function render(){
  const lobbyPhase=state.phase==='lobby',canStart=state.players.length>=2 && state.players.every(p=>p.ready);
  main.innerHTML='<div class="roomhead"><div><div class="eyebrow">'+(state.public?'PARTIDA PÚBLICA':'SALA PRIVADA')+'</div><h1>Sala <em>'+escape(code)+'</em></h1></div><div class="actions"><button data-act="copy">Copiar invitación</button>'+(!spectator?'<a class="button" href="'+link(true)+'" target="_blank" rel="noopener">Pantalla central ↗</a>':'')+'</div></div><div class="battlegrid">'+(lobbyPhase?lobby():combat())+'<aside><section class="panel"><div class="eyebrow">'+state.players.length+' / 4 PILOTOS</div><h2>Estado de flotas</h2>'+roster()+
  (lobbyPhase&&state.me?.id===state.host?'<button data-act="start" class="primary wide" '+(canStart?'':'disabled')+'>Iniciar partida</button><small>Se necesitan 2–4 pilotos con flotas listas.</small>':'')+'</section>'+
  (!lobbyPhase?'<section class="panel"><div class="eyebrow">TELEMETRÍA</div><h2>Últimos disparos</h2><ol class="log">'+(state.shots.slice(-8).reverse().map(s=>'<li>'+shotLine(s)+'</li>').join('') || '<li>Esperando el primer disparo.</li>')+'</ol></section>':'')+
  '<button class="quiet" data-act="leave">'+(state.me && state.phase!=='over'?'Salir de la partida':'Volver al inicio')+'</button></aside></div>';
  art();
}
async function refresh(){
  if(reading || busy || !code || (!token&&!spectator))return;reading=true;
  try{
    const data=await api('state');
    if(busy)return;
    if(token && !data.me){sessionStorage.removeItem('piloto-'+code);token='';home();return;}
    if(JSON.stringify(state)!==JSON.stringify(data)){state=data;render();}
  }catch(err){say(err.message);}
  finally{reading=false;}
}
main.addEventListener('click',async e=>{
  if(!state || busy)return;
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.idx!==undefined){selectedShip=Number(b.dataset.idx);render();return;}
  if(b.dataset.cell!==undefined){
    const c=Number(b.dataset.cell);
    if(state.phase==='lobby'){
      const len=lengths[selectedShip],cells=Array.from({length:len},(_,i)=>c+i*(vertical?10:1));
      if(cells.at(-1)>99 || (!vertical && c%10+len>10) || draft.some((s,i)=>i!==selectedShip && s.some(v=>cells.includes(v)))){say('Esa nave no cabe ahí. Prueba otra casilla u orientación.');return;}
      draft[selectedShip]=cells;
    }else selection=c;
    render();return;
  }
  const act=b.dataset.act;if(!act)return;
  if(act==='copy'){
    try{await navigator.clipboard.writeText(link(false));say('Enlace de invitación copiado.');}catch{prompt('Copia el enlace para tus amigos',link(false));}return;
  }
  if(act==='edit'){editFleet=true;draft=state.me.fleet.map(s=>[...s]);}
  if(act==='rotate')vertical=!vertical;
  if(act==='shuffle')draft=randomFleet();
  if(act==='radar'||act==='own')boardMode=act;
  if(['ready','start','fire','leave'].includes(act)){
    if(act==='leave'){
      if(!state.me || state.phase==='over'){location.assign('/');return;}
      if(!confirm(state.phase==='playing'?'¿Retirar tu flota de la partida?':'¿Salir de esta sala?'))return;
    }
    busy=true;
    try{
      state=await api(act,act==='ready'?{fleet:draft}:act==='fire'?{cell:selection,sequence:state.shots.length}:{});
      if(act==='leave'){sessionStorage.removeItem('piloto-'+code);location.assign('/');return;}
      if(act==='ready')editFleet=false;
      if(act==='fire')selection=null;
    }catch(err){say(err.message);}
    finally{busy=false;}
  }
  render();
});
$('#rules').onclick=()=>$('#guide').showModal();
$('#closeGuide').onclick=()=>$('#guide').close();
if(code && (token||spectator)){main.innerHTML='<section class="panel"><h2>Conectando a la sala…</h2><a href="/">Volver al inicio</a></section>';refresh();setInterval(refresh,1300);}else home();
