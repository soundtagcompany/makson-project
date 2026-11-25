import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,act,viewGame,chooseAction,remember,eliminate,RULES,REVEAL_MS} from '../pulse-core.js';
function setup(deck=['sterile','necrosis','dirty'],count=2){const s=createGame(12,0,count,0);s.deck=deck;s.availableAt=0;s.revealUntil=0;s.players.forEach(p=>{p.items=[];p.offer=null;});return s;}
const play=(s,a,c)=>act(s,a,c,s.availableAt+1);
test('batches grow to fourteen and compositions vary without losing either safe or harmful doses',()=>{
 const mixes=new Set();for(let seed=1;seed<=40;seed++){let s=createGame(seed*917321,0,2,0);for(let round=1;round<=14;round++){assert.equal(s.deck.length,Math.min(14,round+3));assert.ok(s.opening.sterile>0&&s.opening.necrosis>0&&s.opening.dirty>0);if(round===1)mixes.add(JSON.stringify(s.opening));s.deck=['sterile'];s.players.forEach(p=>{p.offer=null;p.items=[];});s=play(s,s.turn,{kind:'inject',target:s.turn});}}assert.ok(mixes.size>1);
});
test('composition disappears server-side; AI memory derives counts from public events only',()=>{
 let s=createGame(51,0,2,0);const m={};remember(m,viewGame(s,0,1));assert.ok(m.counts);const original={...m.counts};const late=viewGame(s,0,REVEAL_MS+1);assert.equal(late.announcement,null);for(const field of ['counts','opening','deck','rng'])assert.equal(field in late,false);
 const kind=s.deck[0];s=play(s,0,{kind:'inject',target:1});remember(m,viewGame(s,0,s.availableAt));assert.equal(m.counts[kind],original[kind]-1);remember(m,viewGame(s,0,s.availableAt));assert.equal(m.counts[kind],original[kind]-1);
});
test('all self injections keep initiative while alive; morphine blocks one hit without stacking',()=>{
 for(const type of ['sterile','necrosis','dirty'])for(const target of [0,1]){let s=setup([type,'sterile']);s=play(s,0,{kind:'inject',target});assert.equal(s.players[target].hp,type==='necrosis'?3:4);assert.equal(s.turn,target===0?0:1);assert.equal(s.players[target].morphine,type==='dirty');}
 let s=setup(['dirty','dirty','sterile','necrosis','necrosis']);s.players[0].hp=1;for(let i=0;i<3;i++)s=play(s,0,{kind:'inject',target:0});assert.equal(s.players[0].morphine,true);s=play(s,0,{kind:'inject',target:0});assert.equal(s.players[0].hp,1);assert.equal(s.players[0].morphine,false);assert.equal(s.turn,0);s=play(s,0,{kind:'inject',target:0});assert.equal(s.phase,'finished');
 let multi=setup(['necrosis','sterile'],4);multi.players[0].hp=1;multi=play(multi,0,{kind:'inject',target:0});assert.equal(multi.turn,1);
});
test('3–4 seats: elimination, turn order, anti-pile-on guard and spectator state',()=>{
 let s=setup(['necrosis','necrosis','necrosis','necrosis','sterile'],4);s=play(s,0,{kind:'inject',target:3});assert.equal(s.players[3].hp,3);assert.equal(s.players[3].guard,true);s=play(s,1,{kind:'inject',target:3});assert.equal(s.players[3].hp,3);s=play(s,2,{kind:'inject',target:0});assert.equal(s.turn,3);assert.equal(s.players[3].guard,false);
 s=setup(['necrosis','sterile'],4);s.players[1].hp=1;s=play(s,0,{kind:'inject',target:1});assert.equal(s.phase,'playing');assert.equal(s.turn,2);assert.equal(viewGame(s,1).players[1].hp,0);assert.throws(()=>play(s,1,{kind:'inject',target:0}),/не твой/);
 s=eliminate(s,2,s.availableAt);assert.equal(s.turn,3);s=eliminate(s,3,s.availableAt);assert.equal(s.winner,0);assert.equal(s.phase,'finished');
});
test('stolen item can be used immediately, including chained theft',()=>{
 let s=setup(['necrosis','sterile']);s.players[0].items=['scalpel'];s.players[1].items=['scalpel','lighter'];s=play(s,0,{kind:'item',index:0,target:1,steal:0});s=play(s,0,{kind:'item',index:0,target:1,steal:0});s=play(s,0,{kind:'item',index:0});assert.equal(s.players[0].peek,'necrosis');assert.equal(s.turn,0);assert.equal(s.players[0].hp,4);
});
test('private peek, shield, morphine combinations, item reset economy and atomic validation',()=>{
 let s=setup(['dirty','necrosis']);s.players[0].items=['lighter'];s=play(s,0,{kind:'item',index:0});assert.equal(viewGame(s,0).players[0].peek,'dirty');assert.equal(viewGame(s,1).players[0].peek,null);assert.equal(viewGame(s,1).event.type,undefined);const old=JSON.stringify(s);assert.throws(()=>play(s,1,{kind:'inject',target:0}));assert.equal(JSON.stringify(s),old);
 s=setup();s.players[0].items=['defib','lighter'];s.players[1].items=['wipe'];s=play(s,0,{kind:'item',index:0});assert.deepEqual(s.players.map(p=>p.items),[['lighter'],['wipe']]);assert.equal(s.used,0);assert.equal(s.players[0].hp,4);assert.equal(s.turn,1);
 s=setup();s.players[0].items=['defib'];s.players[0].hp=1;s=play(s,0,{kind:'item',index:0});assert.equal(s.players[0].hp,1);assert.equal(s.turn,1);
});
test('conditions change deterministically; reverse and weak alter turn choices',()=>{
 let s=setup(['sterile','necrosis'],4);s.rule='reverse';s.direction=-1;s=play(s,0,{kind:'inject',target:1});assert.equal(s.turn,3);

 const found=new Set();for(let seed=1;seed<100;seed++){s=createGame(seed,0,2,0);assert.equal(s.rule,'normal');s.deck=['sterile'];s.players.forEach(p=>p.items=[]);s=play(s,0,{kind:'inject',target:0});found.add(s.rule);if(s.rule==='scarce')assert.equal(s.players[0].items.length,0);}assert.deepEqual([...found].sort(),Object.keys(RULES).filter(x=>x!=='normal').sort());
});
test('900 full AI games with 2, 3 and 4 players terminate without hidden information',()=>{
 const stats={};for(const count of [2,3,4]){let maximum=0,turns=0;for(let seed=1;seed<=300;seed++){let s=createGame(seed,seed%count,count,0),steps=0;const memories=Array.from({length:count},()=>({}));for(let i=0;i<count;i++)remember(memories[i],viewGame(s,i,1));while(s.phase==='playing'&&steps++<350){const a=s.turn,v=viewGame(s,a,s.availableAt);s=play(s,a,chooseAction(v,memories[a]));for(let i=0;i<count;i++)remember(memories[i],viewGame(s,i,s.event?.refill?s.availableAt-1:s.availableAt));for(const p of s.players){assert.ok(p.hp>=0&&p.hp<=4);assert.ok(p.items.length<=4);}assert.ok(s.used<=8);}assert.equal(s.phase,'finished',`players ${count} seed ${seed}`);maximum=Math.max(maximum,steps);turns+=steps;}stats[count]={max:maximum,mean:Math.round(turns/300)};}console.log('Public-memory AI simulations:',stats);
});

test('items are limited by inventory, pills heal one and do not waste at full health',()=>{
 let s=setup(['dirty','necrosis','sterile']);s.players[0].items=['lighter','wipe','catheter'];s=play(s,0,{kind:'item',index:0});s=play(s,0,{kind:'item',index:0});s=play(s,0,{kind:'item',index:0});assert.equal(s.used,3);assert.equal(s.turn,0);assert.deepEqual(s.players[0].items,[]);
 s=setup();s.players[0].items=['tourniquet'];assert.throws(()=>play(s,0,{kind:'item',index:0}),/Пульс полный/);assert.equal(s.players[0].items.length,1);s.players[0].hp=2;s=play(s,0,{kind:'item',index:0});assert.equal(s.players[0].hp,3);assert.equal(s.event.heal,1);
});
test('starting items are random for each player without duplicates; lighter holds its reaction',()=>{
 const starts=new Set();for(let seed=1;seed<=40;seed++){const s=createGame(seed*917321,0,4,0);for(const p of s.players){assert.equal(p.items.length,2);assert.notEqual(p.items[0],p.items[1]);starts.add(p.items.join(','));}}assert.ok(starts.size>10);
 let g=setup();g.players[0].items=['lighter'];const now=g.availableAt+1;g=act(g,0,{kind:'item',index:0},now);assert.equal(g.availableAt-now,7600/1.5);assert.throws(()=>act(g,0,{kind:'inject',target:1},now+3600),/Дождись/);
});
test('defibrillator trades initiative even with morphine and bonus; rejected theft is atomic',()=>{
 let s=setup();s.players[0].hp=1;s.players[0].morphine=true;s.players[0].bonus=true;s.players[0].items=['defib'];s.players[1].items=['wipe'];s=play(s,0,{kind:'item',index:0});assert.equal(s.turn,1);assert.equal(s.players[0].hp,1);assert.equal(s.players[0].bonus,false);assert.equal(s.players[0].morphine,true);assert.deepEqual(s.players[1].items,['wipe']);
 s=setup();s.players[0].items=['scalpel'];s.players[1].items=['lighter'];const before=JSON.stringify(s);assert.throws(()=>play(s,0,{kind:'item',index:0,target:1,steal:4}),/Выбери/);assert.equal(JSON.stringify(s),before);
});
