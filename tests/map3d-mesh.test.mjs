import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import vm from 'node:vm';
import {buildLandscape,buildDetails,createHeightSampler} from '../web/map3d-mesh.js';
import {createMeshBuilder} from '../web/map3d-builder.js';
const dem=JSON.parse(await readFile('web/terrain/erhai-dem.json','utf8'));
const detail=JSON.parse(await readFile('web/terrain/erhai-details.json','utf8'));
const scope={window:{}};vm.createContext(scope);vm.runInContext(await readFile('web/map-data.js','utf8'),scope);
const lake=JSON.parse(JSON.stringify(scope.window.DALI_MAP.lake));
// Hashes were captured from the pre-optimization renderer on the same credited
// snapshot. Positions, normals, indices and shore texels remain unchanged.
// Only the colour snapshot was refreshed for the approved shanshui palette (2026-10-27).
const reference=JSON.parse(await readFile('tests/fixtures/map3d-mesh.json','utf8'));
const summary=data=>Object.fromEntries(Object.entries(data).map(([key,array])=>[key,{length:array.length,sha256:createHash('sha256').update(Buffer.from(array.buffer,array.byteOffset,array.byteLength)).digest('hex')}]));

test('optimized terrain and shallow water preserve the original full-resolution mesh',()=>{
  const result=buildLandscape(dem,lake,detail.islands);
  assert.deepEqual(summary(result.terrain),reference.terrain);
  assert.deepEqual(summary({data:result.shore.data}),reference.shore);
  assert.equal(result.terrain.position.length/3,401*449);
  assert.equal(result.islands.landcover.length,1);
});
test('batching preserves all surveyed roads, buildings and landcover triangles',()=>{
  const {heightAt}=createHeightSampler(dem,lake,detail.islands),result=buildDetails(detail,heightAt);
  assert.deepEqual(summary(result.roads),reference.roads);
  assert.deepEqual(summary(result.buildings),reference.buildings);
  for(const {kind,position,normal} of result.landcover)assert.deepEqual(summary({position,normal}),reference.landcover[kind]);
  assert.equal(result.landcover.length,Object.keys(reference.landcover).length);
});

const smallDem={bounds:[0,0,1,1],columns:2,rows:2,heights:[2000,2001,2002,2003],lakeLevel:1980};
const smallLake=[[.2,.2],[.8,.2],[.8,.8],[.2,.8]];
const empty={islands:[],landcover:[],roads:[],buildings:[]};
function workerFactory(){
  const url=new URL('../web/map3d-worker.js',import.meta.url).href;
  const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
  const adapter={postMessage:data=>worker.postMessage(data),terminate:()=>worker.terminate()};
  worker.on('message',data=>adapter.onmessage?.({data}));worker.on('error',error=>adapter.onerror?.(error));
  return adapter;
}
test('real worker transfers the same landscape and details as the compatibility builder',async()=>{
  const builder=createMeshBuilder({workerFactory});
  try{
    const landscape=await builder.landscape(smallDem,smallLake,[]);
    assert.deepEqual(landscape,buildLandscape(smallDem,smallLake,[]));
    assert.deepEqual(await builder.details(empty,[]),buildDetails(empty,()=>0));
    assert.ok(landscape.terrain.position.buffer.byteLength>0,'transferred data remains usable on the UI thread');
  }finally{builder.dispose();}
});
for(const failure of ['unsupported','load error','postMessage error','timeout'])test(`worker ${failure} falls back without losing the map`,async()=>{
  let terminated=0;
  const builder=createMeshBuilder({timeout:10,workerFactory(){
    if(failure==='unsupported')throw new Error('blocked');
    const worker={terminate(){terminated++;},postMessage(){
      if(failure==='postMessage error')throw new Error('clone failed');
      if(failure==='load error')queueMicrotask(()=>worker.onerror({preventDefault(){}}));
    }};return worker;
  }});
  try{
    assert.deepEqual(await builder.landscape(smallDem,smallLake,[]),buildLandscape(smallDem,smallLake,[]));
    assert.deepEqual(await builder.details(empty,[]),buildDetails(empty,()=>0));
    if(failure!=='unsupported')assert.equal(terminated,1);
  }finally{builder.dispose();}
});
test('disposing cancels pending geometry and prevents late fallback work',async()=>{
  let terminated=0;
  const builder=createMeshBuilder({workerFactory:()=>({postMessage(){},terminate(){terminated++;}})});
  const pending=builder.landscape(smallDem,smallLake,[]);builder.dispose();
  await assert.rejects(pending,/disposed/);assert.equal(terminated,1);
  await assert.rejects(builder.details(empty,[]),/disposed/);
});
