import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const scope={window:{},URLSearchParams};vm.createContext(scope);
for(const name of ['places','gallery-data','roaming-data','view-routes'])vm.runInContext(await readFile(`web/${name}.js`,'utf8'),scope);
const {DaliViews,sampleDaliTour}=scope;
test('shared scene and nested photo URLs survive parsing and close one layer at a time',()=>{
  for(const view of [
    {page:'erhai',scene:'zhoucheng',photo:2},
    {page:'erhai',modal:'night',photo:3},
    {page:'erhai',modal:'walk',chapter:2,photo:4},
    {page:'erhai',modal:'tour',tour:'shore',step:4},
    {page:'yunnan',modal:'credits'}
  ]){
    const parsed=DaliViews.parse(DaliViews.format(view));
    for(const [key,value] of Object.entries(view))assert.equal(parsed[key],value);
  }
  const photo=DaliViews.parse('#erhai?scene=zhoucheng&photo=2');
  const scene=DaliViews.parent(photo);assert.equal(scene.scene,'zhoucheng');assert.equal(scene.photo,undefined);
  assert.equal(DaliViews.format(DaliViews.parent(scene)),'#erhai');
  assert.equal(DaliViews.parse('#erhai?scene=unknown&photo=2').scene,undefined);
  assert.equal(DaliViews.parse('#erhai?scene=xizhou&photo=-2').photo,undefined);
});
test('tour seek and completion resolve valid stations at every boundary',()=>{
  const stops=scope.window.DALI_TOURS[0].stops;
  for(const [position,index,progress,ended] of [[-10,0,0,false],[0,0,0,false],[.5,0,.5,false],[1,1,0,false],[4.9,4,.9,false],[5,4,1,true],[99,4,1,true]]){
    const sample=sampleDaliTour(stops,position);
    assert.equal(sample.index,index);assert.ok(Math.abs(sample.progress-progress)<1e-9);assert.equal(sample.ended,ended);assert.ok(sample.stop);
  }
});
test('curated routes resolve real credited photos and all places have planning ranges',async()=>{
  const places=scope.window.DALI_PLACES,gallery=scope.window.DALI_GALLERIES;
  for(const p of places){const visit=scope.window.DALI_VISITS[p.id];assert.ok(visit.minutes[0]>0&&visit.minutes[1]>=visit.minutes[0]&&visit.mode);}
  for(const route of scope.window.DALI_TOURS){
    await access('web/'+route.cover);assert.ok(route.stops.length>=3);
    for(const stop of route.stops){assert.ok(places.find(p=>p.id===stop.id));const photo=gallery[stop.id][stop.photo];assert.ok(photo?.src&&photo.author&&photo.source);if(!photo.remote)await access('web/'+photo.src);}
  }
});

test('photo beats are distinct, bounded, and resolve the curated new images',()=>{
  const sample=scope.sampleDaliTourPhoto;
  for(const route of scope.window.DALI_TOURS)for(const stop of route.stops){
    const photos=scope.window.DALI_GALLERIES[stop.id],sequence=stop.photos;
    if(sequence)assert.ok(sequence.every(i=>photos[i]),stop.id);
    const count=sequence?.length||Math.min(4,photos.length),seen=new Set();
    for(let i=0;i<count;i++)seen.add(sample(photos,stop.photo,(i+.1)/count,sequence).index);
    assert.equal(seen.size,count);
    assert.ok(photos[sample(photos,stop.photo,1,sequence).index]);
  }
  const stop=scope.window.DALI_TOURS[0].stops.find(s=>s.id==='xizhou');
  const photos=scope.window.DALI_GALLERIES.xizhou;
  assert.match(photos[sample(photos,stop.photo,.3,stop.photos).index].src,/harvest/);
});

// Exercise the real controller with a deterministic frame clock and minimal DOM.
async function roamingController(){
  const elements=new Map(),listeners=new Map(),frames=new Map();let frameId=0,time=1000,poses=0;
  const node=()=>({style:{},dataset:{},attributes:{},textContent:'',value:0,hidden:false,
    setAttribute(name,value){this.attributes[name]=value;},animate(){}});
  const element=selector=>{if(!elements.has(selector))elements.set(selector,node());return elements.get(selector);};
  const dialog={open:false,querySelector:element,querySelectorAll:()=>[],showModal(){this.open=true;},addEventListener(type,fn){listeners.set(type,fn);}};
  const context={window:{DALI_PLACES:scope.window.DALI_PLACES,DALI_TOURS:scope.window.DALI_TOURS},
    sampleDaliTour:scope.sampleDaliTour,sampleDaliTourPhoto:scope.sampleDaliTourPhoto,
    document:{hidden:false,getElementById:()=>dialog,body:{classList:{add(){}}},addEventListener(){}},
    matchMedia:()=>({matches:false,addEventListener(){}}),
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    Image:class {set src(value){this.onload?.();}}
  };
  vm.createContext(context);vm.runInContext(await readFile('web/roaming.js','utf8'),context);
  const controller=context.window.createDaliRoaming({gallery:id=>scope.window.DALI_GALLERIES[id],credit:p=>p.caption,
    getMap:()=>({mount(){},setAtmosphere(){},tourPose(){poses++;}}),onPosition(){},isStop:()=>false,getStops:()=>[]});
  controller.open('shore');
  return {element,
    click(attribute,value=''){
      const button={hasAttribute:name=>name===attribute,dataset:attribute==='data-tour-step'?{tourStep:value}:{}};
      listeners.get('click')({target:{closest:()=>button}});
    },
    seek(value){listeners.get('input')({target:{matches:()=>true,value}});},
    get poses(){return poses;},
    advance(count=1,delta=150){for(let i=0;i<count;i++){time+=delta;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}},
    isPlaying:()=>element('[data-tour-play]').attributes['aria-label']==='暂停漫游'
  };
}

test('manual photo browsing keeps the tour moving and yields to the next station',async()=>{
  const tour=await roamingController();tour.advance(2);
  const before=Number(tour.element('input').value);
  tour.click('data-photo-next');
  const chosen=tour.element('#tour-photo').src;
  assert.equal(tour.isPlaying(),true);
  assert.equal(tour.element('[data-photo-auto]').hidden,false);
  tour.advance(35);
  assert.ok(Number(tour.element('input').value)>before);
  assert.equal(tour.element('#tour-photo').src,chosen,'automatic beats must not override the selected photo');
  tour.advance(80);
  assert.equal(tour.element('#tour-place').textContent,'才村');
  assert.equal(tour.element('[data-photo-auto]').hidden,true);
  assert.notEqual(tour.element('#tour-photo').src,chosen);
  tour.click('data-photo-prev');tour.click('data-photo-auto');
  assert.equal(tour.element('[data-photo-auto]').hidden,true);
  assert.equal(tour.isPlaying(),true);
});

test('photo controls and seeking preserve an explicit pause or active playback',async()=>{
  const tour=await roamingController();
  tour.click('data-tour-step','2');assert.equal(tour.isPlaying(),true);
  tour.seek(1.5);assert.equal(tour.isPlaying(),true);
  tour.click('data-tour-play');assert.equal(tour.isPlaying(),false);
  tour.click('data-photo-next');tour.advance(10);
  assert.equal(Number(tour.element('input').value),1.5);
  tour.click('data-photo-prev');tour.click('data-photo-auto');
  tour.seek(3.5);tour.click('data-tour-step','1');
  assert.equal(tour.isPlaying(),false);
  tour.click('data-tour-play');tour.advance(3);
  assert.equal(tour.isPlaying(),true);assert.ok(Number(tour.element('input').value)>1.27);
});


test('high-refresh displays keep tour time accurate without redundant camera updates',async()=>{
  const tour=await roamingController();tour.advance(1,8);
  const before=Number(tour.element('input').value),poses=tour.poses;
  tour.advance(120,8);
  const elapsed=(Number(tour.element('input').value)-before)*15;
  assert.ok(elapsed>=.93&&elapsed<=.97,'display throttling must not slow the timeline');
  assert.ok(tour.poses-poses<=31&&tour.poses-poses>=29,'125 Hz input produces about 30 camera updates per second');
  tour.click('data-tour-play');const paused=tour.element('input').value;
  tour.click('data-photo-next');tour.advance(120,8);assert.equal(tour.element('input').value,paused);
});
