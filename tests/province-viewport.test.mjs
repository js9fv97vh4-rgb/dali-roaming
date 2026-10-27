import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function viewport(){
  const listeners={},buttons=['out','in','reset'].map(action=>({dataset:{provinceZoom:action},addEventListener(_,fn){this.click=fn;}}));
  let box;
  const svg={setAttribute(_,value){box=value.split(' ').map(Number);},addEventListener(type,fn){listeners[type]=fn;}};
  const status={},hint={},media={matches:false,addEventListener(_,fn){this.change=fn;}};
  const host={querySelector:()=>svg,classList:{toggle(){}},addEventListener(){}};
  const scope={window:{},matchMedia:()=>media,document:{querySelectorAll:()=>buttons,getElementById:id=>id==='province-zoom-level'?status:hint},setTimeout};
  vm.createContext(scope);vm.runInContext(await readFile('web/province-viewport.js','utf8'),scope);scope.window.enableProvinceViewport(host);
  return {buttons,status,media,get box(){return box;},key(key){let prevented=false;listeners.keydown({key,preventDefault(){prevented=true;}});return prevented;}};
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
  const mobile=[...v.box];assert(mobile[2]<1020);
  v.buttons[1].click();v.buttons[2].click();assert.deepEqual(v.box,mobile);
  v.media.matches=false;v.media.change();assert.deepEqual(v.box,[20,0,680,660]);
});
