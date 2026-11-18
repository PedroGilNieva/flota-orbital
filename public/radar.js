// Coverage uses only public shots and the list of surviving fleets.
export function radarContacts(players, shots) {
  const contacts = Array.from({length:100}, () => ({shots:[], hits:[], pending:null, status:'unexplored'}));
  for (const shot of shots) {
    const contact = contacts[shot.cell];
    contact.shots.push(shot);
    contact.hits.push(...shot.hits);
  }
  for (const contact of contacts) {
    if (!contact.shots.length) continue;
    // A single shooter tests every active fleet except their own. A different
    // shooter, or elimination of the first, resolves that last possibility.
    const first = contact.shots[0].by;
    const stillActive = players.some(p => p.id === first && p.remaining > 0 && !p.retired);
    const pending = stillActive && contact.shots.every(s => s.by === first);
    contact.pending = pending ? first : null;
    contact.status = pending ? 'partial' : 'final';
  }
  return contacts;
}
