import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { gameRequest } from '../service.js';

const formation=[[0,1,2,3,4],[10,11,12,13],[20,21,22],[30,31,32],[40,41]];
function server(){
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_rooms.sql',import.meta.url),'utf8'));
  return (action,body={},room={},token=room.token)=>gameRequest({
    first:(sql,...args)=>db.prepare(sql).get(...args),
    run:(sql,...args)=>db.prepare(sql).run(...args).changes
  },action,body,room.code,token);
}
test('Cuatro pilotos, tres impactos simultáneos, turno extra, bajas, privacidad y victoria',async()=>{
  const api=server();
  const host=await api('create',{name:'Ana'});
  const guests=await Promise.all(['Luis','Sol','Luna'].map(name=>api('join',{name},host)));
  const pilots=[host,...guests];
  await assert.rejects(api('join',{name:'Quinto'},host));
  await assert.rejects(api('start',{},host));
  await Promise.all(pilots.map(p=>api('ready',{fleet:formation},p)));
  await api('start',{},host);
  const initial=await api('state',{},host,'');
  assert.equal(initial.me,null);
  assert.ok(!JSON.stringify(initial).includes('fleet'));
  assert.ok(!JSON.stringify(initial).includes('token'));
  const states=await Promise.all(pilots.map(p=>api('state',{},p)));
  const turn=pilots[states.findIndex(s=>s.me.id===initial.turn)];
  await assert.rejects(api('fire',{cell:0,sequence:0},host,''));
  for(const [sequence,cell] of formation.flat().entries()){
    const s=await api('fire',{cell,sequence},turn);
    assert.equal(s.turn,initial.turn);
    assert.equal(s.shots.at(-1).hits.length,3);
    if(sequence===0){
      assert.ok(s.players.every(p=>p.remaining===5));
      await assert.rejects(api('fire',{cell:1,sequence:0},turn));
      await assert.rejects(api('fire',{cell:0,sequence:1},turn));
    }
    if(sequence===4)assert.equal(s.players.filter(p=>p.remaining===4).length,3);
    if(sequence===16){assert.equal(s.phase,'over');assert.equal(s.players.filter(p=>p.remaining).length,1);}
  }
});
test('Emparejamiento concurrente, sala privada aislada, fallo y retirada',async()=>{
  const api=server(),privateRoom=await api('create',{name:'Privada'});
  const matched=await Promise.all(['A','B','C','D','E'].map(name=>api('match',{name})));
  const group=matched.filter(p=>p.code===matched[0].code);
  assert.equal(group.length,4);assert.ok(matched.every(p=>p.code!==privateRoom.code));
  const smaller=await api('state',{},matched.find(p=>p.code!==group[0].code));
  assert.equal(smaller.players.length,1);
  for(const p of group)await api('ready',{fleet:formation},p);
  const before=await Promise.all(group.map(p=>api('state',{},p)));
  const host=group[before.findIndex(s=>s.me.id===s.host)];
  const started=await api('start',{},host);
  const current=group[before.findIndex(s=>s.me.id===started.turn)];
  const miss=await api('fire',{cell:99,sequence:0},current);
  assert.notEqual(miss.turn,started.turn);
  await assert.rejects(api('fire',{cell:0,sequence:1},current));
  for(const p of group.filter(p=>p!==current))await api('leave',{},p);
  assert.equal((await api('state',{},current)).phase,'over');
});
