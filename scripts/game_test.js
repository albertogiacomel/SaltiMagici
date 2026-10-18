import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,serialize,hurt,STEP,backtrackLimit} from '../dist/engine.js';
import {cameraTarget} from '../dist/renderer.js';
import {BACKTRACK_MARGIN,COLLECTIBLE_APPROACH,CAMERA_OFFSET} from '../dist/config.js';
import {makeLevel,GROUND} from '../dist/levels.js';
import {messages,levelNames} from '../dist/i18n.js';
import {move,overlap} from '../dist/physics.js';
const ticks=(s,n,input={})=>{for(let i=0;i<n;i++)step(s,input);};
test('both languages cover every UI label and level',()=>{assert.deepEqual(Object.keys(messages.it).sort(),Object.keys(messages.en).sort());for(const lang of ['it','en'])for(const theme of ['classic','elsa'])assert.equal(levelNames[lang][theme].length,3);});
test('upstream AABB collision includes intersecting bodies, excludes separated bodies',()=>{assert.equal(overlap(0,0,10,10,9,2,10,10),true);assert.equal(overlap(0,0,10,10,10,2,10,10),false);});
test('falling onto a solid platform stops at its top',()=>{const b={x:20,y:20,w:30,h:40,vx:0,vy:500};move(b,[{x:0,y:65,w:100,h:20}],STEP);assert.equal(b.y,25);assert.equal(b.vy,0);assert.equal(b.grounded,true);});
test('wall collision prevents walking through a block',()=>{const b={x:15,y:20,w:30,h:40,vx:400,vy:0};move(b,[{x:48,y:0,w:48,h:100}],STEP);assert.equal(b.x,18);assert.equal(b.vx,0);});
test('player accelerates, reverses facing and stops with friction',()=>{const s=createGame();ticks(s,20,{right:true});assert.ok(s.player.x>145);assert.equal(s.player.facing,1);ticks(s,30,{left:true});assert.equal(s.player.facing,-1);ticks(s,30);assert.equal(s.player.vx,0);});
test('held jump travels higher than a tapped jump, without repeated automatic jumps',()=>{const held=createGame(),tap=createGame();ticks(held,3);ticks(tap,3);let heldY=480,tapY=480;for(let i=0;i<70;i++){step(held,{jump:true});step(tap,{jump:i<3});heldY=Math.min(heldY,held.player.y);tapY=Math.min(tapY,tap.player.y);}assert.ok(heldY<tapY-50);assert.ok(held.player.y>GROUND-56);assert.equal(held.events.filter(e=>e==='jump').length,1);});
test('jump buffer accepts a press just before landing',()=>{const s=createGame();s.player.y=GROUND-s.player.h-8;s.player.vy=200;for(let i=0;i<6;i++)step(s,{jump:true});assert.ok(s.player.vy<0);assert.ok(s.events.includes('jump'));});
test('reward blocks activate only once and grant protection after pickup',()=>{const s=createGame(),b=s.level.boxes[0];s.player.x=b.x+8;s.player.y=b.y+b.h+2;s.player.vy=-600;step(s,{jump:true});assert.equal(b.used,true);const power=s.level.items.find(i=>i.kind==='power'&&!i.collected);assert.ok(power);s.player.x=power.x;s.player.y=power.y;s.player.vy=0;step(s);assert.ok(s.power>4);const score=s.score;s.player.y=b.y+b.h+2;s.player.vy=-600;step(s,{jump:true});assert.equal(s.score,score);});
test('collectibles count once; stars are separate from coins',()=>{const s=createGame(),coin=s.level.items.find(i=>i.kind==='coin');s.player.x=coin.x;s.player.y=coin.y;s.player.vy=0;step(s);step(s);assert.equal(s.coins,1);const star=s.level.items.find(i=>i.kind==='star');s.player.x=star.x;s.player.y=star.y;s.player.vy=0;step(s);assert.equal(s.stars,1);});
test('landing on an enemy defeats it; side impact removes one heart with invulnerability',()=>{const s=createGame(),enemy=s.level.enemies[0];s.player.x=enemy.x;s.player.y=enemy.y-s.player.h-2;s.player.vy=250;s.player.invincible=0;step(s);assert.equal(enemy.dead,true);assert.ok(s.player.vy<0);const other=s.level.enemies[1];s.player.x=other.x;s.player.y=other.y;s.player.vy=0;s.player.invincible=0;const hearts=s.hearts;step(s);assert.equal(s.hearts,hearts-1);hurt(s);assert.equal(s.hearts,hearts-1);});
test('pit recovery uses checkpoints and never exhausts attempts',()=>{const s=createGame();s.checkpoint=s.level.checkpoints[0];s.hearts=1;s.player.y=700;step(s);assert.equal(s.player.x,s.checkpoint);assert.equal(s.hearts,s.maxHearts);assert.ok(s.events.includes('retry'));});
test('checkpoint serialization preserves collected rewards without duplication',()=>{const s=createGame(1);s.level.items[0].collected=true;s.level.boxes[0].used=true;s.level.enemies[0].dead=true;s.checkpoint=s.level.checkpoints[0];const restored=createGame(1,'normal',serialize(s));assert.equal(restored.player.x,s.checkpoint);assert.equal(restored.coins,1);assert.equal(restored.level.boxes[0].used,true);assert.equal(restored.level.enemies[0].dead,true);assert.equal(restored.maxHearts,3);});
test('invalid saved checkpoint falls back to the safe start',()=>{const s=createGame(0,'relaxed',{level:0,checkpoint:NaN});assert.equal(s.player.x,96);});
test('completed areas retain the backward limit without pushing the player forward',()=>{
  const s=createGame();for(const item of s.level.items)item.collected=true;for(const box of s.level.boxes)box.used=true;
  s.player.x=500;s.furthestX=500;ticks(s,100,{left:true});assert.equal(s.player.x,500-BACKTRACK_MARGIN);
  s.player.x=100;step(s);assert.ok(s.player.x<=100,'Closing the limit never teleports a player');
  assert.equal(cameraTarget(s),0);
});
test('camera follows a return to a missed reward and clamps at both level edges',()=>{
  const s=createGame();s.furthestX=s.level.width-300;s.checkpoint=s.level.checkpoints.at(-1);
  s.player.x=2000;const ahead=cameraTarget(s);s.player.x=500;
  assert.ok(cameraTarget(s)<ahead);assert.equal(cameraTarget(s),500-CAMERA_OFFSET);
  s.player.x=0;assert.equal(cameraTarget(s),0);
  s.player.x=s.level.width-32;assert.equal(cameraTarget(s),s.level.width-960);
  s.level.width=640;s.player.x=0;assert.equal(cameraTarget(s),0);
});
for(let index=0;index<3;index++){
  test(`level ${index+1} keeps every missed reward and its jump approach accessible after checkpoints`,()=>{
    const s=createGame(index);s.checkpoint=s.level.checkpoints.at(-1);s.furthestX=s.level.goal-32;
    for(const reward of [...s.level.items,...s.level.boxes]){
      for(const item of s.level.items)item.collected=true;for(const box of s.level.boxes)box.used=true;
      if(reward.kind==='box')reward.used=false;else reward.collected=false;
      assert.ok(backtrackLimit(s)<=Math.max(0,reward.x-COLLECTIBLE_APPROACH),reward.id);
    }
    for(const item of s.level.items)item.collected=false;for(const box of s.level.boxes)box.used=false;
    const restored=createGame(index,'normal',serialize(s));assert.equal(backtrackLimit(restored),0);
    // Real controls can return more than 200 px to the initial missed coin.
    s.player.x=500;ticks(s,80,{left:true});assert.ok(s.player.x<220);assert.ok(s.coins>0);
    const checkpoint=s.checkpoint;hurt(s,true);assert.equal(s.player.x,checkpoint);
    // Isolate each collectible to ensure none is hidden by the movement boundary.
    for(const reward of s.level.items){
      for(const item of s.level.items)item.collected=true;for(const box of s.level.boxes)box.used=true;
      reward.collected=false;s.player.x=reward.x;s.player.y=reward.y;s.player.vx=0;s.player.vy=0;
      step(s);assert.equal(reward.collected,true,`${reward.id} remains collectible`);
    }
  });
  test(`level ${index+1} retains approach space for unopened blocks and spawned protection`,()=>{
    const s=createGame(index);s.furthestX=s.level.goal-32;s.checkpoint=s.level.checkpoints.at(-1);
    for(const item of s.level.items)item.collected=true;for(const box of s.level.boxes)box.used=true;
    const box=s.level.boxes[0];box.used=false;assert.ok(backtrackLimit(s)<=Math.max(0,box.x-COLLECTIBLE_APPROACH));
    s.player.x=box.x+8;s.player.y=box.y+box.h+2;s.player.vy=-600;step(s,{jump:true});
    assert.equal(box.used,true);const power=s.level.items.find(item=>item.kind==='power'&&!item.collected);assert.ok(power);
    assert.ok(backtrackLimit(s)<=Math.max(0,power.x-COLLECTIBLE_APPROACH));
  });
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
