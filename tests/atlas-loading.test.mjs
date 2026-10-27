import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadAtlasJSON,atlasFrameInterval,atlasTerrainIndices} from '../web/map3d-runtime.js';

const source=await readFile('web/atlas-loading.js','utf8');
function loader(){
  let time=0,hide;const elements=new Map(),storage=new Map();
  const node=()=>{const classes=new Set(),listeners={};return {hidden:false,parentElement:null,classes,listeners,textContent:'',value:0,classList:{add(...v){v.forEach(c=>classes.add(c));},remove(...v){v.forEach(c=>classes.delete(c));}},append(child){child.parentElement=this;},addEventListener(type,fn){listeners[type]=fn;},removeAttribute(name){delete this[name];},querySelector(){return null;}};};
  const home=node(),root=node();home.append(root);
  for(const key of ['progress','[data-load-stage]','[data-load-percent]','[data-load-eta]','[data-load-retry]','[data-load-flat]'])elements.set(key,node());
  root.querySelector=key=>elements.get(key);
  const documents=new Map([['atlas-loading',root]]);
  const scope={window:{},performance:{now:()=>time},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>documents.get(id)},location:{reload(){}},setInterval(){return 1;},clearInterval(){},setTimeout(fn){hide=fn;return 1;},clearTimeout(){hide=null;}};
  vm.runInNewContext(source,scope);
  return {api:scope.window.createAtlasLoading(),root,home,elements,scope,documents,node,advance(ms){time+=ms;},finish(){hide?.();}};
}

test('loading keeps its screenshot visible and never reports 100% before a real ready signal',()=>{
  const c=loader();c.api.start();
  c.advance(1000);c.api.update({stage:'terrain',loaded:50,total:100});
  assert.equal(c.root.hidden,false);assert.ok(c.elements.get('progress').value>30);
  c.api.update({stage:'frame',ratio:1});assert.ok(c.elements.get('progress').value<100);
  assert.match(c.elements.get('[data-load-eta]').textContent,/估算/);
  c.api.ready();assert.equal(c.elements.get('progress').value,100);
  assert.equal(c.root.hidden,false);c.finish();assert.equal(c.root.hidden,true);
});

test('failure retains the screenshot, recovery and changing map hosts preserve the loading controls',()=>{
  const c=loader();c.api.start();c.api.fail();
  assert.equal(c.root.hidden,false);assert.equal(c.elements.get('[data-load-retry]').hidden,false);
  assert.match(c.elements.get('[data-load-eta]').textContent,/重试/);
  const host=c.node(),dialog={id:'panorama-dialog',open:true,querySelector:()=>host};c.documents.set('panorama-dialog',dialog);
  c.api.place();assert.equal(c.root.parentElement,host);
  c.api.recover(host);assert.match(c.elements.get('[data-load-stage]').textContent,/恢复/);
  dialog.open=false;c.api.place();assert.equal(c.root.parentElement,c.home);
  c.elements.get('[data-load-flat]').listeners.click();assert.equal(c.root.hidden,true);
  c.api.start(1);assert.equal(c.root.hidden,false);
});

test('remaining time is withheld when unmeasurable or well beyond the historical estimate',()=>{
  const scope={window:{}};vm.runInNewContext(source,scope);const estimate=scope.window.atlasLoadEstimate;
  assert.equal(estimate(100,.02,0),null);assert.equal(estimate(30000,.5,10000),null);
  assert.deepEqual(Array.from(estimate(1000,.5,0)),[1,2]);
  assert.deepEqual(Array.from(estimate(1000,1,0)),[0,0]);
});

test('terrain progress counts actual streamed bytes and preserves split UTF-8 characters',async()=>{
  const bytes=new TextEncoder().encode(JSON.stringify({name:'洱海',height:1980})),progress=[];
  const body=new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=2)controller.enqueue(bytes.slice(i,i+2));controller.close();}});
  const value=await loadAtlasJSON('terrain.json',{fetcher:async()=>new Response(body,{headers:{'content-length':String(bytes.length)}}),onProgress:p=>progress.push(p)});
  assert.equal(value.name,'洱海');assert.equal(progress.at(-1).loaded,bytes.length);assert.equal(progress.at(-1).done,true);
  assert.ok(progress.every((p,i)=>p.total===bytes.length&&(!i||p.loaded>=progress[i-1].loaded)));
});

test('quiet water draws less often while tours and active camera gestures keep their cadence',()=>{
  assert.ok(atlasFrameInterval('explore',false)>atlasFrameInterval('explore',true));
  assert.equal(atlasFrameInterval('tour',false),32);assert.equal(atlasFrameInterval('panorama',true),32);
  assert.ok(atlasFrameInterval('night',false)<atlasFrameInterval('explore',false));
});

test('far-view terrain uses a quarter of the faces while retaining every outer corner',()=>{
  for(const [columns,rows] of [[401,449],[4,6],[2,2]]){
    const indices=atlasTerrainIndices(columns,rows),seen=new Set(indices);
    assert.ok(indices.every(i=>i>=0&&i<columns*rows));
    for(const corner of [0,columns-1,(rows-1)*columns,rows*columns-1])assert.ok(seen.has(corner));
    assert.equal(indices.length,Math.ceil((columns-1)/2)*Math.ceil((rows-1)/2)*6);
  }
  assert.equal(atlasTerrainIndices(401,449).length,(401-1)*(449-1)*6/4);
});
