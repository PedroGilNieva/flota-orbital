import { sizes } from './public/fleet.js';
function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2,'0')).join('');
}
export function ensure(ok, message) {
  if (!ok) throw new Error(message);
}
export function player(name) {
  ensure(typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 20, 'Elige un apodo de 1 a 20 caracteres.');
  return { id: crypto.randomUUID(), token: randomHex(32), name: name.trim(), fleet: [], damage: [], retired: false };
}
export function remaining(p) {
  return p.retired ? 0 : p.fleet.filter(ship => ship.some(cell => !p.damage.includes(cell))).length;
}
export function validateFleet(fleet) {
  ensure(Array.isArray(fleet) && fleet.length === 5, 'Coloca las cinco naves.');
  const used = new Set();
  return fleet.map((ship, i) => {
    ensure(Array.isArray(ship) && ship.length === sizes[i], 'Revisa el tamaño de cada nave.');
    const cells = [...ship].sort((a,b) => a-b);
    const step = cells[1] - cells[0];
    ensure(step === 10 || (step === 1 && Math.floor(cells[0]/10) === Math.floor(cells.at(-1)/10)), 'Las naves deben estar en línea recta.');
    cells.forEach((c, j) => {
      ensure(Number.isInteger(c) && c >= 0 && c < 100 && !used.has(c) && c === cells[0] + step*j, 'Las naves deben caber sin superponerse.');
      used.add(c);
    });
    return cells;
  });
}
export function makeRoom(p, isPublic) {
  return { code: randomHex(4).toUpperCase(), public: isPublic, host: p.id, phase: 'lobby', players: [p], shots: [], turn: null };
}
export function start(r, p) {
  ensure(r.phase === 'lobby' && r.host === p.id, 'Solo el anfitrión puede iniciar.');
  ensure(r.players.length >= 2 && r.players.every(x => x.fleet.length === 5), 'Se necesitan al menos dos jugadores y todas las flotas listas.');
  r.phase = 'playing';
  r.turn = r.practice ? p.id : r.players[Math.floor(Math.random()*r.players.length)].id;
}
function advance(r, p) {
  const alive = r.players.filter(x => remaining(x) > 0);
  if (alive.length === 1) {
    r.phase = 'over';
    r.turn = alive[0].id;
    return;
  }
  const i = r.players.indexOf(p);
  for (let offset = 1; offset <= r.players.length; offset++) {
    const next = r.players[(i + offset) % r.players.length];
    if (remaining(next)) { r.turn = next.id; return; }
  }
}
export function fire(r, p, cell, sequence) {
  ensure(r.phase === 'playing' && r.turn === p.id && sequence === r.shots.length, 'El turno ha cambiado.');
  ensure(Number.isInteger(cell) && cell >= 0 && cell < 100, 'Coordenada fuera del tablero.');
  ensure(!r.shots.some(s => s.by === p.id && s.cell === cell), 'Ya disparaste a esa coordenada.');
  const hits = [];
  for (const target of r.players) {
    if (target === p || !remaining(target) || target.damage.includes(cell)) continue;
    const ship = target.fleet.find(s => s.includes(cell));
    if (!ship) continue;
    target.damage.push(cell);
    hits.push({ id: target.id, sunk: ship.every(c => target.damage.includes(c)) });
  }
  r.shots.push({ by: p.id, cell, hits });
  if (!hits.length || r.players.filter(x => remaining(x)).length === 1) advance(r, p);
}
export function leave(r, p) {
  if (r.phase === 'lobby') {
    r.players = r.players.filter(x => x !== p);
    if (p.id === r.host) r.host = r.players[0]?.id;
  } else if (r.phase === 'playing' && remaining(p)) {
    p.retired = true;
    if (r.turn === p.id || r.players.filter(x => remaining(x)).length === 1) advance(r,p);
  }
}
export function view(r, p) {
  return { code: r.code, public: r.public, practice: !!r.practice, phase: r.phase, host: r.host, turn: r.turn, shots: r.shots,
    players: r.players.map(x => ({ id: x.id, name: x.name, ready: !!x.fleet.length, remaining: remaining(x), retired: x.retired })),
    me: p ? { id: p.id, fleet: p.fleet, damage: p.damage } : null };
}
