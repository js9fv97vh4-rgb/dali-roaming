// CPU-only geometry builders shared by the worker and its compatibility fallback.
import * as THREE from './vendor/three/three.core.js';
import {project,unproject,reliefHeight} from './map3d-geo.js';
import {indexAtlasRing} from './map3d-runtime.js';

export function createHeightSampler(dem,lake,islands){
  const inLake=indexAtlasRing(lake),tests=islands.map(i=>indexAtlasRing(i.coords));
  const isWater=coords=>inLake(coords)&&!tests.some(test=>test(coords));
  return {isWater,heightAt:coords=>tests.some(test=>test(coords))?Math.max(.20,reliefHeight(dem,coords)):inLake(coords)?.08:reliefHeight(dem,coords)};
}
export const terrainNoise=(x,z)=>Math.sin(x*.73+Math.sin(z*.49))*Math.cos(z*.58+x*.15);
export function packGeometry(geometry){
  const result={};
  for(const key of ['position','normal','color'])if(geometry.attributes[key])result[key]=geometry.attributes[key].array;
  if(geometry.index)result.index=geometry.index.array;
  geometry.dispose();return result;
}
export function buildTerrain(dem,isWater){
  const [west,south,east,north]=dem.bounds;
  const geometry=new THREE.PlaneGeometry(1,1,dem.columns-1,dem.rows-1),positions=geometry.attributes.position;
  const colours=new Float32Array(positions.count*3),low=new THREE.Color('#aebc91'),forest=new THREE.Color('#315f4e'),summit=new THREE.Color('#acb6a6'),rock=new THREE.Color('#8b9988'),colour=new THREE.Color();
  for(let row=0;row<dem.rows;row++)for(let col=0;col<dem.columns;col++){
    const i=row*dem.columns+col,coords=[west+(east-west)*col/(dem.columns-1),north-(north-south)*row/(dem.rows-1)],altitude=dem.heights[i];
    const [x,z]=project(coords),h=isWater(coords)?-.05:(altitude-dem.lakeLevel)/1000*2.8;
    positions.setXYZ(i,x,h,z);
    if(altitude<2700)colour.copy(low).lerp(forest,THREE.MathUtils.clamp((altitude-1980)/720,0,1));
    else colour.copy(forest).lerp(summit,THREE.MathUtils.clamp((altitude-2850)/1150,0,1));
    const slope=Math.abs(dem.heights[Math.max(0,i-1)]-dem.heights[Math.min(dem.heights.length-1,i+1)])+Math.abs(dem.heights[Math.max(0,i-dem.columns)]-dem.heights[Math.min(dem.heights.length-1,i+dem.columns)]);
    colour.lerp(rock,THREE.MathUtils.clamp((slope-210)/600,0,.5));
    colour.multiplyScalar(.92+terrainNoise(x,z)*.065+Math.sin(x*5.3+z*3.7)*.012).toArray(colours,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));geometry.computeVertexNormals();
  return packGeometry(geometry);
}

// The shader clamps at 1.5 km. Visit only texels within that radius of each
// edge, then take one square root per texel instead of one per edge/texel pair.
export function buildShoreField(lake,size=[96,160]){
  const points=lake.map(project),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  const bounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs)];
  const [width,height]=size,distances=new Float64Array(width*height).fill(2.25),data=new Uint8Array(width*height);
  const sx=bounds[2]/(width-1),sz=bounds[3]/(height-1),radius=1.5;
  for(let k=0;k<points.length;k++){
    const [ax,az]=points[k],[bx,bz]=points[(k+1)%points.length],dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz||1;
    const left=Math.max(0,Math.ceil((Math.min(ax,bx)-radius-bounds[0])/sx)),right=Math.min(width-1,Math.floor((Math.max(ax,bx)+radius-bounds[0])/sx));
    const top=Math.max(0,Math.ceil((Math.min(az,bz)-radius-bounds[1])/sz)),bottom=Math.min(height-1,Math.floor((Math.max(az,bz)+radius-bounds[1])/sz));
    for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
      const x=bounds[0]+col*sx,z=bounds[1]+row*sz,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/length));
      const u=x-ax-t*dx,v=z-az-t*dz,i=row*width+col;
      distances[i]=Math.min(distances[i],u*u+v*v);
    }
  }
  for(let i=0;i<data.length;i++)data[i]=Math.round(Math.min(1,Math.sqrt(distances[i])/radius)*255);
  return {data,size,bounds};
}

export function buildDetails(data,heightAt){
  const point=(coords,offset=0)=>{const [x,z]=project(coords);return new THREE.Vector3(x,heightAt(coords)+offset,z);};
  const landcover=new Map();
  for(const feature of [...data.landcover,...data.islands.map(i=>({...i,kind:'island'}))]){
    const shape=new THREE.Shape(feature.coords.map(c=>{const [x,z]=project(c);return new THREE.Vector2(x,-z);}));
    let geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
    const positions=geo.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setY(i,heightAt(unproject([positions.getX(i),positions.getZ(i)]))+.025);
    geo.computeVertexNormals();
    const flat=geo.toNonIndexed();geo.dispose();geo=flat;
    if(!landcover.has(feature.kind))landcover.set(feature.kind,[]);
    landcover.get(feature.kind).push(packGeometry(geo));
  }
  const merge=(parts,key)=>{
    const array=new Float32Array(parts.reduce((n,p)=>n+p[key].length,0));let offset=0;
    for(const part of parts){array.set(part[key],offset);offset+=part[key].length;}return array;
  };
  const roadVertices=[];
  for(const road of data.roads)for(let k=1;k<road.coords.length;k++){
    const a=road.coords[k-1],b=road.coords[k],steps=Math.max(1,Math.ceil(point(a).distanceTo(point(b))/.08));
    for(let j=0;j<steps;j++)for(const f of [j/steps,(j+1)/steps])point([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],.045).toArray(roadVertices,roadVertices.length);
  }
  const parts=[];
  for(const building of data.buildings){
    if(building.coords.length<4)continue;
    const center=building.coords.reduce((sum,c)=>[sum[0]+c[0]/building.coords.length,sum[1]+c[1]/building.coords.length],[0,0]);
    const shape=new THREE.Shape(building.coords.map(c=>{const [x,z]=project(c);return new THREE.Vector2(x,-z);}));
    const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.035,Math.min(.14,(building.levels||2)*.012)),bevelEnabled:false,steps:1});
    geo.rotateX(-Math.PI/2);geo.translate(0,heightAt(center)+.015,0);parts.push(packGeometry(geo));
  }
  return {landcover:[...landcover].map(([kind,parts])=>({kind,position:merge(parts,'position'),normal:merge(parts,'normal')})),roads:{position:new Float32Array(roadVertices)},buildings:{position:merge(parts,'position'),normal:merge(parts,'normal')}};
}

export function buildLandscape(dem,lake,islands){
  const {isWater,heightAt}=createHeightSampler(dem,lake,islands);
  return {terrain:buildTerrain(dem,isWater),shore:buildShoreField(lake),islands:buildDetails({islands,landcover:[],roads:[],buildings:[]},heightAt)};
}
