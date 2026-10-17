import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {project,unproject,elevation,reliefHeight,inRing,lampPositions,tourCamera} from '../web/map3d-geo.js';
const dem=JSON.parse(await readFile('web/terrain/erhai-dem.json','utf8'));
const scope={window:{}};vm.createContext(scope);
for(const file of ['places','map-data'])vm.runInContext(await readFile(`web/${file}.js`,'utf8'),scope);
const ring=scope.window.DALI_MAP.lake;
test('3D projection keeps north up, east right and all geographic points reversible',()=>{
  for(const p of [...scope.window.DALI_PLACES,...scope.window.DALI_ENTRANCES]){
    const restored=unproject(project(p.coords));
    assert.ok(Math.abs(restored[0]-p.coords[0])<1e-9);assert.ok(Math.abs(restored[1]-p.coords[1])<1e-9);
  }
  assert.ok(project([100.2,25.8])[0]>project([100.1,25.8])[0]);
  assert.ok(project([100.2,25.9])[1]<project([100.2,25.8])[1]);
});
test('DEM covers every attraction, entrance and lake vertex without invalid elevations',()=>{
  assert.equal(dem.heights.length,dem.columns*dem.rows);
  assert.ok(dem.heights.every(h=>Number.isFinite(h)&&h>1000&&h<4500));
  for(const coords of [...ring,...scope.window.DALI_PLACES.map(p=>p.coords),...scope.window.DALI_ENTRANCES.map(p=>p.coords)]){
    assert.ok(coords[0]>=dem.bounds[0]&&coords[0]<=dem.bounds[2]);assert.ok(coords[1]>=dem.bounds[1]&&coords[1]<=dem.bounds[3]);
    assert.ok(Number.isFinite(elevation(dem,coords)));assert.ok(Number.isFinite(reliefHeight(dem,coords)));
  }
  assert.ok(elevation(dem,[100.09,25.69])>elevation(dem,[100.19,25.81])+1000,'Cangshan relief should rise above the lake');
});
test('bilinear terrain interpolation handles exact corners and outside-bound queries',()=>{
  const grid={bounds:[0,0,1,1],columns:2,rows:2,heights:[10,20,30,40]};
  assert.equal(elevation(grid,[.5,.5]),25);assert.equal(elevation(grid,[0,1]),10);assert.equal(elevation(grid,[1,0]),40);assert.equal(elevation(grid,[9,-9]),40);
});
test('night lamps are reproducible and every light is in Erhai',()=>{
  const points=lampPositions(ring,125);assert.equal(points.length,125);assert.deepEqual(points,lampPositions(ring,125));
  assert.ok(points.every(p=>inRing(p,ring)));
  assert.ok(!inRing([100.09,25.69],ring));assert.ok(inRing([100.19,25.81],ring));
});
test('3D imports are local and the preserved library license ships with the website',async()=>{
  for(const name of ['map3d.js','vendor/three/OrbitControls.js','vendor/three/three.module.js']){
    const s=await readFile('web/'+name,'utf8');
    assert.doesNotMatch(s,/from ['"]https?:/);
  }
  assert.match(await readFile('web/vendor/three/LICENSE','utf8'),/MIT License/);
});

test('map details preserve real islands and the corrected Xiaoputuo point',async()=>{
  const detail=JSON.parse(await readFile('web/terrain/erhai-details.json','utf8'));
  assert.equal(detail.license,'ODbL 1.0');
  assert.ok(detail.roads.length>1000&&detail.buildings.length>1000);
  for(const name of ['小普陀','南诏风情岛','玉几岛'])assert.ok(detail.islands.some(i=>i.name===name));
  const island=detail.islands.find(i=>i.name==='小普陀');
  assert.ok(inRing(scope.window.DALI_PLACES.find(p=>p.id==='xiaoputuo').coords,island.coords));
  for(const feature of [...detail.roads,...detail.buildings,...detail.islands]){
    assert.ok(feature.id&&feature.coords.length>1);
    assert.ok(feature.coords.flat().every(Number.isFinite));
  }
});
test('tour cameras keep the visible ground footprint inside the expanded DEM',async()=>{
  const {PerspectiveCamera,Vector3}=await import('../web/vendor/three/three.module.js');
  const places=scope.window.DALI_PLACES;
  for(const aspect of [.65,1.3,2.5])for(let i=0;i<places.length;i++)for(const t of [0,.13,.27,.5,1]){
    const pose=tourCamera(places[(i+1)%places.length].coords,places[i].coords,t,aspect);
    const ground=Math.max(.3,reliefHeight(dem,pose.at)+.3),target=new Vector3(pose.target[0],ground,pose.target[1]);
    const c=new PerspectiveCamera(39,aspect,.1,250);c.position.copy(target).add(new Vector3(...pose.offset));c.lookAt(target);c.updateMatrixWorld();
    for(const x of [-1,1])for(const y of [-1,1]){
      const ray=new Vector3(x,y,.5).unproject(c).sub(c.position).normalize();
      assert.ok(ray.y<0);
      const p=c.position.clone().addScaledVector(ray,-c.position.y/ray.y),coords=unproject([p.x,p.z]);
      assert.ok(coords[0]>dem.bounds[0]&&coords[0]<dem.bounds[2]&&coords[1]>dem.bounds[1]&&coords[1]<dem.bounds[3],`${places[i].id} aspect=${aspect} progress=${t}`);
    }
  }
});

test('Panxi S-bend is on the mapped ecological corridor, outside the lake',async()=>{
  const p=scope.window.DALI_PLACES.find(p=>p.id==='panxi');
  const sources=JSON.parse(await readFile('data/places.json','utf8'));
  const source=sources.places.find(p=>p.id==='panxi');
  assert.deepEqual(Array.from(p.coords),source.coords,'2D, 3D and source coordinates must agree');
  assert.equal(inRing(p.coords,ring),false,'S-bend must not be in the lake');
  const detail=JSON.parse(await readFile('web/terrain/erhai-details.json','utf8'));
  const corridor=detail.roads.find(road=>road.id==='1512251046');
  assert.ok(corridor,'path-class ecological corridor must be rendered');
  assert.equal(corridor.kind,'path');
  const [x,z]=project(p.coords);
  const distance=Math.min(...corridor.coords.map(c=>{const [a,b]=project(c);return Math.hypot(a-x,b-z);}));
  assert.ok(distance<.005,'representative stop must sit within 5m of a surveyed corridor vertex');
  assert.match(source.coordinateSource,/openstreetmap.org\/node\//);
});
test('all 18 exploration points match credited WGS84 features and valid land or island geometry',async()=>{
  const source=JSON.parse(await readFile('data/places.json','utf8'));
  const audit=JSON.parse(await readFile('data/place-coordinate-audit.json','utf8'));
  const detail=JSON.parse(await readFile('web/terrain/erhai-details.json','utf8'));
  const points=[...scope.window.DALI_PLACES,...scope.window.DALI_ENTRANCES];
  assert.equal(points.length,18);assert.equal(audit.records.length,18);assert.equal(audit.datum,'WGS84');
  for(const p of points){
    const record=audit.records.find(r=>r.id===p.id),raw=[...source.places,...source.entrances].find(r=>r.id===p.id);
    assert.ok(record?.source&&record.note,p.id);assert.equal(record.source,raw.coordinateSource);
    assert.deepEqual(Array.from(p.coords),raw.coords,p.id+' source/display divergence');
    if(record.kind==='node')assert.deepEqual(Array.from(p.coords),record.geometry[0],p.id+' differs from OSM point');
    else assert.ok(inRing(p.coords,record.geometry),p.id+' outside named feature');
    assert.ok(!inRing(p.coords,ring)||detail.islands.some(i=>inRing(p.coords,i.coords)),p.id+' unexpectedly in lake');
  }
});
