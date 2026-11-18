import { player, makeRoom, start, ensure, fire, validateFleet, view, leave } from './game.js';

const openLobby = 'available=1 AND updated>?';
const findMatch = 'SELECT state FROM rooms WHERE '+openLobby+' ORDER BY updated DESC LIMIT 1';
const lifetime = 90_000;

export async function gameRequest(db, action, body, code, token) {
  const joining = ['create','match','join'].includes(action);
  const newPlayer = joining ? player(body?.name) : null;
  for (let attempt=0; attempt<8; attempt++) {
    const now=Date.now();
    let row;
    if(action==='match')row=await db.first(findMatch,now-lifetime);
    else if(action!=='create')row=await db.first('SELECT state FROM rooms WHERE code=?',code);
    if(!row && (action==='create' || action==='match')){
      const room=makeRoom(newPlayer,action==='match');
      let sql='INSERT OR IGNORE INTO rooms(code,state,available,updated) SELECT ?,?,?,?';
      const args=[room.code,JSON.stringify(room),Number(room.public),now];
      if(room.public){
        sql+=' WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE '+openLobby+')';
        args.push(now-lifetime);
      }
      if(await db.run(sql,...args))return {code:room.code,token:newPlayer.token};
      continue;
    }
    ensure(row,'Sala desconocida. Revisa el código.');
    const room=JSON.parse(row.state);
    const p=room.players.find(x=>x.token===token);
    if(action==='state'){
      if(p && room.public && room.phase==='lobby')await db.run('UPDATE rooms SET updated=? WHERE code=? AND updated<?',now,code,now-20000);
      return view(room,p);
    }
    if(joining){
      ensure(room.phase==='lobby' && room.players.length<4,'La sala ya empezó o está llena.');
      room.players.push(newPlayer);
    }else{
      ensure(p,'Entra a la sala con tu apodo para jugar.');
      if(action==='ready'){
        ensure(room.phase==='lobby','La partida ya empezó.');
        p.fleet=validateFleet(body.fleet);
      }else if(action==='start')start(room,p);
      else if(action==='fire')fire(room,p,body.cell,body.sequence);
      else if(action==='leave')leave(room,p);
      else throw new Error('Acción desconocida.');
    }
    // Update only the version we read. Concurrent joins retry against the winning write.
    const available=Number(room.public && room.phase==='lobby' && room.players.length<4);
    const changed=room.players.length
      ? await db.run('UPDATE rooms SET state=?,available=?,updated=? WHERE code=? AND state=?',JSON.stringify(room),available,now,room.code,row.state)
      : await db.run('DELETE FROM rooms WHERE code=? AND state=?',room.code,row.state);
    if(changed)return joining ? {code:room.code,token:newPlayer.token} : view(room,p);
  }
  throw new Error('La sala está recibiendo otros movimientos. Vuelve a intentar.');
}
