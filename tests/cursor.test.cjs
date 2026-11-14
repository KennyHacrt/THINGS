const test=require('node:test'),assert=require('node:assert/strict');const {LAYOUT,placement,ActionCursor}=require('../electron/cursor.cjs');
test('fingertip stays at the real target, including screen edges and negative monitor coordinates',()=>{for(const p of [{x:0,y:0},{x:400,y:300},{x:-200,y:40}]){const b=placement(p);assert.ok(Math.abs(b.x+LAYOUT.hotspotX-p.x)<=.5);assert.ok(Math.abs(b.y+LAYOUT.hotspotY-p.y)<=.5);}});
test('physical input coordinates convert once to DIP and remain anchored through typing',()=>{const updates=[];const cursor=new ActionCursor({toDip:p=>({x:p.x/1.25,y:p.y/1.25}),onChange:e=>updates.push(e)});cursor.accept({x:750,y:375,phase:'down'});assert.deepEqual(cursor.point,{x:600,y:300});assert.equal(cursor.phase,'down');cursor.accept({x:750,y:375,phase:'type'});assert.deepEqual(cursor.point,{x:600,y:300});assert.equal(cursor.phase,'type');cursor.release();assert.equal(cursor.point,null);assert.equal(updates.length,3);});

test('browser pointer is independent from the Windows mouse',async()=>{
 const {createBrowserPointer}=require('../electron/cursor.cjs');const cursor=new ActionCursor({toDip:p=>({x:p.x/1.25,y:p.y/1.25})});
 const pointer=createBrowserPointer({screen:{dipToScreenPoint:p=>({x:p.x*1.25,y:p.y*1.25})},cursor,wait:async()=>{}});
 await pointer({x:120,y:80,window:{getContentBounds:()=>({x:20,y:40})},phase:'down'});assert.deepEqual(cursor.point,{x:140,y:120});assert.equal(cursor.phase,'down');
 await pointer({x:200,y:100,window:{getContentBounds:()=>({x:20,y:40})},phase:'type'});assert.deepEqual(cursor.point,{x:220,y:140});assert.equal(cursor.phase,'type');
});
