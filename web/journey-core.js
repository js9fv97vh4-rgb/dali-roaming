/* A shoreline exploration graph. Edges indicate direction, not drivable roads. */
(() => {
  function createJourney(places, entrances) {
    const byId=Object.fromEntries(places.map(p=>[p.id,p]));
    const entries=Object.fromEntries(entrances.map(p=>[p.id,p]));
    const state={entrance:null,region:'all',selected:null,destination:null,itinerary:[]};
    const ring=[
      {id:'south',coords:[100.235,25.603]}, byId.fengyangyi, byId.longkan, byId['ancient-town'],
      byId.caicun,byId.panxi,byId.xizhou,byId.zhoucheng,{id:'north-west',coords:[100.122,25.966]},
      {id:'north-east',coords:[100.167,25.970]},byId.shuanglang,byId.wase,byId.xiaoputuo,byId.wenbi,
      {id:'east-south',coords:[100.270,25.685]},{id:'south-east',coords:[100.296,25.630]}
    ];
    const graph=new Map(ring.map(n=>[n.id,[]]));
    const nodes=Object.fromEntries([...ring,...entrances].map(n=>[n.id,n]));
    const distance=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos(25.8*Math.PI/180),a[1]-b[1]);
    function link(a,b){const cost=distance(nodes[a].coords,nodes[b].coords);graph.get(a).push({id:b,cost});graph.get(b).push({id:a,cost});}
    ring.forEach((n,i)=>link(n.id,ring[(i+1)%ring.length].id));
    for(const [a,b] of [['santasi','ancient-town'],['cangshan','fengyangyi'],['jizhaoan','cangshan'],['haishe','xizhou']]){nodes[a]=byId[a];graph.set(a,[]);link(a,b);}
    for(const e of entrances){graph.set(e.id,[]);link(e.id,e.id==='airport'?'south-east':'south');}
    function path(start,end){
      if(start===end)return [start];
      const costs=new Map([[start,0]]),prev=new Map(),open=new Set([start]);
      while(open.size){
        const current=[...open].sort((a,b)=>costs.get(a)-costs.get(b))[0];open.delete(current);
        if(current===end)break;
        for(const edge of graph.get(current)||[]){const cost=costs.get(current)+edge.cost;if(cost<(costs.get(edge.id)??Infinity)){costs.set(edge.id,cost);prev.set(edge.id,current);open.add(edge.id);}}
      }
      const result=[end];while(result[0]!==start){const p=prev.get(result[0]);if(!p)return [];result.unshift(p);}return result;
    }
    const stops=()=>[...state.itinerary.filter(id=>id!==state.destination),...(state.destination?[state.destination]:[])];
    function route(){
      if(!state.entrance)return [];
      const ids=stops();let from=state.entrance,result=[from];
      for(const id of ids){const segment=path(from,id);result.push(...segment.slice(1));from=id;}
      return result;
    }
    function suggestions(){
      const selected=new Set(stops());
      const along=[...new Set(route())].filter(id=>byId[id]&&!selected.has(id));
      const target=byId[state.destination];
      const nearby=target?places.filter(p=>!selected.has(p.id)&&!along.includes(p.id))
        .sort((a,b)=>distance(a.coords,target.coords)-distance(b.coords,target.coords)).slice(0,2).map(p=>p.id):[];
      return {along,nearby};
    }
    const requirePlace=id=>{if(!byId[id])throw new Error('未知的景点');};
    function remove(id){requirePlace(id);state.itinerary=state.itinerary.filter(x=>x!==id);if(state.destination===id)state.destination=null;}
    function setDestination(id){requirePlace(id);state.destination=id;select(id);}
    function toggle(id){requirePlace(id);const exists=stops().includes(id);if(exists)remove(id);else state.itinerary.push(id);return !exists;}
    function arrival(id){if(!entries[id])throw new Error('未知的入口');state.entrance=id;state.region=entries[id].region;}
    function select(id){requirePlace(id);state.selected=id;if(state.region!=='all'&&state.region!==byId[id].region)state.region=byId[id].region;}
    function region(id){if(!['west','east','all'].includes(id))throw new Error('未知的区域');state.region=id;}
    function restore(value){
      if(!value||typeof value!=='object')return false;
      state.entrance=entries[value.entrance]?value.entrance:null;
      state.region=['west','east','all'].includes(value.region)?value.region:'all';
      state.selected=byId[value.selected]?value.selected:null;
      state.destination=byId[value.destination]?value.destination:null;
      state.itinerary=[...new Set(Array.isArray(value.itinerary)?value.itinerary:[])].filter(id=>byId[id]).slice(0,places.length);
      return true;
    }
    const snapshot=()=>({entrance:state.entrance,region:state.region,selected:state.selected,destination:state.destination,itinerary:[...state.itinerary]});
    return {state,stops,route,suggestions,toggle,remove,arrival,select,region,setDestination,restore,snapshot,nodes,path};
  }
  globalThis.createDaliJourney=createJourney;
})();
