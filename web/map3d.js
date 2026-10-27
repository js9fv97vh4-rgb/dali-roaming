import * as THREE from './vendor/three/three.module.js';
import { createMeshBuilder } from './map3d-builder.js';
import { loadAtlasJSON, atlasViewPixelRatio, atlasNeedsAnimation, atlasFrameInterval, atlasTerrainIndices, createAtlasRenderer, indexAtlasRing } from './map3d-runtime.js?v=20261024-loading';
import { createEntranceModels, ENTRANCE_MODEL_SCALE } from './entrance-models.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { project, elevation, reliefHeight, lampPositions, tourCamera } from './map3d-geo.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vector = (coords, y = 0) => { const [x,z] = project(coords); return new THREE.Vector3(x,y,z); };
const icon = { airport:'✈', railway:'▤', highway:'↗' };
const presets = {
  overview: { position:[33,47,53], target:[0,0,0] },
  cangshan: { position:[13,23,24], target:[-9,1,0] },
  lake: { position:[9,66,17], target:[3,0,-1] },
  town: { position:[7,16,22], target:[-2,0,9] },
  night: { position:[27,38,45], target:[3,0,-1] }
};
let terrainPromise;
const terrainURL=new URL('./terrain/erhai-dem.json',import.meta.url);
function loadTerrain(onProgress){
  if(!terrainPromise)terrainPromise=loadAtlasJSON(terrainURL,{onProgress}).catch(error=>{terrainPromise=null;throw error;});
  return terrainPromise;
}

export async function createAtlas(host, config) {
  config.onProgress?.({stage:'terrain',ratio:0});
  const [dem,coast] = await Promise.all([loadTerrain(event=>config.onProgress?.({stage:'terrain',...event,ratio:event.done?1:undefined})),loadAtlasJSON(new URL('./terrain/erhai-islands.json',import.meta.url),{attempts:1,timeout:8000}).catch(()=>({islands:[]}))]);
  let detail={...coast,roads:[],buildings:[],landcover:[]};
  config.onProgress?.({stage:'mesh',ratio:0});
  const builder=createMeshBuilder();
  let landscape;
  try{landscape=await builder.landscape(dem,config.geometry.lake,coast.islands);}catch(error){builder.dispose();throw error;}
  config.onProgress?.({stage:'mesh',ratio:.7});
  const renderer = (()=>{try{return createAtlasRenderer(THREE.WebGLRenderer);}catch(error){builder.dispose();throw error;}})();
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e3eae3');
  scene.fog = new THREE.Fog('#e3eae3', 75, 175);
  const camera = new THREE.PerspectiveCamera(39,1,.1,250);
  const root = document.createElement('div');
  root.className = 'atlas3d'; root.dataset.mode = 'explore'; root.dataset.ready = 'loading';
  root.innerHTML = `<div class="atlas-heading"><span>CANGSHAN · ERHAI</span><h2>山海，近在眼前。</h2><p>转动视角，沿着湖岸走进大理</p></div>
    <div class="atlas-stage"></div><svg class="atlas-connectors" aria-hidden="true"></svg><div class="atlas-labels"></div>
    <div class="atlas-tools" role="group" aria-label="立体地图控制">
    <button data-camera="zoom-in" aria-label="放大立体地图">＋</button><button data-camera="zoom-out" aria-label="缩小立体地图">−</button>
    <button data-camera="left" aria-label="向左旋转地图">↶</button><button data-camera="right" aria-label="向右旋转地图">↷</button>
    <button data-camera="reset" aria-label="重置立体地图">⌂</button></div>
    <div class="atlas-views" role="group" aria-label="地图视角"><button data-view="overview" aria-pressed="true">山海全景</button><button data-view="cangshan" aria-pressed="false">走近苍山</button><button data-view="town" aria-pressed="false">古城山麓</button><button data-view="lake" aria-pressed="false">俯瞰洱海</button></div>
    <div class="atlas-compass" aria-hidden="true"><span>N</span><i>↑</i></div>
    <p class="atlas-gesture">拖动旋转 · 双指缩放<span> · Ctrl + 滚轮缩放</span></p>
    <div class="atlas-selection" hidden></div><div class="atlas-time" role="group" aria-label="山海时段"><button data-time="day" aria-pressed="true">日光</button><button data-time="dusk" aria-pressed="false">暮色</button><button data-time="night" aria-pressed="false">灯火</button></div><div class="atlas-town" hidden><span>大理古城 · 走近一点</span><strong>城门、街巷与一盏灯</strong><p>跟着实景，慢慢走过三段风景。</p><div><button data-town-chapter="0">01 南门</button><button data-town-chapter="1">02 人民路</button><button data-town-chapter="2">03 五华楼</button></div></div><a class="atlas-data-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap · 地形 USGS</a><div class="atlas-status" role="status" aria-live="polite"></div>`;
  root.querySelector('.atlas-stage').append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','苍山洱海立体地图，方向键旋转，加减键缩放，Home 返回全景；景点可通过地图按钮或景点列表选择');
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.075; controls.enablePan=true;
  controls.minDistance=12; controls.maxDistance=115; controls.minPolarAngle=.12; controls.maxPolarAngle=1.25;
  controls.rotateSpeed=.55; controls.zoomSpeed=.65; controls.panSpeed=.65;
  controls.screenSpacePanning=false;
  const sky = new THREE.HemisphereLight('#e5f1ff','#2c6362',1.65); scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff0d5',2.25); sun.position.set(-35,30,18); scene.add(sun);
  const world = new THREE.Group(); scene.add(world);
  let mode='explore', state={}, motion=true, atmosphere='day', visible=true, disposed=false, transition=null, animationId=0, lastFrame=0, clock=0, dirty=true,firstFrame=false,lastInteraction=0;
  let tourPlaceId=null, lastTourPose=null;
  let mainView=null, currentPreset='overview', width=1, height=1;
  const lakeRing=config.geometry.lake;
  const inLake=indexAtlasRing(lakeRing);
  let islandTests=detail.islands.map(i=>indexAtlasRing(i.coords));
  const isIsland=coords=>islandTests.some(test=>test(coords));
  const isWater=coords=>inLake(coords)&&!isIsland(coords);
  const heightAt=coords=>isIsland(coords)?Math.max(.20,reliefHeight(dem,coords)):inLake(coords)?.08:reliefHeight(dem,coords);
  const worldPoint=(coords,offset=0)=>vector(coords,heightAt(coords)+offset);
  const [west,south,east,north]=dem.bounds;
  const unpackGeometry=data=>{
    const geo=new THREE.BufferGeometry();
    for(const key of ['position','normal','color'])if(data[key])geo.setAttribute(key,new THREE.BufferAttribute(data[key],3));
    if(data.index)geo.setIndex(new THREE.BufferAttribute(data.index,1));return geo;
  };
  const terrainGeometry=unpackGeometry(landscape.terrain),positions=terrainGeometry.attributes.position;
  const noise=(x,z)=>Math.sin(x*.73+Math.sin(z*.49))*Math.cos(z*.58+x*.15);
  const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0});
  // Static pigment grain and soft elevation washes, in the existing draw pass.
  // World-space coordinates keep the painted texture attached while orbiting.
  terrainMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vPigmentPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPigmentPosition=position;');
    shader.fragmentShader='varying vec3 vPigmentPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float pigment=sin(vPigmentPosition.x*39.0+sin(vPigmentPosition.z*21.0))*sin(vPigmentPosition.z*43.0);
      float wash=sin(vPigmentPosition.y*9.0+sin(vPigmentPosition.x*1.4+vPigmentPosition.z*.8)*.25);
      diffuseColor.rgb*=.985+pigment*.018+wash*.024;
    `);
  };
  terrainMaterial.customProgramCacheKey=()=> 'shanshui-pigment-v1';
  const farGeometry=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(terrainGeometry.attributes))farGeometry.setAttribute(name,attribute);
  farGeometry.setIndex(new THREE.BufferAttribute(atlasTerrainIndices(dem.columns,dem.rows),1));
  const terrain=new THREE.LOD();terrain.addLevel(new THREE.Mesh(terrainGeometry,terrainMaterial),0);terrain.addLevel(new THREE.Mesh(farGeometry,terrainMaterial),55,.18);world.add(terrain);
  const edge=[];
  for(let x=0;x<dem.columns;x++)edge.push(x);
  for(let y=1;y<dem.rows;y++)edge.push(y*dem.columns+dem.columns-1);
  for(let x=dem.columns-2;x>=0;x--)edge.push((dem.rows-1)*dem.columns+x);
  for(let y=dem.rows-2;y>0;y--)edge.push(y*dem.columns);
  const skirtVertices=[];
  for(let k=0;k<edge.length;k++){
    const a=edge[k],b=edge[(k+1)%edge.length],x=positions.getX(a),z=positions.getZ(a),u=positions.getX(b),v=positions.getZ(b),y=positions.getY(a),h=positions.getY(b);
    skirtVertices.push(x,y,z,x,-3.5,z,u,h,v,u,h,v,x,-3.5,z,u,-3.5,v);
  }
  const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirtVertices,3));skirtGeometry.computeVertexNormals();
  const skirtMaterial=new THREE.MeshStandardMaterial({color:'#789f95',roughness:1,side:THREE.DoubleSide});
  world.add(new THREE.Mesh(skirtGeometry,skirtMaterial));
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshBasicMaterial({color:'#e3eae3'}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-3.55;scene.add(shadow);

  const lakeShape=new THREE.Shape(lakeRing.map(coords=>{const [x,z]=project(coords);return new THREE.Vector2(x,-z);}));
  const lakeGeometry=new THREE.ShapeGeometry(lakeShape);lakeGeometry.rotateX(-Math.PI/2);
  const {data:shoreData,size:shoreSize,bounds:waterBounds}=landscape.shore;
  const shoreTexture=new THREE.DataTexture(shoreData,...shoreSize,THREE.RedFormat);shoreTexture.minFilter=shoreTexture.magFilter=THREE.LinearFilter;shoreTexture.needsUpdate=true;
  const waterMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uNight:{value:0},uDusk:{value:0},uShore:{value:shoreTexture},uBounds:{value:new THREE.Vector4(...waterBounds)}},side:THREE.DoubleSide,
    vertexShader:`uniform float uTime; varying vec3 vWorld; void main(){vec3 p=position;p.y+=.08+sin(p.x*.9+p.z*.6+uTime*.45)*.018;vWorld=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uTime;uniform float uNight;uniform float uDusk;uniform sampler2D uShore;uniform vec4 uBounds;varying vec3 vWorld;
    void main(){vec2 uv=(vWorld.xz-uBounds.xy)/uBounds.zw;float depth=texture2D(uShore,uv).r;
    float ripple=sin(vWorld.x*14.+vWorld.z*8.+sin(vWorld.z*.9+uTime*.3)+uTime*.8)*sin(vWorld.z*21.-uTime*.56);
    float broad=sin(vWorld.x*.21+vWorld.z*.17+uTime*.045)*.5+.5;
    vec3 deep=mix(vec3(.08,.38,.46),vec3(.18,.55,.58),broad);vec3 day=mix(vec3(.53,.73,.65),deep,smoothstep(0.,.75,depth));
    vec3 dusk=mix(vec3(.31,.43,.43),vec3(.14,.28,.34),depth);vec3 night=mix(vec3(.035,.16,.20),vec3(.025,.085,.14),depth);
    vec3 colour=mix(mix(day,dusk,uDusk),night,uNight);
    float beam=exp(-pow((vWorld.x-3.+sin(vWorld.z*.35)*.8)/2.8,2.));
    float shimmer=smoothstep(.65,1.,ripple)*(.015+.055*beam);
    colour+=shimmer*mix(vec3(.7,.87,.86),vec3(1.,.63,.32),uDusk)*(1.-uNight*.7);
    colour+=uDusk*(1.-uNight)*beam*vec3(.13,.07,.015);
    gl_FragColor=vec4(colour,1.);}`});
  world.add(new THREE.Mesh(lakeGeometry,waterMaterial));
  const shoreGeometry=new THREE.BufferGeometry().setFromPoints(lakeRing.map(coords=>vector(coords,.12)));
  const shore=new THREE.LineLoop(shoreGeometry,new THREE.LineBasicMaterial({color:'#d6d7ad',transparent:true,opacity:.43}));world.add(shore);

  // Architectural miniatures are a visual guide, not surveyed building footprints.
  const buildings=new THREE.Group();world.add(buildings);
  const walls=new THREE.MeshStandardMaterial({color:'#f0ead6',roughness:1});
  const roofs=new THREE.MeshStandardMaterial({color:'#315a64',roughness:1});
  const dummy=new THREE.Object3D();
  // All three pagodas share two instanced meshes instead of 54 draw calls.
  const towerPlace=config.places.find(p=>p.id==='santasi'),towerBase=worldPoint(towerPlace.coords);
  const sections=new THREE.InstancedMesh(new THREE.CylinderGeometry(.8,1,1,4),walls,27);
  const cornices=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),roofs,27);let towerIndex=0;
  for(const [dx,dz,scale] of [[0,0,1],[-.4,.25,.65],[.4,.25,.65]])for(let level=0;level<9;level++){
    const radius=.13*(1-level*.065);
    dummy.position.copy(towerBase).add(new THREE.Vector3(dx,(.08+level*.12)*scale,dz));dummy.rotation.set(0,Math.PI/4,0);dummy.scale.set(radius*scale,.11*scale,radius*scale);dummy.updateMatrix();sections.setMatrixAt(towerIndex,dummy.matrix);
    dummy.position.y=towerBase.y+(.13+level*.12)*scale;dummy.rotation.y=0;dummy.scale.set(radius*2.2*scale,.025*scale,radius*2.2*scale);dummy.updateMatrix();cornices.setMatrixAt(towerIndex++,dummy.matrix);
  }
  buildings.add(sections,cornices);
  // Four shared instance batches represent all three arrival entrances.
  const arrivals=createEntranceModels(config.entrances,coords=>worldPoint(coords,.10));world.add(arrivals);
  function addDetails(meshes){
    for(const data of meshes.landcover)world.add(new THREE.Mesh(unpackGeometry(data),new THREE.MeshStandardMaterial({color:({farmland:'#c1c79e',orchard:'#81ab8b',forest:'#306f67',meadow:'#a2bea0',island:'#649b89'})[data.kind],roughness:1,side:THREE.DoubleSide})));
    if(meshes.roads.position.length)world.add(new THREE.LineSegments(unpackGeometry(meshes.roads),new THREE.LineBasicMaterial({color:'#eee1b5',transparent:true,opacity:.75})));
    if(meshes.buildings.position.length)buildings.add(new THREE.Mesh(unpackGeometry(meshes.buildings),new THREE.MeshStandardMaterial({color:'#e2dbc8',roughness:.95})));
  }
  // Small islands must be visible from the first frame as well as on close tours.
  addDetails(landscape.islands);
  landscape=null;

  const trees=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.085,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),900);
  let treeCount=0;
  for(let i=0;i<6500&&treeCount<900;i++){
    const coords=[west+((i*0.61803398875)%1)*(east-west),south+((i*.41421356237)%1)*(north-south)];
    const alt=elevation(dem,coords);const [tx,tz]=project(coords);if(alt<2170||alt>3450||noise(tx,tz)<-.22||isWater(coords))continue;
    dummy.position.copy(worldPoint(coords,.15));dummy.rotation.set(0,i,0);const size=.65+(i%11)*.065;dummy.scale.set(size,size*(1.2+(i%3)*.25),size);dummy.updateMatrix();trees.setMatrixAt(treeCount,dummy.matrix);trees.setColorAt(treeCount,new THREE.Color(['#235d59','#306f66','#508e7d','#215963'][i%4]));treeCount++;
  }trees.count=treeCount;world.add(trees);

  const labels=root.querySelector('.atlas-labels'), markers=[], connectors=root.querySelector('.atlas-connectors');
  const pinGeometry=new THREE.SphereGeometry(.12,8,6), pinMaterial=new THREE.MeshBasicMaterial({color:'#f5fbef'});
  const markerCount=config.places.length+config.entrances.length,pinBatch=new THREE.InstancedMesh(pinGeometry,pinMaterial,markerCount),pinDummy=new THREE.Object3D();
  pinBatch.frustumCulled=false;pinBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const stemPositions=new Float32Array(markerCount*6),stemGeometry=new THREE.BufferGeometry();stemGeometry.setAttribute('position',new THREE.BufferAttribute(stemPositions,3).setUsage(THREE.DynamicDrawUsage));
  const stemBatch=new THREE.LineSegments(stemGeometry,new THREE.LineBasicMaterial({color:'#f7f8ea',transparent:true,opacity:.65}));stemBatch.frustumCulled=false;world.add(pinBatch,stemBatch);
  const addMarker=(p,entry=false)=>{
    const button=document.createElement('button');button.type='button';button.className='atlas-marker'+(entry?' atlas-entry':'');
    button.dataset.node=p.id;button.setAttribute('aria-label',entry?`从${p.name}开始`:`查看${p.name}`);
    const photo=entry?null:config.preview(p.id);
    button.innerHTML=entry?`<b>${icon[p.id]}</b><span>${escapeHTML(p.short)}</span>`:`${photo?`<img alt="" width="216" height="144" decoding="async" referrerpolicy="no-referrer">`:''}<i></i><span>${escapeHTML(p.name)}</span>`;
    button.addEventListener('click',event=>{event.stopPropagation();if(entry)config.selectEntrance(p.id);else {config.selectPlace(p.id);if(mode==='panorama')config.openScene(p.id);}});
    labels.append(button);
    const anchor=worldPoint(p.coords,entry ? .1+2*ENTRANCE_MODEL_SCALE : .3),base=worldPoint(p.coords,.12);
    const connector=document.createElementNS('http://www.w3.org/2000/svg','line');connectors.append(connector);
    markers.push({p,button,anchor,base,index:markers.length,entry,connector,photo});
  };
  config.places.forEach(p=>addMarker(p));config.entrances.forEach(p=>addMarker(p,true));
  const areaLabels=[];
  for(const [text,en,coords,offset] of [['苍 山','CANGSHAN',[100.06,25.79],1.4],['洱 海','ERHAI LAKE',[100.193,25.80],.4]]){
    const el=document.createElement('div');el.className='atlas-area-label';el.innerHTML=`${text}<small>${en}</small>`;labels.append(el);areaLabels.push({el,anchor:worldPoint(coords,offset)});
  }
  const routeGroup=new THREE.Group();world.add(routeGroup);
  const destinationRing=new THREE.Mesh(new THREE.RingGeometry(.24,.30,48),new THREE.MeshBasicMaterial({color:'#f8e1a1',transparent:true,opacity:.85,side:THREE.DoubleSide,depthTest:false}));
  destinationRing.rotation.x=-Math.PI/2;destinationRing.renderOrder=5;destinationRing.visible=false;world.add(destinationRing);

  const lampCoords=lampPositions(lakeRing,125,inLake),lampGeo=new THREE.BufferGeometry(),lampPoints=new Float32Array(lampCoords.length*3),phases=new Float32Array(lampCoords.length);
  lampCoords.forEach((c,i)=>{const p=vector(c,.17);p.toArray(lampPoints,i*3);phases[i]=i*.83;});
  lampGeo.setAttribute('position',new THREE.BufferAttribute(lampPoints,3));lampGeo.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  const lampMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uRatio:{value:Math.min(devicePixelRatio||1,2)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime;uniform float uRatio;attribute float aPhase;varying float vGlow;void main(){vec3 p=position;p.x+=sin(uTime*.16+aPhase)*.035;p.z+=cos(uTime*.12+aPhase)*.035;p.y+=sin(uTime*.8+aPhase)*.018;vGlow=.66+.24*sin(uTime*.63+aPhase);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(540./-mv.z,5.,18.)*uRatio;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vGlow;void main(){float d=length(gl_PointCoord-vec2(.5));float glow=exp(-d*d*25.);float core=exp(-d*d*170.);gl_FragColor=vec4(mix(vec3(1.,.65,.24),vec3(1.,.96,.76),core),glow*vGlow);}`});
  const lamps=new THREE.Points(lampGeo,lampMat);lamps.visible=false;world.add(lamps);
  const reflectionGeo=new THREE.BufferGeometry().setFromPoints(lampCoords.flatMap((c,i)=>{const p=vector(c,.10);return [p,new THREE.Vector3(p.x+.02,.10,p.z+.25+(i%3)*.04)];}));
  const reflections=new THREE.LineSegments(reflectionGeo,new THREE.LineBasicMaterial({color:'#f6c774',transparent:true,opacity:.2,depthWrite:false}));reflections.visible=false;world.add(reflections);

  const townLabel=root.querySelector('.atlas-town'),compass=root.querySelector('.atlas-compass i'),projected=new THREE.Vector3();
  const coastLayout=new Map();
  for(const region of new Set(config.places.map(p=>p.region))){const coast=config.places.filter(p=>p.region===region).sort((a,b)=>b.coords[1]-a.coords[1]);coast.forEach((p,index)=>coastLayout.set(p.id,{index,count:coast.length}));}
  function syncLabels(){
    const rects=[];
    const compact=mode==='explore'&&width<=720;
    const labelLimit=compact?(camera.position.distanceTo(controls.target)>35?6:9):Infinity;
    const selected=mode==='tour'?tourPlaceId:state.selected;
    const mobilePriority=['ancient-town','shuanglang','xizhou','wenbi','cangshan'];
    const rank=p=>{const i=mobilePriority.indexOf(p.id);return i<0?99:i;};
    const ordered=[...markers].sort((a,b)=>Number(b.p.id===selected)-Number(a.p.id===selected)||Number(state.stops?.includes(b.p.id)||false)-Number(state.stops?.includes(a.p.id)||false)||Number(b.entry)-Number(a.entry)||(compact?rank(a.p)-rank(b.p):0));
    for(const marker of ordered){
      const {button,p,anchor,base,index,entry,connector}=marker;
      const closeTown=mode==='explore'&&currentPreset==='town';
      const show=mode==='tour'?!entry:mode!=='night'&&(!closeTown||entry||p.id==='ancient-town')&&(mode==='panorama'||entry||state.region==='all'||!state.region||p.region===state.region||p.id===state.selected||state.stops?.includes(p.id));
      const pos=projected.copy(anchor).project(camera), x=(pos.x*.5+.5)*width,y=(-pos.y*.5+.5)*height;
      pinDummy.position.copy(base);pinDummy.scale.setScalar(show&&!entry?1:0);pinDummy.updateMatrix();pinBatch.setMatrixAt(index,pinDummy.matrix);
      base.toArray(stemPositions,index*6);(show?anchor:base).toArray(stemPositions,index*6+3);
      const photo=mode==='panorama'&&!entry;
      const itemWidth=photo?(width<721?75:96):Math.max(65,p.name.length*12+24),itemHeight=photo?(width<721?60:60):30;
      let hidden=rects.length>=labelLimit||!show||pos.z>1||x<0||x>width||y<0||y>height-30;
      let lx=x,ly=y-27;
      if(!hidden && photo && width>720){
        const {index,count}=coastLayout.get(p.id);
        if(p.region==='west'){
          const column=index%2,row=Math.floor(index/2),rows=Math.ceil(count/2);
          lx=60+column*110;ly=40+row*(height-160)/Math.max(1,rows-1);
        }else {lx=width-125;ly=55+index*(height-180)/Math.max(1,count-1);}
        rects.push({x:lx,y:ly,w:itemWidth,h:itemHeight});
      }else if(!hidden){
        const candidates=[[0,-27],[0,-27-itemHeight-8],[-itemWidth,-27],[itemWidth,-27],[-itemWidth,-27-itemHeight-8],[itemWidth,-27-itemHeight-8],[0,25+itemHeight/2],[-itemWidth,25+itemHeight/2],[itemWidth,25+itemHeight/2],[-itemWidth*1.8,-27],[itemWidth*1.8,-27],[0,-27-2*(itemHeight+8)]];
        const spot=candidates.find(([dx,dy])=>{
          const cx=x+dx,cy=y+dy;
          if(cx<itemWidth/2+8||cx>width-itemWidth/2-8||cy<itemHeight/2+12||cy>height-(mode==='tour'?18:90)-itemHeight/2)return false;
          if(mode==='explore'&&width>720&&cx<310&&(cy<135||cy>height-(config.drawerOpen?.()?470:235)))return false;
          if(compact&&cy<100+itemHeight/2)return false;
          if(mode==='explore'&&currentPreset==='town'&&cy<235)return false;
          if(mode!=='tour'&&cx>width-65&&cy<290)return false;
          return !rects.some(r=>Math.abs(r.x-cx)<(r.w+itemWidth)/2+5&&Math.abs(r.y-cy)<(r.h+itemHeight)/2+5);
        });
        if(spot){lx=x+spot[0];ly=y+spot[1];rects.push({x:lx,y:ly,w:itemWidth,h:itemHeight});}
        else hidden=true;
      }
      button.hidden=hidden;connector.style.display=hidden?'none':'';
      if(!hidden&&photo)config.loadPreview(button.querySelector('img'),marker.photo);
      if(!hidden){button.style.left=`${lx}px`;button.style.top=`${ly}px`;connector.setAttribute('x1',x);connector.setAttribute('y1',y);connector.setAttribute('x2',lx);connector.setAttribute('y2',ly+itemHeight/2);}
    }
    pinBatch.instanceMatrix.needsUpdate=true;stemGeometry.attributes.position.needsUpdate=true;
    for(const {el,anchor} of areaLabels){const p=projected.copy(anchor).project(camera);el.style.left=`${(p.x*.5+.5)*width}px`;el.style.top=`${(-p.y*.5+.5)*height}px`;el.hidden=p.z>1;}
    townLabel.hidden=mode!=='explore'||currentPreset!=='town';
    compass.style.transform=`rotate(${-controls.getAzimuthalAngle()}rad)`;
  }
  let routeKey='';
  function update(snapshot){
    state=snapshot;
    for(const {p,button,entry} of markers){const active=mode==='tour'?tourPlaceId===p.id:entry?state.entrance===p.id:state.selected===p.id;button.classList.toggle('active',active);button.classList.toggle('saved',state.stops?.includes(p.id));button.setAttribute('aria-pressed',String(active));}
    const nextRouteKey=JSON.stringify(state.route||[]);
    if(nextRouteKey!==routeKey){
      routeKey=nextRouteKey;
      while(routeGroup.children.length){const child=routeGroup.children[0];child.geometry.dispose();child.material.dispose();routeGroup.remove(child);}
      const route=state.route||[];
      if(route.length>1){
        const points=[];
        for(let i=1;i<route.length;i++)for(let t=0;t<20;t++){const k=t/20;const coords=[THREE.MathUtils.lerp(route[i-1][0],route[i][0],k),THREE.MathUtils.lerp(route[i-1][1],route[i][1],k)];points.push(worldPoint(coords,.23));}
        points.push(worldPoint(route.at(-1),.23));
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#dc7855',dashSize:.32,gapSize:.16,depthTest:false}));line.computeLineDistances();line.renderOrder=4;routeGroup.add(line);
      }
    }
    dirty=true;
  }
  function targetView(name,immediate=false){
    const preset=presets[name]||presets.overview;currentPreset=name;
    const p=new THREE.Vector3(...preset.position),target=new THREE.Vector3(...preset.target);
    // Portrait screens need a larger camera distance to keep both shores in frame.
    if(width/height<1)p.sub(target).multiplyScalar(Math.min(1.7,Math.max(1,.9/(width/height)))).add(target);
    if(immediate||reducedMotion.matches){camera.position.copy(p);controls.target.copy(target);controls.update();transition=null;}
    else transition={start:performance.now(),from:camera.position.clone(),to:p,targetFrom:controls.target.clone(),targetTo:target};
    root.dataset.view=name;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
    root.querySelector('.atlas-status').textContent=({overview:'山海全景',cangshan:'走近苍山',town:'古城山麓',lake:'俯瞰洱海',night:'洱海渔灯夜色'})[name];dirty=true;
  }
  function cameraAction(action){
    transition=null;
    if(action==='reset')return targetView(mode==='night'?'night':'overview');
    const offset=camera.position.clone().sub(controls.target);
    if(action==='zoom-in'||action==='zoom-out'){const scale=action==='zoom-in'?.8:1.25;offset.setLength(THREE.MathUtils.clamp(offset.length()*scale,controls.minDistance,controls.maxDistance));}
    else offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?.22:-.22);
    camera.position.copy(controls.target).add(offset);controls.update();dirty=true;
  }

  function applyTourPose(from,to,progress){
    transition=null;
    const pose=tourCamera(from,to,progress,width/height,reducedMotion.matches);
    const target=new THREE.Vector3(pose.target[0],Math.max(.3,heightAt(pose.at)+.3),pose.target[1]);
    controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(...pose.offset));controls.update();dirty=true;
  }
  function resize(){
    const bounds=root.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
    const ratio=atlasViewPixelRatio(bounds.width,bounds.height,devicePixelRatio||1,mode);
    if(width===bounds.width&&height===bounds.height&&renderer.getPixelRatio()===ratio)return;
    const oldAspect=width/height;width=bounds.width;height=bounds.height;
    if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);lampMat.uniforms.uRatio.value=renderer.getPixelRatio();camera.aspect=width/height;camera.updateProjectionMatrix();
    if(mode==='tour'&&lastTourPose)applyTourPose(...lastTourPose);
    else if((oldAspect<1)!==(width/height<1))targetView(currentPreset,true);dirty=true;
  }
  function setAtmosphere(value){
    atmosphere=value;const night=value==='night',dusk=value==='dusk';root.dataset.atmosphere=value;
    scene.background.set(night?'#0b1b2b':dusk?'#e5ddca':'#e3eae3');scene.fog.color.copy(scene.background);
    terrainMaterial.color.set(night?'#7894b6':dusk?'#eee0ca':'#ffffff');skirtMaterial.color.set(night?'#20384b':dusk?'#a59682':'#7c9f95');shadow.material.color.copy(scene.background);
    sky.intensity=night?1.4:dusk?1.9:2.0;sun.intensity=night?1.05:dusk?1.7:1.65;sun.color.set(night?'#a9cfff':dusk?'#ffbd7d':'#fff6df');sun.position.set(-35,dusk?14:30,18);
    waterMaterial.uniforms.uNight.value=night?1:0;waterMaterial.uniforms.uDusk.value=dusk?1:0;lamps.visible=reflections.visible=night;buildings.visible=!night;
    root.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.time===value)));dirty=true;
  }
  function setMode(next){
    mode=next;destinationRing.visible=next==='tour';
    if(next==='panorama')for(const {button} of markers){const img=button.querySelector('img');if(img?.dataset.photoState==='failed'){delete img.dataset.photoState;img.hidden=false;button.querySelector('.photo-unavailable')?.remove();}}
    if(next!=='tour')for(const {p,button,entry} of markers){button.classList.remove('tour-current');const active=entry?state.entrance===p.id:state.selected===p.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
    const night=next==='night';root.dataset.mode=next;arrivals.visible=!night&&next!=='tour';
    setAtmosphere(night?'night':mainView?.atmosphere||atmosphere);
    routeGroup.visible=!night&&next!=='tour';root.querySelector('.atlas-heading').hidden=next!=='explore';root.querySelector('.atlas-selection').hidden=true;
    root.querySelector('.atlas-views').hidden=night||next==='tour';root.querySelector('.atlas-time').hidden=night||next==='tour';controls.enabled=next!=='tour';
    root.querySelector('.atlas-gesture').innerHTML=night?'拖动，换一个角度看星河':`拖动旋转 · 双指缩放${next==='explore'?'<span> · Ctrl + 滚轮缩放</span>':''}`;dirty=true;
  }
  function mount(target,next='explore'){
    if(mode==='explore'&&next!=='explore')mainView={position:camera.position.clone(),target:controls.target.clone(),preset:currentPreset,atmosphere};
    target.replaceChildren(root);setMode(next);resize();
    if(next==='explore'&&mainView){camera.position.copy(mainView.position);controls.target.copy(mainView.target);currentPreset=mainView.preset;root.dataset.view=currentPreset;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===currentPreset)));root.querySelector('.atlas-status').textContent=root.querySelector(`[data-view="${currentPreset}"]`)?.textContent||'山海全景';controls.update();mainView=null;transition=null;}
    else if(next==='night'){targetView('night',true);}
    else targetView('overview',true);
    visible=true;dirty=true;
  }
  const observer=new ResizeObserver(resize);observer.observe(root);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=true;});intersection.observe(root);
  const listeners=new AbortController();
  root.addEventListener('click',event=>{const b=event.target.closest('[data-view],[data-camera],[data-atlas-scene],[data-time],[data-town-chapter]');if(!b)return;event.stopPropagation();if(b.dataset.view)targetView(b.dataset.view);if(b.dataset.time)setAtmosphere(b.dataset.time);if(b.dataset.townChapter!==undefined)config.openWalk(Number(b.dataset.townChapter));if(b.dataset.camera)cameraAction(b.dataset.camera);if(b.dataset.atlasScene)config.openScene(b.dataset.atlasScene);},{signal:listeners.signal});
  renderer.domElement.addEventListener('wheel',event=>{if(mode==='explore'&&!event.ctrlKey&&!event.metaKey)event.stopImmediatePropagation();},{capture:true,passive:true,signal:listeners.signal});
  renderer.domElement.addEventListener('keydown',event=>{if(mode==='tour')return;const actions={ArrowLeft:'left',ArrowRight:'right','+':'zoom-in','=':'zoom-in','-':'zoom-out',Home:'reset'};if(actions[event.key]){event.preventDefault();cameraAction(actions[event.key]);}if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(event.key==='ArrowUp'?-.12:.12),.12,1.25);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();dirty=true;}},{signal:listeners.signal});
  controls.addEventListener('start',()=>{transition=null;lastInteraction=performance.now();});controls.addEventListener('change',()=>{controls.target.x=THREE.MathUtils.clamp(controls.target.x,-16,16);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-23,23);controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,5);lastInteraction=performance.now();dirty=true;});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();root.dataset.ready='false';root.querySelector('.atlas-status').textContent='立体画面暂时中断，正在恢复';config.onContextLost?.(root);},{signal:listeners.signal});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{root.dataset.ready='loading';firstFrame=false;root.querySelector('.atlas-status').textContent='立体地图已恢复';dirty=true;},{signal:listeners.signal});
  function frame(now){
    if(disposed)return;animationId=requestAnimationFrame(frame);
    if(document.hidden||!visible||root.dataset.ready==='false'||config.isCovered())return;
    if(now-lastFrame<atlasFrameInterval(mode,!!transition||now-lastInteraction<250))return;const delta=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
    const animate=atlasNeedsAnimation(mode,motion,reducedMotion.matches);
    if(animate)clock+=delta;
    if(transition){const t=Math.min(1,(now-transition.start)/1000),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,ease);if(t===1)transition=null;dirty=true;}
    controls.update();
    if(!animate&&!dirty)return;
    waterMaterial.uniforms.uTime.value=clock;lampMat.uniforms.uTime.value=clock;
    try{
      if(dirty)syncLabels();renderer.render(scene,camera);dirty=false;
      if(!firstFrame){firstFrame=true;root.dataset.ready='true';config.onReady?.();}
    }catch(error){cancelAnimationFrame(animationId);root.dataset.ready='false';config.onError?.(error);}
  }
  config.onProgress?.({stage:'frame',ratio:0});
  mount(host);update(config.initialState);targetView('overview',true);animationId=requestAnimationFrame(frame);
  // Start optional street/building downloads only after the first landscape frame.
  requestAnimationFrame(()=>{
    if(disposed)return;
    loadAtlasJSON(new URL('./terrain/erhai-details.json',import.meta.url)).then(async data=>{
      if(disposed)return;
      const hadIslands=detail.islands.length>0;
      detail=data;islandTests=data.islands.map(i=>indexAtlasRing(i.coords));
      const meshes=await builder.details({...data,islands:hadIslands?[]:data.islands},data.islands);
      if(disposed)return;
      addDetails(meshes);dirty=true;
      root.querySelector('.atlas-status').textContent='立体山海与周边街巷已就绪';
    }).catch(error=>{if(!disposed)console.warn('Optional map details unavailable:',error.message);}).finally(()=>builder.dispose());
  });
  return { update,mount,setAtmosphere,tourPose(from,to,progress,index=0,placeId=null){
      if(mode!=='tour')return;
      if(tourPlaceId!==placeId){tourPlaceId=placeId;for(const {p,button} of markers){button.classList.toggle('tour-current',p.id===placeId);button.classList.toggle('active',p.id===placeId);button.setAttribute('aria-pressed',String(p.id===placeId));}}
      lastTourPose=[from,to,progress];destinationRing.position.copy(worldPoint(to,.12));destinationRing.scale.setScalar(1+Math.sin(progress*Math.PI)*.25);applyTourPose(from,to,progress);
    },visitTown(){if(mode==='explore')targetView('town');},setMotion(value){motion=value;dirty=true;},reset(){targetView(mode==='night'?'night':'overview');},
    focus(coords){const target=worldPoint(coords);transition={start:performance.now(),from:camera.position.clone(),to:target.clone().add(new THREE.Vector3(12,16,20)),targetFrom:controls.target.clone(),targetTo:target};dirty=true;},
    dispose(){disposed=true;builder.dispose();cancelAnimationFrame(animationId);observer.disconnect();intersection.disconnect();listeners.abort();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});shoreTexture.dispose();renderer.dispose();root.remove();}
  };
}
