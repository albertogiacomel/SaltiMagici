import {bound,touches,move} from './physics.mjs';
import {makeLevel,GROUND} from './levels.mjs';
export const STEP=1/60;
export function createGame(index=0,difficulty='relaxed',snapshot=null){
  const level=makeLevel(index),maxHearts=difficulty==='relaxed'?5:3;
  const state={level,difficulty,maxHearts,hearts:maxHearts,coins:0,stars:0,score:0,time:0,checkpoint:96,finished:false,events:[],particles:[],power:0,jumpHeld:false,jumpBuffer:0,coyote:0,
    player:{x:96,y:GROUND-54,w:32,h:54,vx:0,vy:0,grounded:false,facing:1,invincible:1}};
  if(snapshot?.level===index){
    const checkpoint=level.checkpoints.includes(snapshot.checkpoint)?snapshot.checkpoint:96;
    state.checkpoint=checkpoint;state.player.x=checkpoint;
    for(const item of level.items)if(snapshot.collected?.includes(item.id)){item.collected=true;if(item.kind==='star')state.stars++;else state.coins++;}
    for(const box of level.boxes)box.used=Boolean(snapshot.used?.includes(box.id));
    for(const enemy of level.enemies)enemy.dead=Boolean(snapshot.dead?.includes(enemy.id));
    state.score=state.coins*10+state.stars*100+level.enemies.filter(e=>e.dead).length*50+level.boxes.filter(b=>b.used).length*30;
  }
  return state;
}
export function serialize(state){return {level:state.level.index,checkpoint:state.checkpoint,collected:state.level.items.filter(i=>i.collected).map(i=>i.id),used:state.level.boxes.filter(b=>b.used).map(b=>b.id),dead:state.level.enemies.filter(e=>e.dead).map(e=>e.id)};}
export function hurt(state,pit=false){
  const p=state.player;if(p.invincible>0&&!pit)return;
  if(state.power>0&&!pit){state.power=0;p.invincible=2;state.events.push('shield');return;}
  state.hearts--;if(state.hearts<=0){state.hearts=state.maxHearts;state.events.push('retry');}else state.events.push('hurt');
  p.x=state.checkpoint;p.y=GROUND-p.h;p.vx=0;p.vy=0;p.invincible=2;state.jumpBuffer=0;
}
export function step(state,input={},dt=STEP){
  if(state.finished)return;
  dt=bound(dt,0,STEP);state.time+=dt;
  const p=state.player;p.invincible=Math.max(0,p.invincible-dt);state.power=Math.max(0,state.power-dt);
  const direction=Number(Boolean(input.right))-Number(Boolean(input.left));
  const maxSpeed=input.run?330:260;
  if(direction){p.vx=bound(p.vx+direction*1800*dt,-maxSpeed,maxSpeed);p.facing=direction;}
  else{const friction=2200*dt;p.vx=Math.abs(p.vx)<=friction?0:p.vx-Math.sign(p.vx)*friction;}
  if(input.jump&&!state.jumpHeld)state.jumpBuffer=.14;
  state.jumpHeld=Boolean(input.jump);state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
  state.coyote=p.grounded?.11:Math.max(0,state.coyote-dt);
  if(state.jumpBuffer>0&&state.coyote>0){p.vy=-760;p.grounded=false;state.coyote=0;state.jumpBuffer=0;state.events.push('jump');}
  if(!input.jump&&p.vy < -310)p.vy=-310;
  p.vy=bound(p.vy+1750*dt,-900,900);
  const previousBottom=p.y+p.h;
  move(p,state.level.solids,dt,box=>{
    if(box.kind==='box'&&!box.used){box.used=true;state.power=12;state.score+=30;state.events.push('power');}
  });
  p.x=bound(p.x,Math.max(0,state.checkpoint-96),state.level.width-p.w);
  if(p.y>650){hurt(state,true);return;}
  for(const item of state.level.items)if(!item.collected&&touches(p,item)){
    item.collected=true;state.score+=item.kind==='star'?100:10;
    if(item.kind==='star')state.stars++;else state.coins++;
    state.events.push(item.kind);
  }
  for(const enemy of state.level.enemies)if(!enemy.dead){
    enemy.x+=enemy.vx*dt;
    if(enemy.x<=enemy.left){enemy.x=enemy.left;enemy.vx=Math.abs(enemy.vx);}
    if(enemy.x>=enemy.right){enemy.x=enemy.right;enemy.vx=-Math.abs(enemy.vx);}
    if(touches(p,enemy)){
      if((p.vy>0&&previousBottom<=enemy.y+14)||state.power>0){enemy.dead=true;state.score+=50;p.vy=-450;state.events.push('stomp');}
      else hurt(state);
    }
  }
  for(const checkpoint of state.level.checkpoints)if(p.x>=checkpoint&&checkpoint>state.checkpoint){state.checkpoint=checkpoint;state.events.push('checkpoint');}
  if(p.x>=state.level.goal){state.finished=true;state.events.push('finish');}
}
