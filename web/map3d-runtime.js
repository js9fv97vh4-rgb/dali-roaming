// Retry transient data failures and keep Retina framebuffers within a fixed budget.
export async function loadAtlasJSON(url, {fetcher=fetch, attempts=2, timeout=20000}={}) {
  let lastError;
  for(let attempt=0;attempt<attempts;attempt++) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetcher(url,{signal:controller.signal,cache:attempt?'reload':'default'});
      if(!response.ok)throw new Error(`地图数据加载失败（${response.status}）`);
      return await response.json();
    } catch(error) {lastError=error;}
    finally {clearTimeout(timer);}
  }
  throw lastError;
}
export function atlasPixelRatio(width,height,ratio=1) {
  return Math.min(Math.max(1,ratio),2,Math.sqrt(2400000/Math.max(1,width*height)));
}
export function createAtlasRenderer(Renderer) {
  try {return new Renderer({antialias:true,alpha:false,powerPreference:'default'});}
  catch {return new Renderer({antialias:false,alpha:false,powerPreference:'default'});}
}

// Bucket exact shoreline edges by latitude; avoid scanning 1,000+ edges per vertex.
export function indexAtlasRing(ring) {
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
  const count=64,span=north-south||1,buckets=Array.from({length:count},()=>[]);
  const bucket=y=>Math.max(0,Math.min(count-1,Math.floor((y-south)/span*count)));
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [a,b]=ring[i],[c,d]=ring[j];if(b===d)continue;
    const edge=[a,b,c,d];
    for(let k=bucket(Math.min(b,d));k<=bucket(Math.max(b,d));k++)buckets[k].push(edge);
  }
  return ([x,y])=>{
    if(x<west||x>east||y<south||y>north)return false;
    let inside=false;
    for(const [a,b,c,d] of buckets[bucket(y)])if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
    return inside;
  };
}
