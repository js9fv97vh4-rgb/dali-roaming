import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../web/vendor/three/three.core.js';
import {entranceParts,createEntranceModels} from '../web/entrance-models.js';

test('three distinct arrival models preserve their geographic anchors in at most four draw batches',async()=>{
  const scope={window:{}};vm.createContext(scope);vm.runInContext(await readFile('web/places.js','utf8'),scope);
  const entrances=scope.window.DALI_ENTRANCES;
  const models=createEntranceModels(entrances,coords=>new THREE.Vector3(coords[0],2,coords[1]));
  assert.ok(models.children.length<=4);let triangles=0;
  for(const mesh of models.children){
    assert.ok(mesh.isInstancedMesh);assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
    triangles+=mesh.geometry.index.count/3*mesh.count;
  }
  assert.ok(triangles<1500);
  for(const entry of entrances)assert.deepEqual(models.userData[entry.id].coords,Array.from(entry.coords));
  for(const [id,required] of [['airport',['terminal','tower','aircraft-wing','runway-mark']],['railway',['station-hall','platform-canopy','train-body','rail']],['highway',['toll-booth','toll-canopy','barrier','car-body']]]){
    const parts=entranceParts(id);assert.ok(parts.length>10);
    for(const name of required)assert.ok(parts.some(p=>p.feature===name),id+': '+name);
    assert.ok(parts.every(p=>p.size.every(n=>n>0&&Number.isFinite(n))));
  }
  models.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
