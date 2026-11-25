import {BOARD,groupCells,ownsGroup,buildingStock,act,rent} from './core.js';
// Portfolio value includes complete sets, so giving away a monopoly is expensive.
function portfolio(s,id,owners=s.assets.map(a=>a.owner)){
 let total=0;const groups=new Set();
 for(let i=0;i<BOARD.length;i++){const c=BOARD[i];if(!c.price)continue;if(c.type==='street')groups.add(c.group);if(owners[i]===id)total+=c.price*(s.assets[i].mortgaged?.55:1)+s.assets[i].level*(c.build||0)*.8;}
 for(const group of groups){const cells=groupCells(group),n=cells.filter(i=>owners[i]===id).length,price=cells.reduce((v,i)=>v+BOARD[i].price,0);if(n===cells.length)total+=price*1.3;else if(n>1)total+=price*.18;}
 for(const type of ['rail','utility']){const cells=BOARD.map((c,i)=>c.type===type?i:-1).filter(i=>i>=0),n=cells.filter(i=>owners[i]===id).length;if(n>1)total+=n*(n-1)*45;}
 return total;
}
function tradeGain(s,id,give,take,pay,receive){const owners=s.assets.map(a=>a.owner);for(const i of give)owners[i]=null;for(const i of take)owners[i]=id;const fees=take.reduce((n,i)=>n+(s.assets[i].mortgaged?Math.ceil(BOARD[i].price*.05):0),0);return portfolio(s,id,owners)-portfolio(s,id)-pay+receive-fees;}
function cashReserve(s,p){let danger=0;for(let d=2;d<=12;d++){const i=(p.pos+d)%40,a=s.assets[i];if(a.owner!==null&&a.owner!==p.id&&!a.mortgaged)danger+=rent(s,i,7)*(6-Math.abs(7-d))/36;}return Math.min(600,Math.round(120+danger*1.5+Math.min(100,s.round*5)));}
function proposeTrade(s,p,reserve){
 if(s.trades?.some(t=>t.from===p.id)||s.botTradeRounds?.[p.id]===s.round)return null;
 const available=id=>s.assets.map((a,i)=>a.owner===id&&BOARD[i].price&&!groupCells(BOARD[i].group).some(j=>s.assets[j].level)?i:-1).filter(i=>i>=0);
 const own=available(p.id);let best=null,score=20;
 for(const other of s.players){if(other.id===p.id||other.out||s.debt?.player===other.id)continue;
  for(const target of available(other.id))for(const gift of [null,...own]){
   const give=gift===null?[]:[gift],take=[target];
   if((s.tradeHistory||[]).some(t=>t.from===p.id&&t.to===other.id&&s.round-t.round<3&&JSON.stringify(t.give)===JSON.stringify(give)&&JSON.stringify(t.take)===JSON.stringify(take)))continue;
   const ours=tradeGain(s,p.id,give,take,0,0),theirs=tradeGain(s,other.id,take,give,0,0);
   // Split the strategic benefit instead of asking players to donate property.
   const payment=Math.round((ours-theirs)/20)*10,cashGive=Math.max(0,payment),cashTake=Math.max(0,-payment);
   const gain=ours-payment,otherGain=theirs+payment;
   if(gain<25||otherGain<20||p.cash-cashGive+cashTake<reserve||other.cash-cashTake+cashGive<cashReserve(s,other))continue;
   const action={kind:'offer',to:other.id,give,take,cashGive,cashTake};
   if(gain+otherGain*.2>score){try{act(s,p.id,action);}catch{continue;}best=action;score=gain+otherGain*.2;}
  }
 }return best;
}
// Decisions use public information only: no access to decks or future dice.
export function botAction(s,id){const p=s.players.find(p=>p.id===id);if(!p||p.out||s.phase==='finished')return null;const current=s.players[s.turn],assets=s.assets,owned=assets.map((a,i)=>a.owner===id?i:-1).filter(i=>i>=0),reserve=cashReserve(s,p);
 const value=i=>{const owners=assets.map(a=>a.owner);owners[i]=id;return Math.max(BOARD[i].price*.55,portfolio(s,id,owners)-portfolio(s,id));};
 if(s.phase==='auction'){const a=s.auction;if(a.leader===id||a.passed.includes(id))return null;const ceiling=Math.min(p.cash-Math.min(100,reserve/2),Math.round(value(a.index)));const amount=a.bid+10;return {kind:amount<=ceiling?'bid':'pass',amount};}
 const offer=s.trades?.find(t=>t.to===id);if(offer){
  const gain=tradeGain(s,id,offer.take,offer.give,offer.cashTake,offer.cashGive),fees=offer.give.reduce((n,i)=>n+(assets[i].mortgaged?Math.ceil(BOARD[i].price*.05):0),0);
  const action={kind:gain>=15&&p.cash-offer.cashTake+offer.cashGive-fees>=(s.debt?.player===id?0:reserve)?'accept':'reject',offer:offer.id};if(action.kind==='accept')try{act(s,id,action);}catch{return {kind:'reject',offer:offer.id};}return action;
 }
 if(s.phase==='debt'&&s.debt?.player===id){if(p.cash>=s.debt.amount)return {kind:'settle'};const built=owned.filter(i=>assets[i].level).sort((a,b)=>assets[b].level-assets[a].level||BOARD[a].rent[1]/BOARD[a].build-BOARD[b].rent[1]/BOARD[b].build);if(built.length){const i=built[0];return {kind:assets[i].level===5&&buildingStock(s).houses<4?'sellGroup':'sell',index:i};}const mortgage=owned.filter(i=>!assets[i].mortgaged&&!groupCells(BOARD[i].group).some(j=>assets[j].level)).sort((a,b)=>Number(ownsGroup(s,id,BOARD[a].group))-Number(ownsGroup(s,id,BOARD[b].group))||BOARD[a].price-BOARD[b].price);if(mortgage.length)return {kind:'mortgage',index:mortgage[0]};return {kind:'bankrupt'};}
 if(current.id!==id)return null;
 if(s.phase==='card')return {kind:'card'};
 if(s.phase==='buy'){const i=s.selected??p.pos;return {kind:p.cash>=BOARD[i].price&&p.cash-BOARD[i].price>=Math.min(reserve,Math.max(40,p.cash*.15))?'buy':'decline'};}
 if(s.phase==='roll'){if(p.jailed&&p.release.length)return {kind:'jailCard'};
  const proposal=proposeTrade(s,p,reserve);if(proposal)return proposal;
  const stock=buildingStock(s),build=owned.filter(i=>{const c=BOARD[i],a=assets[i];return c.type==='street'&&ownsGroup(s,id,c.group)&&!groupCells(c.group).some(j=>assets[j].mortgaged)&&a.level<5&&a.level===Math.min(...groupCells(c.group).map(j=>assets[j].level))&&p.cash-c.build>=reserve&&(a.level===4?stock.hotels>0:stock.houses>0);}).sort((a,b)=>(BOARD[b].rent[assets[b].level+1]-BOARD[b].rent[assets[b].level])/BOARD[b].build-(BOARD[a].rent[assets[a].level+1]-BOARD[a].rent[assets[a].level])/BOARD[a].build);
  if(build.length)return {kind:'build',index:build[0]};const redeem=owned.find(i=>assets[i].mortgaged&&p.cash-Math.ceil(BOARD[i].price*.55)>=reserve);if(redeem!==undefined)return {kind:'redeem',index:redeem};return {kind:'roll'};
 }
 return null;
}
export function nextBotAction(s){if(!s)return null;const order=[s.players[s.turn],...s.players.filter((_,i)=>i!==s.turn)];for(const p of order)if(p?.bot&&!p.out){const action=botAction(s,p.id);if(action)return {id:p.id,action};}return null;}
