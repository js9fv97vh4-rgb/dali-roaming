import {createHeightSampler,buildLandscape,buildDetails} from './map3d-mesh.js';
let dem,lake,islands;
self.onmessage=({data:{id,type,payload}})=>{
  try{
    let result;
    if(type==='landscape'){
      ({dem,lake,islands}=payload);
      result=buildLandscape(dem,lake,islands);
    }else{
      islands=payload.allIslands;
      result=buildDetails(payload.data,createHeightSampler(dem,lake,islands).heightAt);
    }
    const buffers=[];
    const collect=value=>{if(ArrayBuffer.isView(value))buffers.push(value.buffer);else if(value&&typeof value==='object')Object.values(value).forEach(collect);};
    collect(result);self.postMessage({id,result},[...new Set(buffers)]);
  }catch(error){self.postMessage({id,error:error.message});}
};
