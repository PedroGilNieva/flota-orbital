import { player, view, fire } from './game.js';
import { randomFleet } from './public/fleet.js';
import { radarContacts } from './public/radar.js';

export function addPracticePilots(room){
  room.practice=true;
  for(const name of ['Ío · bot','Titán · bot','Europa · bot']){
    const bot=player(name);
    bot.bot=true;
    bot.fleet=randomFleet();
    room.players.push(bot);
  }
}

// Aim from public radar information, using nearby unresolved hits as leads.
function chooseCell(publicState, pilotId){
  const {players,shots}=publicState;
  const radar=radarContacts(players,shots);
  const opponents=players.filter(p=>p.remaining && p.id!==pilotId);
  let best=-1;
  const choices=[];
  for(let cell=0;cell<100;cell++){
    const contact=radar[cell];
    const targets=opponents.filter(p=>contact.status==='unexplored' || p.id===contact.pending);
    if(!targets.length)continue;
    let score=targets.length;
    for(const step of [-10,10,-1,1]){
      const next=cell+step;
      if(Math.abs(step)===1 && Math.floor(next/10)!==Math.floor(cell/10))continue;
      if(radar[next]?.hits.some(h=>!h.sunk && targets.some(p=>p.id===h.id)))score+=4;
    }
    if(score>best){choices.length=0;best=score;}
    if(score===best)choices.push(cell);
  }
  return choices[Math.floor(Math.random()*choices.length)];
}

export function takeDueBotTurn(room,now){
  if(!room.practice || room.phase!=='playing' || now<room.botDue)return false;
  const pilot=room.players.find(p=>p.id===room.turn);
  if(!pilot.bot)return false;
  const cell=chooseCell(view(room,null),pilot.id);
  fire(room,pilot,cell,room.shots.length);
  return true;
}
