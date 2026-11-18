export const sizes = [5, 4, 3, 3, 2];

export function randomFleet(){
  const used=new Set();
  return sizes.map(length=>{
    for(;;){
      const vertical=Math.random()<0.5;
      const row=Math.floor(Math.random()*(vertical?11-length:10));
      const col=Math.floor(Math.random()*(vertical?10:11-length));
      const cells=Array.from({length},(_,i)=>row*10+col+i*(vertical?10:1));
      if(cells.some(c=>used.has(c)))continue;
      cells.forEach(c=>used.add(c));
      return cells;
    }
  });
}
