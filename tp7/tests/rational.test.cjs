const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('ejercicio.js', 'utf8'), ctx);
const points = [{x:10,y:20,w:1},{x:80,y:180,w:4},{x:210,y:-60,w:0.3},{x:320,y:90,w:2}];
function close(a,b,tol=1e-7) { assert.ok(Math.abs(a-b) <= tol, `${a} != ${b}`); }
function pointClose(a,b,tol) { close(a.x,b.x,tol); close(a.y,b.y,tol); }
function bernstein(p,t) {
 const u=1-t, b=[u*u*u,3*u*u*t,3*u*t*t,t*t*t];
 const d=b.reduce((s,v,i)=>s+v*p[i].w,0);
 return Object.fromEntries(['x','y'].map(k=>[k,b.reduce((s,v,i)=>s+v*p[i].w*p[i][k],0)/d]));
}
for (const t of [0,0.1,0.35,0.5,0.8,1]) {
 const c=ctx.deCasteljau(...points,t).point;
 pointClose(c,bernstein(points,t));
 pointClose(c,ctx.deCasteljau(...points.map(p=>({...p,w:p.w*7})),t).point);
 const equal=points.map(p=>({...p,w:1}));
 pointClose(ctx.deCasteljau(...equal,t).point,bernstein(equal,t));
 const h=1e-4, before=bernstein(points,t-h), after=bernstein(points,t+h);
 const d1=ctx.bezierTangent(...points,t), d2=ctx.bezierSecondDerivative(...points,t);
 for (const k of ['x','y']) {
  close(d1[k],(after[k]-before[k])/(2*h),0.005);
  close(d2[k],(after[k]-2*c[k]+before[k])/(h*h),0.1);
 }
}
pointClose(ctx.deCasteljau(...points,0).point,points[0]);
pointClose(ctx.deCasteljau(...points,1).point,points[3]);
// A degree-elevated rational quadratic traces an exact unit quarter-circle.
const q=Math.SQRT1_2, w=(1+2*q)/3;
const arc=[{x:1,y:0,w:1},{x:1,y:2*q/(1+2*q),w},{x:2*q/(1+2*q),y:1,w},{x:0,y:1,w:1}];
for (const t of [0,0.2,0.5,0.9,1]) {
 const p=ctx.deCasteljau(...arc,t).point, cur=ctx.bezierCurvature(...arc,t);
 close(p.x*p.x+p.y*p.y,1);
 close(cur.r,1); pointClose(cur.center,{x:0,y:0});
}
for (const side of ['in','out']) {
 const a={x:100,y:70,inx:30,iny:90,outx:170,outy:10,w:2,inw:0.3,outw:4};
 ctx.enforceContinuity(a,side,'C1');
 pointClose({x:a.inw*(a.x-a.inx),y:a.inw*(a.y-a.iny)},
            {x:a.outw*(a.outx-a.x),y:a.outw*(a.outy-a.y)});
}
console.log('PASS: rational evaluation, equal/scaled weights, endpoints, derivatives, exact circle curvature, weighted C1');
