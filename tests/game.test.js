import test from 'node:test';
import assert from 'node:assert/strict';
import {course,player,stepPlayer,race,stepRace,FINISH,MODES,syncCourse,passage,segmentDistance} from '../game-core.js';
test('identical seeds give both players exactly the same course',()=>{assert.deepEqual(course(77),course(77));assert.notDeepEqual(course(77),course(78));assert.ok(course(77).length>50);});
test('asteroids scatter through a volume with small stones and giant boulders',()=>{
  for(const mode of Object.keys(MODES)){
    const rocks=course(77,mode).filter(item=>item.type==='rock');
    assert.ok(rocks.some(r=>r.r<30));assert.ok(rocks.some(r=>r.r>150));
    for(const axis of ['x','y','z'])assert.equal(new Set(rocks.map(r=>r[axis])).size,rocks.length,'no aligned rows on '+axis);
    for(const side of [r=>r.x<0,r=>r.x>640,r=>r.y<0,r=>r.y>480])assert.ok(rocks.some(side),'field extends outside flight bounds');
  }
});
test('endless mode streams deterministic chunks, frees old rocks and has no distance or time limit',()=>{
 const a=race(77,[{id:'a',name:'A'}],'endless'),b=race(77,[{id:'a',name:'A'}],'endless');a.state=b.state='racing';
 for(const distance of [9000,24500,90000,1000000]){
  a.players[0].distance=b.players[0].distance=distance;syncCourse(a);syncCourse(b);assert.deepEqual(a.track,b.track);
  assert.ok(a.track.some(t=>t.z>distance+4000));assert.ok(a.track.length<2000);assert.equal(new Set(a.track.map(t=>t.id)).size,a.track.length);
 }
 a.elapsed=500;stepRace(a,{},1/60);assert.equal(a.state,'racing');assert.equal(a.players[0].finished,false);assert.ok(a.players[0].distance>1000000);
 const duel=race(77,[{id:'a',name:'A'},{id:'b',name:'B'}],'endless');duel.state='racing';duel.players[0].dead=true;stepRace(duel,{},1/60);assert.equal(duel.winner,'b');assert.equal(duel.state,'finished');
 a.players[0].dead=true;stepRace(a,{},1/60);assert.equal(a.state,'finished');
});
test('frame rate does not change distance, boost or steering',()=>{const a=player('a','A'),b=player('b','B');for(let i=0;i<600;i++)stepPlayer(a,{right:true,boost:true},1/60,[]);for(let i=0;i<300;i++){stepPlayer(b,{right:true,boost:true},1/60,[]);stepPlayer(b,{right:true,boost:true},1/60,[]);}assert.equal(a.distance,b.distance);assert.equal(a.boost,b.boost);assert.equal(a.x,620);});
test('collision costs a shield and speed, invulnerability prevents duplicate damage',()=>{const p=player('a','A');p.speed=225;const track=[{id:0,x:320,z:0,r:30,type:'rock'}];stepPlayer(p,{},1/60,track);assert.equal(p.shield,2);assert.ok(p.speed<225);stepPlayer(p,{},1/60,track);assert.equal(p.shield,2);});
test('shield pickup can only be collected once per player',()=>{const p=player('a','A');p.shield=1;const track=[{id:0,x:320,z:0,r:30,type:'shield'}];stepPlayer(p,{},1/60,track);stepPlayer(p,{},1/60,track);assert.equal(p.shield,2);assert.deepEqual(p.collected,[0]);});
test('third collision ends a flight and stops progress',()=>{const p=player('a','A');p.shield=1;stepPlayer(p,{},1/60,[{id:0,x:320,z:0,r:30,type:'rock'}]);assert.equal(p.dead,true);const d=p.distance;stepPlayer(p,{boost:true},1,[]);assert.equal(p.distance,d);});
test('countdown prevents early movement',()=>{const r=race(1,[{id:'a',name:'A'}]);for(let i=0;i<120;i++)stepRace(r,{a:{boost:true}},1/60);assert.equal(r.state,'countdown');assert.equal(r.players[0].distance,0);});
test('server assigns finish winner and ties fairly',()=>{const r=race(1,[{id:'a',name:'A'},{id:'b',name:'B'}]);r.state='racing';r.track=[];r.players[0].distance=FINISH-.1;r.players[0].speed=225;stepRace(r,{},1/60);assert.equal(r.state,'finished');assert.equal(r.winner,'a');const tie=race(1,[{id:'a',name:'A'},{id:'b',name:'B'}]);tie.state='racing';tie.track=[];for(const p of tie.players){p.distance=FINISH-.1;p.speed=225;}stepRace(tie,{},1/60);assert.equal(tie.reason,'draw');assert.equal(tie.winner,null);});
test('full 3D course has a navigable passage in every mode',()=>{for(const mode of Object.keys(MODES).filter(m=>m!=='endless'))for(const seed of [1,77,4242,10234]){const p=player('a','A',0,mode),track=course(seed,mode);for(let i=0;i<60*100&&!p.finished&&!p.dead;i++){const target=passage(seed,p.distance+p.speed*.15);stepPlayer(p,{axisX:Math.max(-1,Math.min(1,(target.x-p.x)/35)),axisY:Math.max(-1,Math.min(1,(target.y-p.y)/35))},1/60,track,mode);}assert.equal(p.finished,true,'unfair course '+mode+' seed '+seed);}});
test('vertical steering avoids a rock at the same lateral position',()=>{const p=player('a','A');p.y=410;p.speed=580;stepPlayer(p,{},1/60,[{id:0,x:320,y:80,z:0,r:50,type:'rock'}]);assert.equal(p.shield,3);const old=p.y;stepPlayer(p,{down:true},.1,[]);assert.ok(p.y<old);});
test('diagonal inputs are normalized and bounded',()=>{const a=player('a','A'),b=player('b','B');stepPlayer(a,{up:true},.1,[]);stepPlayer(b,{up:true,right:true},.1,[]);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-Math.hypot(a.vx,a.vy))<.001);for(let i=0;i<300;i++)stepPlayer(b,{axisX:100,axisY:100},1/60,[]);assert.equal(b.x,620);assert.equal(b.y,460);});
test('fast movement cannot tunnel through a small asteroid',()=>{const p=player('a','A');p.speed=1000;stepPlayer(p,{boost:true},.1,[{id:0,x:320,y:240,z:45,r:10,type:'rock'}]);assert.equal(p.shield,2);assert.equal(segmentDistance({x:0,y:0,z:0},{x:0,y:0,z:100},{x:0,y:0,z:50}),0);});
test('phase blocks collision damage and expires',()=>{const p=player('a','A');stepPlayer(p,{},1/60,[{id:1,x:320,y:240,z:0,r:30,type:'phase'}]);assert.equal(p.phase,5);stepPlayer(p,{},1/60,[{id:2,x:320,y:240,z:0,r:30,type:'rock'}]);assert.equal(p.shield,3);for(let i=0;i<310;i++)stepPlayer(p,{},1/60,[]);assert.equal(p.phase,0);});
test('reactor upgrades cap at three and refill boost; nitro pickup fills tank',()=>{const p=player('a','A');p.boost=0;for(let id=0;id<4;id++)stepPlayer(p,{},1/60,[{id,x:p.x,y:p.y,z:p.distance,r:30,type:'reactor'}]);assert.equal(p.reactor,3);assert.equal(p.collected.length,4);p.boost=0;stepPlayer(p,{},1/60,[{id:8,x:p.x,y:p.y,z:p.distance,r:30,type:'nitro'}]);assert.equal(p.boost,100);});
test('near miss rewards once, with combo and energy',()=>{const p=player('a','A');p.speed=600;p.boost=50;const item={id:0,x:365,y:240,z:3,r:20,type:'rock'};stepPlayer(p,{},1/60,[item]);assert.equal(p.shield,3);assert.equal(p.nearMisses,1);assert.equal(p.combo,1);assert.equal(p.score,50);assert.ok(p.boost>55);stepPlayer(p,{},1/60,[item]);assert.equal(p.nearMisses,1);});
test('mode rules apply on server races and invalid mode falls back',()=>{const r=race(9,[{id:'a',name:'A'}],'overdrive');assert.equal(r.players[0].shield,1);assert.equal(r.finish,26000);assert.equal(race(9,[],'bad').mode,'sprint');const p=player('a','A',0,'chill');for(let i=0;i<5;i++){p.invincible=0;stepPlayer(p,{},1/60,[{id:i,x:p.x,y:p.y,z:p.distance,r:30,type:'rock'}],'chill');}assert.equal(p.dead,false);assert.equal(p.shield,3);});
