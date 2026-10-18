// Keep geometry work off the UI thread. Worker restrictions/failures fall back
// to the very same builders, so compatibility does not change map accuracy.
export function createMeshBuilder({workerFactory=()=>new Worker(new URL('./map3d-worker.js',import.meta.url),{type:'module'}),timeout=30000}={}){
  let worker,sequence=0,landscape,disposed=false;const pending=new Map();
  const stopWorker=error=>{worker?.terminate();worker=null;for(const task of pending.values()){clearTimeout(task.timer);task.reject(error);}pending.clear();};
  try{
    worker=workerFactory();
    worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;clearTimeout(task.timer);pending.delete(data.id);data.error?task.reject(new Error(data.error)):task.resolve(data.result);};
    worker.onerror=event=>{event.preventDefault?.();stopWorker(new Error('Geometry worker unavailable'));};
  }catch{worker=null;}
  async function run(type,payload){
    if(disposed)throw new Error('Geometry builder disposed');
    if(worker)try{return await new Promise((resolve,reject)=>{
      const id=++sequence,timer=setTimeout(()=>stopWorker(new Error('Geometry worker timed out')),timeout);
      pending.set(id,{resolve,reject,timer});worker.postMessage({id,type,payload});
    });}catch(error){stopWorker(error);}
    if(disposed)throw new Error('Geometry builder disposed');
    const mesh=await import('./map3d-mesh.js');
    if(disposed)throw new Error('Geometry builder disposed');
    const {dem,lake,islands}=landscape;
    if(type==='landscape')return mesh.buildLandscape(dem,lake,islands);
    return mesh.buildDetails(payload.data,mesh.createHeightSampler(dem,lake,payload.allIslands).heightAt);
  }
  return {
    landscape(dem,lake,islands){landscape={dem,lake,islands};return run('landscape',landscape);},
    details(data,allIslands){return run('details',{data,allIslands});},
    dispose(){disposed=true;stopWorker(new Error('Geometry builder disposed'));landscape=null;}
  };
}
