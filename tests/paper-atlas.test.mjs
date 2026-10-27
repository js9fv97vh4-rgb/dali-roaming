import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Run the real destination controller against small DOM shells, with no canvas API.
async function atlas({failWater=false,mobile=false}={}){
 const nodes=new Map(),events=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',hidden:true,parentElement:null,
  addEventListener(){},setAttribute(){},focus(){this.focused=true;scope.document.activeElement=this;},
  querySelector:selector=>node(id+' '+selector),showModal(){this.open=true;},scrollIntoView(){this.scrolled=true;},
  append(child){child.parentElement=this;}});return nodes.get(id);};
 const water=JSON.parse(await readFile('web/terrain/lijiang-lakes.json','utf8'));
 const requests=[],store=new Map();
 const scope={URLSearchParams,AbortSignal,setTimeout,clearTimeout,console,
  location:{hash:'#lijiang'},history:{state:null,pushState(state,_,hash){this.state=state;scope.location.hash=hash;},replaceState(state,_,hash){this.pushState(state,_,hash);}},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
  matchMedia:()=>({matches:mobile,addEventListener(){}}),
  fetch:async url=>{requests.push(url);if(failWater)throw Error('Offline');return{ok:true,json:async()=>water};},
  HashChangeEvent:class {constructor(type){this.type=type;}},
  document:{body:{dataset:{page:'lijiang'},classList:{add(){}}},getElementById:node,querySelector:node,querySelectorAll:()=>[],
   addEventListener:(type,fn)=>events.set('document:'+type,fn)},
  scrollTo(){},addEventListener:(type,fn)=>events.set(type,fn),
  dispatchEvent:event=>events.get(event.type==='hashchange'?'destinationchange':event.type)?.()
 };
 scope.window=scope;vm.createContext(scope);
 for(const name of ['lijiang-data','view-routes','paper-map','lijiang'])vm.runInContext(await readFile(`web/${name}.js`,'utf8'),scope);
 // Flush both the fetch and JSON await boundaries.
 await new Promise(resolve=>setTimeout(resolve,0));
 return {node,scope,requests,click(dataset){events.get('document:click')({target:{closest:()=>({dataset,closest:()=>null})}});}};
}

test('paper atlas renders eight core spots and two separate lake insets without a renderer',async()=>{
 const {node,requests}=await atlas();
 assert.deepEqual(requests,['terrain/lijiang-lakes.json']);
 for(const [id,count] of [['core',8],['lugu',1],['chenghai',1]]){
  const svg=node('lj-paper-'+id).innerHTML;
  assert.equal((svg.match(/data-lj-spot=/g)||[]).length,count);
  assert.match(svg,/class="paper-lake"/);assert.match(svg,/fill-rule="evenodd"/);
  assert.doesNotMatch(svg,/NaN|Infinity|<canvas/);
 }
});

test('missing lake geometry leaves map selection, close and return-to-map usable',async()=>{
 const {node,scope,click}=await atlas({failWater:true,mobile:true});
 assert.match(node('lj-paper-note').textContent,/湖岸轮廓暂未加载/);
 assert.equal((node('lj-paper-core').innerHTML.match(/data-lj-spot=/g)||[]).length,8);
 click({ljSpot:'lugu'});assert.equal(scope.location.hash,'#lijiang?spot=lugu');
 assert.equal(node('lj-map-pick').hidden,false);assert.equal(node('lj-map-pick').parentElement.id,'lj-panel-lugu');
 click({ljDismiss:''});assert.equal(node('lj-map-pick').hidden,true);
 click({ljBackMap:''});assert.equal(node('lj-map-pick').hidden,false);assert(node('.paper-spot[data-lj-spot="lugu"]').scrolled);
});

test('desktop selections stay beside their own map and do not scroll automatically',async()=>{
 const {node,click}=await atlas();
 click({ljSpot:'chenghai'});
 assert.equal(node('lj-map-pick').parentElement.id,'lj-panel-chenghai');
 assert.equal(node('lj-map-pick').scrolled,undefined);
 assert.equal(node('lj-panel-chenghai').scrolled,undefined);
 click({ljDismiss:''});assert.equal(node('lj-map-pick').hidden,true);
 click({ljSpot:'shuhe'});
 assert.equal(node('lj-map-pick').parentElement.id,'lj-panel-core');
 assert.equal(node('lj-map-pick').hidden,false);
});

test('photo replacement retains keyboard focus for consecutive arrow navigation',async()=>{
 const {node,scope,click}=await atlas();
 click({ljSpot:'dayan'});click({ljFrame:'1'});
 assert.equal(node('lj-photo-dialog').open,true);
 assert.match(node('lj-photo-content').innerHTML,/原链接照片/);
 scope.document.activeElement={dataset:{ljPhotoStep:'1'}};
 click({ljPhotoStep:'1'});
 assert.equal(scope.location.hash,'#lijiang?spot=dayan&frame=2');
 assert.equal(scope.document.activeElement,node('lj-photo-dialog [data-lj-photo-step="1"]'));
 click({ljPhotoStep:'1'});
 assert.equal(scope.location.hash,'#lijiang?spot=dayan&frame=3');
 assert.notEqual(scope.document.activeElement,scope.document.body);
 click({ljPhotoStep:'-1'});
 assert.equal(scope.location.hash,'#lijiang?spot=dayan&frame=2');
});
