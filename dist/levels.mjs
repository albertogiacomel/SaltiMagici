export const TILE=48, GROUND=480;
const layouts=[
  {length:112,gaps:[[24,26],[55,57],[82,84]],platforms:[[11,7,4],[33,7,4],[42,6,3],[64,7,4],[90,7,3]],boxes:[7,19,37,49,69,77,94],enemies:[17,35,45,65,74,91],stars:[[13,6],[43,5],[91,6]],checkpoints:[30,62]},
  {length:126,gaps:[[20,23],[47,50],[75,78],[103,106]],platforms:[[9,7,3],[28,7,3],[35,5,3],[57,7,4],[65,5,3],[86,7,4],[94,5,3]],boxes:[6,16,31,42,54,71,82,99,109],enemies:[14,30,41,60,69,88,99,113],stars:[[36,4],[66,4],[95,4]],checkpoints:[26,80]},
  {length:140,gaps:[[19,22],[43,46],[69,72],[97,100],[117,120]],platforms:[[8,7,4],[27,7,4],[34,5,3],[52,7,3],[59,5,3],[78,7,4],[86,5,3],[105,7,4],[123,7,3]],boxes:[6,15,30,39,50,64,76,91,103,113,122],enemies:[13,29,39,54,64,81,92,108,114,127],stars:[[35,4],[60,4],[87,4]],checkpoints:[25,74,102]}
];
export function makeLevel(index){
  const layout=layouts[index];if(!layout)throw new Error('Unknown level');
  const solids=[],items=[],boxes=[],enemies=[];
  const ground=(from,to)=>solids.push({x:from*TILE,y:GROUND,w:(to-from)*TILE,h:96,kind:'ground'});
  let from=0;for(const [left,right]of layout.gaps){ground(from,left);from=right;}ground(from,layout.length);
  for(const [x,y,w]of layout.platforms)solids.push({x:x*TILE,y:y*TILE,w:w*TILE,h:24,kind:'platform'});
  for(const [i,x]of layout.boxes.entries()){
    const box={id:`b${i}`,x:x*TILE,y:GROUND-136,w:TILE,h:TILE,kind:'box',used:false};
    boxes.push(box);solids.push(box);
  }
  // A staircase makes the final approach readable, like a classic platformer.
  for(let i=0;i<4;i++)solids.push({x:(layout.length-14+i)*TILE,y:GROUND-(i+1)*TILE,w:TILE,h:(i+1)*TILE,kind:'brick'});
  let itemId=0;
  const add=(x,y,kind='coin')=>items.push({id:`i${itemId++}`,x,y,w:28,h:28,kind,collected:false});
  for(let tile=5;tile<layout.length-14;tile+=3){
    if(!layout.gaps.some(([a,b])=>tile>=a-1&&tile<=b))add(tile*TILE+10,GROUND-44);
  }
  for(const [x,y,w]of layout.platforms)for(let i=0;i<w;i++)add((x+i)*TILE+10,y*TILE-44);
  for(const [x,y]of layout.stars)add(x*TILE+8,y*TILE-4,'star');
  for(const [i,tile]of layout.enemies.entries())enemies.push({id:`e${i}`,x:tile*TILE,y:GROUND-30,w:36,h:30,vx:-(34+index*9),left:(tile-1)*TILE,right:(tile+1)*TILE,dead:false});
  return {index,width:layout.length*TILE,solids,items,boxes,enemies,checkpoints:layout.checkpoints.map(x=>x*TILE),gaps:layout.gaps,goal:(layout.length-4)*TILE};
}
