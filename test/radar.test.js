import test from 'node:test';
import assert from 'node:assert/strict';
import {radarContacts} from '../public/radar.js';

const pilots=['Ana','Luis','Sol','Luna'].map(id=>({id,remaining:5}));
const first={cell:35,by:'Ana',hits:[]};
test('Un disparo sobre la nave propia deja exactamente a la tiradora pendiente, acierte o falle',()=>{
  for(const hits of [[],[{id:'Luis'},{id:'Luna'}]]){
    const contacts=radarContacts(pilots,[{...first,hits}]);
    assert.equal(contacts[35].status,'partial');
    assert.equal(contacts[35].pending,'Ana');
    assert.deepEqual(contacts[35].hits,hits);
    assert.equal(contacts[36].status,'unexplored');
  }
});
test('Otra persona resuelve la casilla incluso si falla, y se conservan los impactos previos',()=>{
  for(const hits of [[],[{id:'Ana'}]]){
    const previous=[{id:'Sol'}];
    const result=radarContacts(pilots,[{...first,hits:previous},{...first,by:'Luis',hits}])[35];
    assert.equal(result.status,'final');
    assert.equal(result.pending,null);
    assert.deepEqual(result.hits,[...previous,...hits]);
  }
});
test('Si la única flota pendiente cae o se retira, la casilla pasa a final',()=>{
  for(const change of [{remaining:0},{retired:true}]){
    const players=pilots.map(p=>p.id==='Ana'?{...p,...change}:p);
    assert.equal(radarContacts(players,[first])[35].status,'final');
  }
});
