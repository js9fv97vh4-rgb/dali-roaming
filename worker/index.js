const PLACE_IDS=new Set(['fengyangyi','ancient-town','longkan','caicun','panxi','xizhou','wenbi','xiaoputuo','shuanglang','santasi','cangshan','jizhaoan','haishe','wase','zhoucheng']);
const ENTRANCES=new Set(['airport','railway','highway']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export function validateJourney(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid journey');
  for(const key of ['selected','destination'])if(input[key]!=null&&!PLACE_IDS.has(input[key]))throw new Error('Invalid place');
  if(input.entrance!=null&&!ENTRANCES.has(input.entrance))throw new Error('Invalid entrance');
  if(!['all','west','east'].includes(input.region))throw new Error('Invalid region');
  if(!Array.isArray(input.itinerary)||input.itinerary.length>PLACE_IDS.size||input.itinerary.some(id=>!PLACE_IDS.has(id)))throw new Error('Invalid stops');
  return {entrance:input.entrance??null,region:input.region,selected:input.selected??null,destination:input.destination??null,itinerary:[...new Set(input.itinerary)]};
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname!=='/api/journey')return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
    // Requires a trusted gateway that strips spoofed headers and blocks direct access.
    if(env.TRUSTED_IDENTITY_GATEWAY!=='sites')return json({error:'参考存储接口默认关闭'},503);
    const user=request.headers.get('oai-authenticated-user-id');
    if(!user)return json({error:'请登录后保存行程'},401);
    if(!env.DB)return json({error:'行程保存暂时不可用'},503);
    try{
      if(request.method==='GET'){
        const row=await env.DB.prepare('SELECT payload, updated_at FROM journeys WHERE user_id = ?').bind(user).first();
        return json({journey:row?JSON.parse(row.payload):null,updatedAt:row?.updated_at??null});
      }
      if(request.method==='PUT'){
        const origin=request.headers.get('origin');
        if(origin&&origin!==url.origin)return json({error:'请求来源不匹配'},403);
        if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'需要 JSON 数据'},415);
        const body=await request.text();if(body.length>8192)return json({error:'行程内容过长'},413);
        let value;try{value=validateJourney(JSON.parse(body));}catch{return json({error:'行程数据无效'},400);}
        const now=Date.now();
        await env.DB.prepare('INSERT INTO journeys (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at').bind(user,JSON.stringify(value),now).run();
        return json({saved:true,updatedAt:now});
      }
      return json({error:'不支持此操作'},405);
    }catch(error){console.error('Journey storage unavailable',error.message);return json({error:'保存暂时失败，请稍后重试；当前行程仍在页面中'},503);}
  }
};
