// Retry transient data failures and keep Retina framebuffers within a fixed budget.
export async function loadAtlasJSON(url, {fetcher=fetch, attempts=2, timeout=20000,onProgress}={}) {
  let lastError;
  for(let attempt=0;attempt<attempts;attempt++) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetcher(url,{signal:controller.signal,cache:attempt?'reload':'default'});
      if(!response.ok)throw new Error(`地图数据加载失败（${response.status}）`);
      if(!onProgress||!response.body?.getReader)return await response.json();
      const encoding=response.headers.get('content-encoding');
      const total=(!encoding||encoding==='identity')?Number(response.headers.get('content-length'))||0:0,reader=response.body.getReader(),decoder=new TextDecoder(),parts=[];
      let loaded=0;
      try{
        for(;;){const {done,value}=await reader.read();if(done)break;loaded+=value.byteLength;parts.push(decoder.decode(value,{stream:true}));onProgress({loaded,total});}
        parts.push(decoder.decode());
      }finally{reader.releaseLock();}
      const value=JSON.parse(parts.join(''));onProgress({loaded,total,done:true});return value;
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

// Fullscreen previews use a smaller framebuffer; the geographic mesh stays intact.
export function atlasViewPixelRatio(width,height,ratio=1,mode='explore'){
  const budget=mode==='panorama'?1200000:2400000;
  return Math.min(atlasPixelRatio(width,height,ratio),Math.sqrt(budget/Math.max(1,width*height)));
}
export function atlasNeedsAnimation(mode,motion,reduced){return mode!=='panorama'&&motion&&!reduced;}

// Keep interactive movement responsive; quiet water needs fewer full-scene draws.
export function atlasFrameInterval(mode,active){return active||mode==='tour'||mode==='panorama'?32:mode==='night'?42:66;}

// Far views reuse the full-resolution vertex data with one quarter of the faces.
export function atlasTerrainIndices(columns,rows){
  const indices=new Uint32Array(Math.ceil((columns-1)/2)*Math.ceil((rows-1)/2)*6);let at=0;
  for(let y=0;y<rows-1;y+=2)for(let x=0;x<columns-1;x+=2){
    const right=Math.min(x+2,columns-1),bottom=Math.min(y+2,rows-1);
    const a=y*columns+x,b=bottom*columns+x,c=bottom*columns+right,d=y*columns+right;
    indices.set([a,b,d,b,c,d],at);at+=6;
  }
  return indices;
}
