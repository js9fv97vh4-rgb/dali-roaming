import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {inRing} from '../web/map3d-geo.js';

const expected = ['530100','530300','530400','530500','530600','530700','530800','530900','532300','532500','532600','532800','532900','533100','533300','533400'];
test('the Yunnan atlas includes all 16 prefectures, with eight cities and eight autonomous prefectures',async()=>{
  const scope={window:{}};vm.createContext(scope);
  vm.runInContext(await readFile('web/prefecture-data.js','utf8'),scope);
  const regions=scope.window.DALI_PREFECTURES.regions;
  assert.deepEqual(Array.from(regions,r=>r.code).sort(),expected);
  assert.equal(regions.filter(r=>r.kind==='地级市').length,8);
  assert.equal(regions.filter(r=>r.kind==='自治州').length,8);
  assert.equal(new Set(regions.map(r=>r.id)).size,16);
  assert.equal(regions.find(r=>r.id==='dali').name,'大理白族自治州');
  assert.equal(regions.find(r=>r.id==='diqing').name,'迪庆藏族自治州');
});

test('prefecture labels and the Dali entry resolve inside their credited source geometry',async()=>{
  const data=JSON.parse(await readFile('data/yunnan-prefectures.geojson','utf8'));
  assert.equal(data.metadata.license,'ODbL-1.0');
  assert.equal(data.metadata.boundaryYear,2017);
  for(const feature of data.features){
    assert.equal(feature.geometry.type,'Polygon');
    for(const ring of feature.geometry.coordinates){
      assert.ok(ring.length>3);
      assert.deepEqual(ring[0],ring.at(-1));
      assert.ok(ring.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>97&&x<107&&y>21&&y<30));
    }
    assert.ok(inRing(feature.properties.labelCoordinate,feature.geometry.coordinates[0]),feature.properties.name+' label outside region');
  }
  const scope={window:{}};vm.createContext(scope);
  vm.runInContext(await readFile('web/map-data.js','utf8'),scope);
  const [x,y]=scope.window.DALI_MAP.star;
  const coordinates=[97.513252+(x-65)/67.9198844671,29.223772-(y-65.3)/67.9198844671];
  assert.ok(inRing(coordinates,data.features.find(f=>f.properties.id==='dali').geometry.coordinates[0]));
});
