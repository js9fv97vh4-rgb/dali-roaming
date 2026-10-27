/* Symbolic arrival landmarks, deliberately enlarged for the exploration map. */
import * as THREE from './vendor/three/three.core.js';

export const ENTRANCE_MODEL_SCALE=.5;

export function entranceParts(id){
  const parts=[];
  const box=(feature,color,x,y,z,w,h,d,tilt=0)=>parts.push({feature,color,position:[x,y,z],size:[w,h,d],tilt});
  if(id==='airport'){
    box('apron','ink',0,.015,0,2.45,.03,3.6);
    box('terminal','ivory',.62,.26,.12,1.2,.5,.58);
    box('terminal-roof','clay',.62,.54,.12,1.38,.10,.76);
    box('terminal-glass','glass',.62,.28,-.185,1.02,.22,.025);
    box('tower','ivory',.96,.68,-.98,.16,1.33,.16);
    box('tower-cabin','glass',.96,1.36,-.98,.39,.27,.39);
    box('tower-roof','clay',.96,1.53,-.98,.46,.07,.46);
    for(let i=0;i<7;i++)box('runway-mark','ivory',-.65,.04,-1.35+i*.44,.035,.025,.20);
    box('aircraft-body','ivory',-.65,.13,.38,.13,.13,.88);
    box('aircraft-wing','ivory',-.65,.14,.32,.81,.045,.17);
    box('aircraft-tail','clay',-.65,.20,.76,.035,.25,.18);
    box('aircraft-stabilizer','ivory',-.65,.16,.70,.32,.035,.12);
    for(let i=0;i<3;i++)box('jetbridge','ivory',.02,.17,-.08+i*.22,.30,.12,.065);
  }else if(id==='railway'){
    box('station-plaza','clay',0,.015,0,2.7,.03,2.7);
    box('station-hall','ivory',0,.31,.65,2.05,.6,.7);
    box('station-glass','glass',0,.29,1.01,1.67,.35,.025);
    box('station-roof-left','ink',-.59,.68,.65,1.27,.10,.94,-.13);
    box('station-roof-right','ink',.59,.68,.65,1.27,.10,.94,.13);
    for(const x of [-.81,0,.81]){
      box('platform-canopy','ivory',x,.44,-.60,.53,.08,1.65);
      for(const z of [-1.15,-.05])box('platform-column','glass',x,.22,z,.055,.43,.055);
      for(const rail of [-.18,.18])box('rail','ink',x+rail,.045,-.60,.025,.03,1.7);
    }
    box('train-body','ivory',0,.17,-.60,.25,.23,1.26);
    box('train-roof','ink',0,.30,-.60,.27,.035,1.3);
    for(let i=0;i<5;i++)box('train-window','glass',.13,.20,-1.08+i*.23,.02,.09,.12);
  }else if(id==='highway'){
    box('road','ink',0,.015,0,2.35,.03,1.72);
    box('toll-canopy','ivory',0,.64,0,2.22,.15,.67);
    box('toll-roof','clay',0,.75,0,2.35,.07,.76);
    for(const x of [-.82,0,.82]){
      box('toll-booth','glass',x,.23,.05,.19,.43,.26);
      box('toll-column','ivory',x,.37,-.2,.075,.72,.075);
      box('barrier','clay',x+.23,.27,.37,.35,.045,.045);
    }
    for(const x of [-.41,.41])for(let i=0;i<3;i++)box('lane-mark','ivory',x,.04,-.62+i*.55,.025,.02,.27);
    box('car-body','clay',.45,.12,-.50,.23,.18,.43);
    box('car-windows','glass',.45,.23,-.48,.19,.08,.23);
  }
  return parts;
}

export function createEntranceModels(entrances,heightAt){
  const group=new THREE.Group();group.name='arrival-landmarks';
  const palette={ivory:'#f1eddd',ink:'#4d626b',glass:'#78a6ac',clay:'#c59263'},batches=new Map();
  for(const entry of entrances){
    const parts=entranceParts(entry.id),at=heightAt(entry.coords),yaw=entry.id==='airport'?.35:entry.id==='railway'?-.22:.15;
    group.userData[entry.id]={coords:[...entry.coords],features:[...new Set(parts.map(p=>p.feature))]};
    for(const part of parts){if(!batches.has(part.color))batches.set(part.color,[]);batches.get(part.color).push({...part,at,yaw});}
  }
  const dummy=new THREE.Object3D(),local=new THREE.Quaternion(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),tiltAxis=new THREE.Vector3(0,0,1);
  for(const [color,parts] of batches){
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:palette[color],roughness:.83}),parts.length);
    mesh.name='arrival-'+color;
    parts.forEach((part,index)=>{
      rotation.setFromAxisAngle(axis,part.yaw);local.setFromAxisAngle(tiltAxis,part.tilt);
      dummy.position.set(...part.position).multiplyScalar(ENTRANCE_MODEL_SCALE).applyQuaternion(rotation).add(part.at);dummy.quaternion.copy(rotation).multiply(local);dummy.scale.set(...part.size).multiplyScalar(ENTRANCE_MODEL_SCALE);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
    });
    mesh.computeBoundingSphere();group.add(mesh);
  }
  return group;
}
