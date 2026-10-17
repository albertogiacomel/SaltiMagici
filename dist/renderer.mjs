import {bound} from './physics.mjs';
const palette={classic:{ground:'#ba8051',edge:'#79ae5b',lip:'#b8d77b',brick:'#d9a066',shadow:'#986340',platform:'#f3d79a',sky:'#bde9ef'},elsa:{ground:'#9b9dc7',edge:'#e2efff',lip:'#fffaff',brick:'#b0b9e7',shadow:'#777dab',platform:'#d1d7f4',sky:'#dce1ff'}};
const rounded=(c,x,y,w,h,r,fill)=>{c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
const ellipse=(c,x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
function path(c,points,fill,stroke){c.beginPath();points(c);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.2;c.stroke();}}
export function star(c,x,y,r=14,fill='#ffdc76'){
  c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.46:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle='#d8a553';c.lineWidth=1.5;c.stroke();
}
export function collectible(c,x,y,theme,time=0){
  c.save();c.translate(x,y+Math.sin(time*3+x)*2);
  if(theme==='elsa'){
    for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);ellipse(c,0,-8,4.4,7,'#fffef8');c.restore();}
    ellipse(c,0,0,6,6,'#f6c951');ellipse(c,-1,-2,2,2,'#fff0aa');
  }else{ellipse(c,0,0,10,13,'#c68c30');ellipse(c,0,-1,8,11,'#ffda66');c.strokeStyle='#fff0a2';c.lineWidth=2;c.beginPath();c.moveTo(0,-7);c.lineTo(0,6);c.stroke();}
  c.restore();
}
function reward(c,x,y,theme){
  if(theme==='elsa'){path(c,p=>{p.moveTo(x-8,y);p.lineTo(x-19,y-8);p.lineTo(x-19,y+8);p.closePath();},'#db91b7');path(c,p=>{p.moveTo(x+8,y);p.lineTo(x+19,y-8);p.lineTo(x+19,y+8);p.closePath();},'#db91b7');rounded(c,x-11,y-9,22,18,7,'#f3c5d9');c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(x-5,y-7);c.lineTo(x+4,y+7);c.stroke();}
  else{rounded(c,x-6,y-1,12,15,4,'#fff3d3');path(c,p=>{p.moveTo(x-17,y);p.bezierCurveTo(x-15,y-25,x+15,y-25,x+17,y);p.closePath();},'#e87b62');ellipse(c,x-7,y-8,4,4,'#ffe9b3');ellipse(c,x+7,y-9,4,4,'#ffe9b3');}
}
// Resolution-independent character artwork. Limbs, braid and cape animate independently.
export function character(c,x,feet,theme,time,moving=false,air=false,facing=1){
  c.save();c.translate(x,feet);c.scale(facing*1.18,1.18);
  const stride=moving?Math.sin(time*14)*6:0,bob=moving?Math.abs(Math.sin(time*14))*1.5:0;
  c.translate(0,-bob);
  if(theme==='elsa'){
    path(c,p=>{p.moveTo(-10,-36);p.bezierCurveTo(-25,-27,-23+stride*.3,-6,-28,0);p.quadraticCurveTo(-2,5,8,-4);p.lineTo(8,-33);},'#d5f4ffb8','#8fc8e4');
    rounded(c,-9,-4,13,5,3,'#a1d9f2');
    rounded(c,-2,-4,12,5,3,'#a1d9f2');
    path(c,p=>{p.moveTo(-8,-36);p.quadraticCurveTo(-13,-19,-19-stride*.3,-3);p.quadraticCurveTo(0,3,17,-3);p.quadraticCurveTo(7,-24,8,-36);p.closePath();},'#69cce4','#378eb7');
    path(c,p=>{p.moveTo(1,-34);p.quadraticCurveTo(-4,-15,-8,-1);p.lineTo(11,-3);p.quadraticCurveTo(4,-18,4,-34);},'#a2e7f2');
    rounded(c,-9,-38,17,17,4,'#47b6d6');
    c.strokeStyle='#c0eefb';c.lineWidth=3;c.beginPath();c.moveTo(-8,-32);c.lineTo(-15,-22);c.lineTo(-11,-17);c.stroke();
    c.strokeStyle='#ffe0cd';c.beginPath();c.moveTo(7,-33);c.lineTo(16,-24-(air?8:0));c.lineTo(21,-28-(air?8:0));c.stroke();
    ellipse(c,-2,-49,13,15,'#efdfb6');ellipse(c,1,-48,10,12,'#ffe2ce');
    path(c,p=>{p.moveTo(-12,-47);p.bezierCurveTo(-17,-66,12,-68,13,-54);p.quadraticCurveTo(2,-62,-7,-49);p.lineTo(-8,-39);},'#f8edcd','#dacb9f');
    for(let i=0;i<6;i++){ellipse(c,-11-Math.sin(i)*1.4,-39+i*3.7,3.6,3.4,i%2?'#fff1ce':'#eaddb7');}rounded(c,-14,-18,6,3,1,'#78b4d4');
    ellipse(c,5,-49,3.3,3.8,'#fff');ellipse(c,6,-49,1.8,2.8,'#4d8fa9');ellipse(c,6.5,-49,1,1.8,'#244458');
    c.strokeStyle='#685560';c.lineWidth=1;c.beginPath();c.moveTo(2,-52);c.quadraticCurveTo(5,-54,9,-52);c.stroke();
    ellipse(c,8,-44,2.6,1.7,'#f1acb2');c.strokeStyle='#b97686';c.beginPath();c.moveTo(4,-41);c.quadraticCurveTo(7,-39,9,-42);c.stroke();
    for(const [sx,sy] of [[0,-30],[5,-18],[-4,-10]]){c.fillStyle='#e1fbff';c.fillRect(sx,sy,2,2);}
  }else{
    c.save();c.translate(-6,-14);c.rotate(stride*.06);rounded(c,-5,0,10,12,3,'#297e82');rounded(c,-6,9,15,6,3,'#6b503b');c.restore();
    c.save();c.translate(6,-14);c.rotate(-stride*.06);rounded(c,-5,0,10,12,3,'#3c9794');rounded(c,-5,9,15,6,3,'#6b503b');c.restore();
    rounded(c,-13,-38,26,25,7,'#efbf57');rounded(c,-11,-27,23,16,4,'#318e91');rounded(c,-9,-37,4,15,1,'#318e91');rounded(c,7,-37,4,15,1,'#318e91');
    c.strokeStyle='#f5cd70';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-10,-33);c.lineTo(-18,-21);c.stroke();c.beginPath();c.moveTo(11,-33);c.lineTo(19,-25-(air?12:0));c.stroke();
    ellipse(c,-18,-19,4,4,'#f4c7a2');ellipse(c,19,-23-(air?12:0),4,4,'#f4c7a2');
    ellipse(c,0,-47,13,13,'#9e6540');ellipse(c,3,-45,11,12,'#f7cfac');ellipse(c,12,-44,5,4,'#f4c29a');
    path(c,p=>{p.moveTo(-13,-51);p.quadraticCurveTo(-13,-69,9,-62);p.lineTo(13,-51);p.closePath();},'#df7055','#b4513f');rounded(c,-12,-54,32,6,3,'#ef8b67');
    ellipse(c,7,-46,2,3,'#314955');ellipse(c,8,-47,0.7,1,'white');ellipse(c,-7,-44,3,4,'#f4c29a');
    c.strokeStyle='#a96d52';c.lineWidth=1.2;c.beginPath();c.moveTo(4,-38);c.quadraticCurveTo(8,-35,12,-39);c.stroke();
    ellipse(c,-6,-29,1.4,1.4,'#ffe9a5');ellipse(c,8,-29,1.4,1.4,'#ffe9a5');
  }
  c.restore();
}
export class Renderer{
  constructor(canvas,worlds){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.worlds=worlds;this.camera=0;}
  draw(state,theme,preview=false){
    const c=this.c,p=state.player,pal=palette[theme],W=960,H=540,t=state.time;
    const target=preview?0:bound(p.x-270,0,state.level.width-W);this.camera+=(target-this.camera)*.18;
    if(Math.abs(this.camera-target)>700)this.camera=target;
    c.clearRect(0,0,W,H);c.fillStyle=pal.sky;c.fillRect(0,0,W,H);
    const sourceY=theme==='elsa'?this.worlds.height/2:0;
    const sourceWidth=this.worlds.width*.84,sourceX=(this.worlds.width-sourceWidth)*(this.camera/(state.level.width-W));
    c.drawImage(this.worlds,sourceX,sourceY,sourceWidth,this.worlds.height/2,0,0,W,H);
    c.fillStyle=theme==='elsa'?'#eee8ff12':'#fff8d212';c.fillRect(0,0,W,H);
    c.save();c.translate(-Math.round(this.camera),0);
    const visible=object=>object.x+object.w>=this.camera-80&&object.x<this.camera+W+80;
    for(const tile of state.level.solids)if(visible(tile)){
      if(tile.kind==='ground'){
        rounded(c,tile.x,tile.y,tile.w,tile.h,3,pal.ground);c.fillStyle=pal.edge;c.fillRect(tile.x,tile.y,tile.w,12);c.fillStyle=pal.lip;c.fillRect(tile.x,tile.y,tile.w,4);
        for(let x=Math.floor(Math.max(tile.x,this.camera)/48)*48;x<Math.min(tile.x+tile.w,this.camera+W);x+=48){c.fillStyle=pal.shadow;c.fillRect(x+12,tile.y+26,17,3);c.fillRect(x+29,tile.y+48,9,3);}
      }else if(tile.kind==='box'){
        rounded(c,tile.x,tile.y,48,48,8,tile.used?pal.brick:theme==='elsa'?'#e8aed1':'#efba52');rounded(c,tile.x+4,tile.y+4,40,36,5,tile.used?pal.brick:theme==='elsa'?'#f5d6e7':'#ffdb7f');
        if(!tile.used){c.fillStyle=theme==='elsa'?'#aa6c9a':'#a97b2e';c.font='bold 28px Trebuchet MS';c.textAlign='center';c.fillText('?',tile.x+24,tile.y+33);}else if(state.power>10.5)reward(c,tile.x+24,tile.y-20-Math.sin(t*3)*4,theme);
      }else{
        rounded(c,tile.x,tile.y,tile.w,tile.h,5,pal.brick);c.fillStyle=pal.platform;c.fillRect(tile.x+2,tile.y+2,tile.w-4,7);c.strokeStyle=pal.shadow;c.lineWidth=1;
        for(let x=tile.x+48;x<tile.x+tile.w;x+=48){c.beginPath();c.moveTo(x,tile.y+9);c.lineTo(x,tile.y+tile.h);c.stroke();}
      }
    }
    for(const checkpoint of state.level.checkpoints)if(checkpoint>this.camera-40&&checkpoint<this.camera+W+40){
      rounded(c,checkpoint,414,5,66,2,'#d5c49b');path(c,q=>{q.moveTo(checkpoint+5,415);q.lineTo(checkpoint+38,424);q.lineTo(checkpoint+5,439);q.closePath();},state.checkpoint>=checkpoint?pal.edge:'#fff7d5');star(c,checkpoint+17,425,5,'#fff8cd');
    }
    for(const item of state.level.items)if(!item.collected&&visible(item)){
      if(item.kind==='star'){c.shadowColor='#ffed9c';c.shadowBlur=14;star(c,item.x+14,item.y+14+Math.sin(t*2)*3,17);c.shadowBlur=0;}
      else collectible(c,item.x+14,item.y+14,theme,t);
    }
    for(const enemy of state.level.enemies)if(!enemy.dead&&visible(enemy)){
      const bounce=Math.sin(t*8+enemy.x)*1.5;
      ellipse(c,enemy.x+18,enemy.y+29,18,4,'#193d4122');
      ellipse(c,enemy.x+8,enemy.y+27,7,4,theme==='elsa'?'#a7bddd':'#5e7060');ellipse(c,enemy.x+28,enemy.y+27,7,4,theme==='elsa'?'#a7bddd':'#5e7060');
      ellipse(c,enemy.x+18,enemy.y+14+bounce,18,15,theme==='elsa'?'#f3f7ff':'#d69577');
      if(theme==='classic'){ellipse(c,enemy.x+18,enemy.y+6+bounce,12,7,'#ba745a');}
      ellipse(c,enemy.x+11,enemy.y+14+bounce,4,5,'white');ellipse(c,enemy.x+25,enemy.y+14+bounce,4,5,'white');ellipse(c,enemy.x+12,enemy.y+15+bounce,1.8,3,'#4e5c70');ellipse(c,enemy.x+24,enemy.y+15+bounce,1.8,3,'#4e5c70');
    }
    const gx=state.level.goal;
    if(gx<this.camera+W+80){
      rounded(c,gx-25,350,86,130,12,theme==='elsa'?'#d9e7fa':'#e4c79a');rounded(c,gx-8,407,49,73,23,theme==='elsa'?'#8c98d1':'#9f806b');
      for(const dx of [-40,50]){rounded(c,gx+dx,337,33,143,5,theme==='elsa'?'#bad6ec':'#ebd4b1');path(c,q=>{q.moveTo(gx+dx-7,338);q.lineTo(gx+dx+16,297);q.lineTo(gx+dx+40,338);q.closePath();},theme==='elsa'?'#9eaddf':'#c97c60');}
      star(c,gx+16,380,16);c.fillStyle='#ffffff80';c.fillRect(gx+13,426,5,41);
    }
    ellipse(c,p.x+p.w/2,p.y+p.h+2,22,5,'#173d3f25');
    if(state.power>0){c.strokeStyle=theme==='elsa'?'#f5c9ff':'#ffe791';c.lineWidth=3;c.beginPath();c.ellipse(p.x+p.w/2,p.y+25,34,42,0,0,Math.PI*2);c.stroke();for(let i=0;i<3;i++)star(c,p.x+16+Math.cos(t*3+i*2)*36,p.y+25+Math.sin(t*3+i*2)*40,5);}
    c.save();
    c.globalAlpha=p.invincible>0&&Math.floor(t*12)%2!==0&&!preview?.55:1;
    character(c,p.x+p.w/2,p.y+p.h,theme,t,Math.abs(p.vx)>30,!p.grounded,p.facing);
    c.restore();
    c.restore();
    if(theme==='elsa')for(let i=0;i<14;i++){const x=(i*149+t*10)%W,y=(i*97+t*12)%430;ellipse(c,x,y,1.6,1.6,'#ffffff99');}
  }
}
