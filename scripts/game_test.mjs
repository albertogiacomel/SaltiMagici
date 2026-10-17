import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,serialize,hurt,STEP} from '../dist/engine.mjs';
import {makeLevel,GROUND} from '../dist/levels.mjs';
import {messages,levelNames} from '../dist/i18n.mjs';
import {move,overlap} from '../dist/physics.mjs';
const ticks=(s,n,input={})=>{for(let i=0;i<n;i++)step(s,input);};
test('both languages cover every UI label and level',()=>{assert.deepEqual(Object.keys(messages.it).sort(),Object.keys(messages.en).sort());for(const lang of ['it','en'])for(const theme of ['classic','elsa'])assert.equal(levelNames[lang][theme].length,3);});
test('upstream AABB collision includes intersecting bodies, excludes separated bodies',()=>{assert.equal(overlap(0,0,10,10,9,2,10,10),true);assert.equal(overlap(0,0,10,10,10,2,10,10),false);});
test('falling onto a solid platform stops at its top',()=>{const b={x:20,y:20,w:30,h:40,vx:0,vy:500};move(b,[{x:0,y:65,w:100,h:20}],STEP);assert.equal(b.y,25);assert.equal(b.vy,0);assert.equal(b.grounded,true);});
test('wall collision prevents walking through a block',()=>{const b={x:15,y:20,w:30,h:40,vx:400,vy:0};move(b,[{x:48,y:0,w:48,h:100}],STEP);assert.equal(b.x,18);assert.equal(b.vx,0);});
test('player accelerates, reverses facing and stops with friction',()=>{const s=createGame();ticks(s,20,{right:true});assert.ok(s.player.x>145);assert.equal(s.player.facing,1);ticks(s,30,{left:true});assert.equal(s.player.facing,-1);ticks(s,30);assert.equal(s.player.vx,0);});
test('held jump travels higher than a tapped jump, without repeated automatic jumps',()=>{const held=createGame(),tap=createGame();ticks(held,3);ticks(tap,3);let heldY=480,tapY=480;for(let i=0;i<70;i++){step(held,{jump:true});step(tap,{jump:i<3});heldY=Math.min(heldY,held.player.y);tapY=Math.min(tapY,tap.player.y);}assert.ok(heldY<tapY-50);assert.ok(held.player.y>GROUND-56);assert.equal(held.events.filter(e=>e==='jump').length,1);});
test('jump buffer accepts a press just before landing',()=>{const s=createGame();s.player.y=GROUND-s.player.h-8;s.player.vy=200;for(let i=0;i<6;i++)step(s,{jump:true});assert.ok(s.player.vy<0);assert.ok(s.events.includes('jump'));});
test('reward blocks activate only once and grant protection after pickup',()=>{const s=createGame(),b=s.level.boxes[0];s.player.x=b.x+8;s.player.y=b.y+b.h+2;s.player.vy=-600;step(s,{jump:true});assert.equal(b.used,true);const power=s.level.items.find(i=>i.kind==='power'&&!i.collected);assert.ok(power);s.player.x=power.x;s.player.y=power.y;s.player.vy=0;step(s);assert.ok(s.power>11);const score=s.score;s.player.y=b.y+b.h+2;s.player.vy=-600;step(s,{jump:true});assert.equal(s.score,score);});
test('collectibles count once; stars are separate from coins',()=>{const s=createGame(),coin=s.level.items.find(i=>i.kind==='coin');s.player.x=coin.x;s.player.y=coin.y;s.player.vy=0;step(s);step(s);assert.equal(s.coins,1);const star=s.level.items.find(i=>i.kind==='star');s.player.x=star.x;s.player.y=star.y;s.player.vy=0;step(s);assert.equal(s.stars,1);});
test('landing on an enemy defeats it; side impact removes one heart with invulnerability',()=>{const s=createGame(),enemy=s.level.enemies[0];s.player.x=enemy.x;s.player.y=enemy.y-s.player.h-2;s.player.vy=250;s.player.invincible=0;step(s);assert.equal(enemy.dead,true);assert.ok(s.player.vy<0);const other=s.level.enemies[1];s.player.x=other.x;s.player.y=other.y;s.player.vy=0;s.player.invincible=0;const hearts=s.hearts;step(s);assert.equal(s.hearts,hearts-1);hurt(s);assert.equal(s.hearts,hearts-1);});
test('pit recovery uses checkpoints and never exhausts attempts',()=>{const s=createGame();s.checkpoint=s.level.checkpoints[0];s.hearts=1;s.player.y=700;step(s);assert.equal(s.player.x,s.checkpoint);assert.equal(s.hearts,s.maxHearts);assert.ok(s.events.includes('retry'));});
test('checkpoint serialization preserves collected rewards without duplication',()=>{const s=createGame(1);s.level.items[0].collected=true;s.level.boxes[0].used=true;s.level.enemies[0].dead=true;s.checkpoint=s.level.checkpoints[0];const restored=createGame(1,'normal',serialize(s));assert.equal(restored.player.x,s.checkpoint);assert.equal(restored.coins,1);assert.equal(restored.level.boxes[0].used,true);assert.equal(restored.level.enemies[0].dead,true);assert.equal(restored.maxHearts,3);});
test('invalid saved checkpoint falls back to the safe start',()=>{const s=createGame(0,'relaxed',{level:0,checkpoint:NaN});assert.equal(s.player.x,96);});
for(let index=0;index<3;index++){
  test(`level ${index+1} contains three stars, reachable gaps, safe checkpoints and a working exit`,()=>{
    const level=makeLevel(index);assert.equal(level.items.filter(i=>i.kind==='star').length,3);
    for(const [a,b]of level.gaps)assert.ok((b-a)*48<=144);
    for(const checkpoint of level.checkpoints)assert.ok(level.solids.some(t=>t.kind==='ground'&&checkpoint>=t.x&&checkpoint+32<t.x+t.w));
    const s=createGame(index);s.player.x=level.goal;step(s);assert.equal(s.finished,true);const before=s.time;step(s,{right:true});assert.equal(s.time,before);
  });
  test(`level ${index+1} can be completed through ordinary simulated controls`,()=>{
    const s=createGame(index);let release=0,jumping=false;
    for(let frame=0;frame<22000&&!s.finished;frame++){
      const p=s.player;
      const groundAhead=s.level.solids.some(t=>t.kind==='ground'&&p.x+p.w+50>=t.x&&p.x+p.w+50<t.x+t.w);
      const obstacle=s.level.solids.some(t=>t.kind!=='ground'&&t.x>p.x&&t.x-p.x<95&&t.y>=p.y-8&&t.y<p.y+p.h);
      const enemy=s.level.enemies.some(e=>!e.dead&&e.x>p.x&&e.x-p.x<95);
      if(p.grounded&&release===0&&(!groundAhead||obstacle||enemy)){jumping=true;release=45;}
      if(release>0)release--;else jumping=false;
      step(s,{right:true,jump:jumping});
    }
    assert.equal(s.finished,true,`Player stopped at x=${s.player.x}, y=${s.player.y}`);
  });
}
