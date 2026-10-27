import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const scope={URLSearchParams};scope.window=scope;vm.createContext(scope);
for(const file of ['lijiang-data','view-routes'])vm.runInContext(await readFile(`web/${file}.js`,'utf8'),scope);
const {places}=scope.LIJIANG_DATA,{parse,format,parent}=scope.DaliViews;

test('Lijiang contains the approved ten places, split into towns, mountains and lakes',async()=>{
 assert.deepEqual(Array.from(places,p=>p.id),['dayan','shuhe','baisha','yulong','blue-moon','yunshanping','maoniuping','lashihai','lugu','chenghai']);
 assert.deepEqual(['town','snow','lake'].map(g=>places.filter(p=>p.group===g).length),[3,4,3]);
 const [w,s,e,n]=[100,26.36,101.03,27.83];
 for(const p of places){assert(p.coords[0]>=w&&p.coords[0]<=e&&p.coords[1]>=s&&p.coords[1]<=n);assert.equal(p.chapters.length,p.galleryOrder.length);assert(p.chapters.every(c=>c.title&&c.text&&p.photos[c.photo]));assert(p.photos.length);assert(p.coordinateSource.startsWith('https://www.openstreetmap.org/'));}
 assert.equal(places.find(p=>p.id==='maoniuping').coordinateSource,'https://www.openstreetmap.org/way/460851160');
 assert.equal(places.find(p=>p.id==='lugu').area,'lugu');assert.equal(places.find(p=>p.id==='chenghai').area,'chenghai');
 const lakes=JSON.parse(await readFile('web/terrain/lijiang-lakes.json','utf8'));
 assert.equal(lakes.license,'ODbL-1.0');assert.equal(lakes.features.length,3);
 for(const lake of lakes.features)for(const ring of [...lake.rings,...lake.holes]){assert(ring.length>3);assert.deepEqual(ring[0],ring.at(-1));}
 assert(lakes.features.find(f=>f.name==='泸沽湖').holes.length>0);
});

test('Lijiang photos and direct routes round-trip without entering Dali scene state',()=>{
 for(const p of places){const v=parse(format({page:'lijiang',spot:p.id,frame:p.photos.length-1}));assert.equal(v.spot,p.id);assert.equal(v.frame,p.photos.length-1);assert.equal(v.modal,'lijiang-photo');assert.equal(format(parent(v)),'#lijiang?spot='+p.id);assert.equal(v.photo,undefined);assert.equal(v.scene,undefined);}
 assert.equal(parse('#lijiang?spot=unknown&frame=0').frame,undefined);
 assert.equal(parse('#lijiang?spot=lugu&frame=-1').frame,undefined);
 assert.equal(parse('#lijiang?spot=lugu&frame=999').frame,places.find(p=>p.id==='lugu').photos.length-1);
 assert.equal(parse('#lijiang?scene=ancient-town&view=night&photo=0').scene,undefined);
 assert.equal(parse('#erhai?spot=dayan&frame=1').frame,undefined);
 assert.equal(parse('#erhai?scene=ancient-town&photo=2').photo,2);
 assert.equal(parse('#lijiang?view=credits').modal,'credits');
});

test('all Lijiang assets have location-specific credits and distributable files are present',async()=>{
 const manifest=JSON.parse(await readFile('asset-sources.json','utf8'));
 const declarations=new Map([...manifest.photos,...manifest.remoteReferences].map(p=>[p.src,p]));
 const used=new Set();
 for(const place of places)for(const photo of place.photos){
  assert(photo.caption&&photo.author&&photo.date&&photo.source);if(photo.ownerProvided){assert.equal(photo.source,photo.src);assert.equal(photo.redistributed,false);assert.equal(photo.licenseUrl,null);assert.match(photo.license,/摄影者保留版权/);}else assert.match(photo.source,/^https:\/\//);assert(declarations.has(photo.src),photo.src);
  if(photo.remote){assert.equal(photo.redistributed,false);assert.equal(photo.licenseUrl,null);assert.match(photo.src,/^https:\/\//);}
  else {if(!photo.ownerProvided){assert.match(photo.license,/^CC BY-SA (2\.0|3\.0|4\.0)$/);assert(photo.licenseUrl);}assert(photo.width>0&&photo.height>0);for(const src of [photo.src,photo.thumb]){await access('web/'+src);used.add(src.split('/').at(-1));}}
 }
 for(const file of await readdir('web/assets/lijiang'))assert(used.has(file),'uncredited/rejected asset '+file);
 await access(manifest.map.lijiang.water);
 assert.equal(manifest.map.lijiang.license,'ODbL-1.0');
});

// Shared links must reopen the night walk and close back to Shuhe, not Dali.
test('Shuhe night chapters clamp safely and return to their destination',()=>{
 for(const [input,expected] of [['0',0],['4',4],['999',4],['-5',0],['2.8',2],['oops',0]]){
  const view=parse('#lijiang?view=shuhe-night&step='+input);
  assert.equal(view.modal,'lijiang-walk');assert.equal(view.spot,'shuhe');assert.equal(view.step,expected);
  assert.equal(parse(format(view)).step,expected);assert.equal(format(parent(view)),'#lijiang?spot=shuhe');
 }
 assert.equal(parse('#erhai?view=shuhe-night').modal,undefined);
});

// Curating a gallery must never change the stable frame indices used by shared links.
test('curated galleries preserve original frames and contain no repeated selections',()=>{
 assert.equal(places.reduce((n,p)=>n+p.photos.length,0),46);
 assert.equal(places.reduce((n,p)=>n+p.galleryOrder.length,0),31);
 for(const p of places){
  assert.equal(new Set(p.galleryOrder).size,p.galleryOrder.length,p.id);
  assert(p.galleryOrder.every(i=>Number.isInteger(i)&&p.photos[i]),p.id);
  assert.equal(p.cover,p.galleryOrder[0]);
  assert(p.chapters.every(c=>p.galleryOrder.includes(c.photo)));
  assert(places.some(next=>next.id===p.next.id&&next.id!==p.id));
  for(let frame=0;frame<p.photos.length;frame++)assert.equal(parse(format({page:'lijiang',spot:p.id,frame})).frame,frame);
 }
 const shuhe=places.find(p=>p.id==='shuhe');
 assert.equal(shuhe.photos.filter(p=>p.ownerProvided).length,5);
});
