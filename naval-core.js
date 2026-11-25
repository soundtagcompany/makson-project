export const FLEET=[4,3,3,2,2,2,1,1,1,1];
export const SIZE=10;
export const coordinate=i=>'АБВГДЕЖЗИК'[i%10]+(Math.floor(i/10)+1);
export function emptyBoard(){return {ships:[],shots:Array(100).fill(null)};}
export function cellsFor(start,length,vertical=false){
  if(!Number.isInteger(start)||start<0||start>=100)return [];
  const x=start%10,y=Math.floor(start/10);
  if((vertical?y:x)+length>10)return [];
  return Array.from({length},(_,i)=>start+i*(vertical?10:1));
}
export function canPlace(board,cells){return cells.length>0&&cells.every(a=>board.ships.every(ship=>ship.cells.every(b=>Math.abs(a%10-b%10)>1||Math.abs(Math.floor(a/10)-Math.floor(b/10))>1)));}
export function placeShip(board,start,length,vertical){const cells=cellsFor(start,length,vertical);if(!canPlace(board,cells))return false;board.ships.push({cells,hits:0,sunk:false});return true;}
export function randomBoard(random=Math.random){
  // Restart a crowded arrangement instead of hanging on an impossible last ship.
  for(let attempt=0;attempt<100;attempt++){const b=emptyBoard();for(const length of FLEET){const options=[];for(let i=0;i<100;i++)for(const vertical of [false,true])if(canPlace(b,cellsFor(i,length,vertical)))options.push([i,vertical]);if(!options.length)break;const [i,v]=options[Math.floor(random()*options.length)];placeShip(b,i,length,v);}if(b.ships.length===FLEET.length)return b;}
  throw Error('Не удалось расставить флот. Попробуй ещё раз.');
}
export function fire(board,index){
  if(!Number.isInteger(index)||index<0||index>=100||board.shots[index]!==null)return null;
  const ship=board.ships.find(s=>s.cells.includes(index));board.shots[index]=ship?'hit':'miss';
  if(!ship)return {index,hit:false,sunk:false,won:false,cells:[]};
  ship.hits++;ship.sunk=ship.hits===ship.cells.length;
  if(ship.sunk){for(const cell of ship.cells)board.shots[cell]='sunk';for(let i=0;i<100;i++)if(board.shots[i]===null&&ship.cells.some(c=>Math.abs(c%10-i%10)<=1&&Math.abs(Math.floor(c/10)-Math.floor(i/10))<=1))board.shots[i]='water';}
  return {index,hit:true,sunk:ship.sunk,won:board.ships.every(s=>s.sunk),cells:ship.sunk?[...ship.cells]:[]};
}
export function chooseTarget(shots,random=Math.random){
  // AI sees only the history of shots, never the opponent's ship positions.
  const hits=shots.flatMap((s,i)=>s==='hit'?[i]:[]),targets=new Set();
  for(const h of hits){for(const n of [h-10,h+10,h-1,h+1])if(n>=0&&n<100&&Math.abs(n%10-h%10)+Math.abs(Math.floor(n/10)-Math.floor(h/10))===1&&shots[n]===null)targets.add(n);}
  const remaining=shots.flatMap((s,i)=>s===null?[i]:[]),checker=remaining.filter(i=>(i%10+Math.floor(i/10))%2===0);
  const pool=targets.size?[...targets]:checker.length?checker:remaining;
  return pool.length?pool[Math.floor(random()*pool.length)]:null;
}
