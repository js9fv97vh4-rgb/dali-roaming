import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function viewport(){
  const listeners={},buttons=['out','in','reset'].map(action=>({dataset:{provinceZoom:action},addEventListener(_,fn){this.click=fn;}}));
  let box,captured=false;const hostListeners={};
  const svg={createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};},getScreenCTM(){return {inverse(){return null;}};},setPointerCapture(){captured=true;},hasPointerCapture(){return captured;},releasePointerCapture(){captured=false;},setAttribute(_,value){box=value.split(' ').map(Number);},addEventListener(type,fn){listeners[type]=fn;}};
  const status={},hint={},media={matches:false,addEventListener(_,fn){this.change=fn;}};
  const host={querySelector:()=>svg,classList:{toggle(){}},addEventListener(type,fn){hostListeners[type]=fn;}};
  const scope={window:{},matchMedia:()=>media,document:{querySelectorAll:()=>buttons,getElementById:id=>id==='province-zoom-level'?status:hint},setTimeout};
  vm.createContext(scope);vm.runInContext(await readFile('web/province-viewport.js','utf8'),scope);scope.window.enableProvinceViewport(host);
  return {buttons,status,media,pointer(type,x=0,y=0){listeners[type]({pointerId:1,button:0,clientX:x,clientY:y});},click(detail=1){let stopped=false;hostListeners.click({detail,preventDefault(){stopped=true;},stopImmediatePropagation(){}});return stopped;},get box(){return box;},key(key){let prevented=false;listeners.keydown({key,preventDefault(){prevented=true;}});return prevented;}};
}

test('province zoom stays bounded and reset returns the complete regional map',async()=>{
  const v=await viewport(),initial=[...v.box];
  assert(v.buttons[0].disabled);
  for(let i=0;i<8;i++)v.buttons[1].click();
  assert.equal(v.status.value,'300%');assert(v.buttons[1].disabled);
  assert.equal(v.box[2],initial[2]/3);
  for(let i=0;i<50;i++)v.key('ArrowRight');
  assert.equal(v.box[0]+v.box[2],initial[0]+initial[2]);
  assert(v.key('Escape'));assert.deepEqual(v.box,initial);assert.equal(v.status.value,'100%');
  assert.equal(v.key('ArrowDown'),false,'normal page scrolling must work before zooming');
});

test('changing to a narrow screen resets a panned view to a complete mobile overview',async()=>{
  const v=await viewport();v.buttons[1].click();v.key('ArrowDown');
  v.media.matches=true;v.media.change();
  assert.equal(v.status.value,'100%');assert(v.buttons[0].disabled);
  const mobile=[...v.box];assert.equal(mobile[3],960);
  v.buttons[1].click();v.buttons[2].click();assert.deepEqual(v.box,mobile);
  v.media.matches=false;v.media.change();assert.deepEqual(v.box,[-112,0,940,665]);
});

// A delayed synthesized click after a pan must not activate a destination link.
test('panning suppresses only its pointer click and leaves keyboard and the next tap usable',async()=>{
 const v=await viewport();v.buttons[1].click();
 v.pointer('pointerdown',100,100);v.pointer('pointermove',140,110);v.pointer('pointerup',140,110);
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(v.click(0),false,'keyboard links remain usable after panning');
 assert.equal(v.click(1),true,'the delayed drag click is consumed');
 v.pointer('pointerdown',140,110);v.pointer('pointerup',140,110);assert.equal(v.click(1),false,'next intentional tap is not swallowed');
 v.pointer('pointerdown',100,100);v.pointer('pointermove',150,120);v.pointer('pointercancel',150,120);assert.equal(v.click(1),false,'cancelled gestures leave no stale suppression');
});
