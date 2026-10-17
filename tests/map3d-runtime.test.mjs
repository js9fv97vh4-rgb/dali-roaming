import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadAtlasJSON,atlasPixelRatio,createAtlasRenderer} from '../web/map3d-runtime.js';

test('transient terrain failure retries with a fresh response',async()=>{
  const calls=[];
  const value=await loadAtlasJSON('terrain.json',{fetcher:async(url,options)=>{
    calls.push(options.cache);if(calls.length===1)throw new TypeError('Failed to fetch');
    return {ok:true,json:async()=>({columns:401})};
  }});
  assert.equal(value.columns,401);assert.deepEqual(calls,['default','reload']);
});
test('invalid cached JSON is retried and permanent HTTP failures stay bounded',async()=>{
  let calls=0;
  assert.equal(await loadAtlasJSON('terrain.json',{fetcher:async()=>({ok:true,json:async()=>{if(!calls++)throw new SyntaxError('bad cached response');return 'valid';}})}),'valid');
  calls=0;
  await assert.rejects(loadAtlasJSON('terrain.json',{fetcher:async()=>{calls++;return {ok:false,status:503};}}),/503/);
  assert.equal(calls,2);
});
test('a stalled data request aborts before retrying',async()=>{
  let calls=0;
  await assert.rejects(loadAtlasJSON('terrain.json',{timeout:5,fetcher:async(url,{signal})=>{
    calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}));
  }}),/timeout/);
  assert.equal(calls,2);
});
test('Retina rendering stays inside the pixel budget without removing map geometry',()=>{
  for(const [width,height,ratio] of [[1440,720,2],[3840,2160,2],[390,500,3],[1280,720,1]]){
    const result=atlasPixelRatio(width,height,ratio);
    assert.ok(width*height*result*result<=2400000.01);assert.ok(result<=2&&result<=ratio&&result>0);
  }
  assert.equal(atlasPixelRatio(1280,720,1),1);
});
test('a failed antialiased renderer retries without multisampling',()=>{
  const attempts=[];
  class Renderer {constructor(options){attempts.push(options);if(options.antialias)throw new Error('context creation failed');this.ready=true;}}
  assert.equal(createAtlasRenderer(Renderer).ready,true);
  assert.deepEqual(attempts.map(a=>a.antialias),[true,false]);
  assert.ok(attempts.every(a=>a.powerPreference==='default'));
});


test('indexed coastline preserves containment while skipping distant geometry work',async()=>{
  const {indexAtlasRing}=await import('../web/map3d-runtime.js');
  const {inRing}=await import('../web/map3d-geo.js');
  const ring=[[0,0],[2,0],[2,2],[1,1],[0,2]];
  const indexed=indexAtlasRing(ring);
  assert.equal(indexed([99,99]),false);
  for(const point of [[1,1],[-1,1],[2,1],[0,0],[3,3]])assert.equal(indexed(point),inRing(point,ring));
});

test('first-frame island data exactly preserves the full credited island snapshot',async()=>{
  const {readFile}=await import('node:fs/promises');
  const full=JSON.parse(await readFile('web/terrain/erhai-details.json','utf8'));
  const coast=JSON.parse(await readFile('web/terrain/erhai-islands.json','utf8'));
  assert.deepEqual(coast.islands,full.islands);assert.equal(coast.license,full.license);assert.equal(coast.source,full.source);
  assert.ok((await readFile('web/terrain/erhai-islands.json')).length<10000);
});


test('latitude buckets preserve every sampled lake and island containment result',async()=>{
  const {readFile}=await import('node:fs/promises');
  const vm=await import('node:vm');
  const {indexAtlasRing}=await import('../web/map3d-runtime.js');
  const {inRing}=await import('../web/map3d-geo.js');
  const context={window:{}};vm.createContext(context);vm.runInContext(await readFile('web/map-data.js','utf8'),context);
  const detail=JSON.parse(await readFile('web/terrain/erhai-islands.json','utf8'));
  for(const ring of [context.window.DALI_MAP.lake,...detail.islands.map(i=>i.coords)]){
    const indexed=indexAtlasRing(ring),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
    const points=[...ring];
    for(let i=0;i<=20;i++)for(let j=0;j<=20;j++)points.push([west+(east-west)*i/20,south+(north-south)*j/20]);
    for(const point of points)assert.equal(indexed(point),inRing(point,ring));
  }
});
