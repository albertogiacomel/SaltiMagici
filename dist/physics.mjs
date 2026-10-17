/* Helpers adapted from Javascript Tiny-Platformer by Jake Gordon (MIT).
 * Source and complete license: ../vendor, and /LICENSE.txt in distribution. */
export function bound(x, min, max) { return Math.max(min, Math.min(max, x)); }
export function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return !(((x1 + w1 - 1) < x2) || ((x2 + w2 - 1) < x1) ||
    ((y1 + h1 - 1) < y2) || ((y2 + h2 - 1) < y1));
}
export const touches = (a, b) => overlap(a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h);
// Separate axes, fixed simulation step and velocity bounds prevent tunnelling.
export function move(body, solids, dt, onHead = () => {}) {
  body.x += body.vx * dt;
  for (const tile of solids) if (touches(body,tile)) {
    if(body.vx>0) body.x=tile.x-body.w;
    else if(body.vx<0) body.x=tile.x+tile.w;
    body.vx=0;
  }
  body.y += body.vy * dt;
  body.grounded=false;
  for (const tile of solids) if (touches(body,tile)) {
    if(body.vy>0){body.y=tile.y-body.h;body.grounded=true;}
    else if(body.vy<0){body.y=tile.y+tile.h;onHead(tile);}
    body.vy=0;
  }
}
