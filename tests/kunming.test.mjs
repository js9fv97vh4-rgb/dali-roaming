import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const scope={URLSearchParams};scope.window=scope;vm.createContext(scope);
for(const file of ['kunming-data','lijiang-data','view-routes'])vm.runInContext(await readFile(`web/${file}.js`,'utf8'),scope);
const {places}=scope.KUNMING_DATA,{parse,format,parent}=scope.DaliViews;

test('Kunming city scenes and every retained photo have stable independent direct links',()=>{
 assert.deepEqual(Array.from(places,p=>p.id),['jacaranda','old-street','tea-coffee','cuihu','dianchi','dounan']);
 for(const place of places){
  assert(place.story&&place.note&&place.reference.startsWith('https://'));
  assert.equal(new Set(place.photos.map(p=>p.frame)).size,place.photos.length);
  place.photos.forEach((photo,frame)=>{
   const url=format({page:'kunming',spot:place.id,frame}),view=parse(url);
   assert.equal(view.page,'kunming');assert.equal(view.spot,place.id);assert.equal(view.frame,frame);assert.equal(view.modal,'kunming-photo');assert.equal(view.scene,undefined);assert.equal(view.photo,undefined);
   assert.equal(format(parent(view)),'#kunming?spot='+place.id);
  });
 }
 assert.equal(parse('#kunming?spot=wrong&frame=0').spot,undefined);
 assert.equal(parse('#kunming?spot=cuihu&frame=999').imageUpdated,true);
 assert.equal(parse('#kunming?spot=cuihu&frame=-1').frame,undefined);
 assert.equal(parse('#kunming?scene=longkan&view=night').modal,undefined);
 assert.equal(parse('#kunming?view=credits').modal,'credits');
 assert.equal(format({page:'kunming',modal:'credits'}),'#kunming?view=credits');
 assert.equal(parse('#erhai?spot=cuihu&frame=0').page,'erhai');
 assert.equal(parse('#lijiang?spot=shuhe').page,'lijiang');
});

test('Kunming prioritizes real images and preserves source, capture date and licensing distinctions',async()=>{
 const manifest=JSON.parse(await readFile('asset-sources.json','utf8'));
 const declared=new Map([...manifest.photos,...manifest.remoteReferences].map(p=>[p.src,p]));
 const used=new Set();
 for(const place of places)for(const photo of place.photos){
  assert(['ai','photo'].includes(photo.mediaType));assert(!used.has(photo.src),'duplicate '+photo.src);used.add(photo.src);
  assert(photo.author&&photo.source&&photo.caption&&photo.width>0&&photo.height>0);
  assert(declared.has(photo.src),photo.src);
  if(photo.mediaType==='ai'){
   assert(!photo.shotDate && photo.generatedAt && photo.generator && photo.references.length);
   for(const key of ['src','thumb','preview'])await access('web/'+photo[key]);
  }else if(photo.remote){assert.equal(photo.redistributed,false);assert.equal(photo.licenseUrl,null);assert.equal(photo.shotDate,undefined);assert.match(photo.date,/报道，拍摄日期未注明/);}
  else {assert.match(photo.shotDate,/^\d{4}-\d{2}-\d{2}$/);assert.match(photo.license,/^CC/);assert(photo.licenseUrl);for(const key of ['src','thumb','preview'])await access('web/'+photo[key]);}
 }
 assert(places.find(p=>p.id==='jacaranda').photos.every(p=>p.shotDate==='2026-04-25'));
 assert.match(places.find(p=>p.id==='dianchi').note,/冬春/);
 assert.equal(places.find(p=>p.id==='tea-coffee').pin,undefined,'a lifestyle theme must not impersonate a single shop pin');
});


test('retired photo links return to their own place and transport panels round-trip',()=>{
 for(const place of places)for(const id of [0,1]){
  const v=parse('#kunming?spot='+place.id+'&frame='+id);
  assert.equal(v.spot,place.id);assert.equal(v.imageUpdated,true);assert.equal(v.frame,undefined);
 }
 for(const hash of ['#kunming?panel=shopping','#kunming?panel=arrival&hub=south','#kunming?panel=arrival&hub=airport']){
  assert.equal(format(parse(hash)),hash);
 }
 assert.equal(parse('#kunming?panel=arrival&hub=unknown').hub,undefined);
});
