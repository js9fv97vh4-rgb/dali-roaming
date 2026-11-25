/* Preserve the original per-city keys and keep the Dali itinerary independent. */
(() => {
  const storageKeys={erhai:'yunnan-erhai-saved-v1',lijiang:'yunnan-lijiang-saved-v1',kunming:'yunnan-kunming-saved-v1'};
  const sets=new Map();
  function restore(set,raw){
    const ids=JSON.parse(raw||'[]');
    if(!Array.isArray(ids))return;
    set.clear();
    ids.forEach(id=>{if(typeof id==='string')set.add(id);});
  }
  function get(city){
    if(!sets.has(city)){
      const set=new Set();sets.set(city,set);
      try{restore(set,localStorage.getItem(storageKeys[city]));}catch{}
    }
    return sets.get(city);
  }
  function changed(city,id,persistent){
    window.dispatchEvent(new CustomEvent('savedchange',{detail:{city,id,persistent}}));
  }
  function toggle(city,id){
    const set=get(city);
    if(set.has(id))set.delete(id);else set.add(id);
    let persistent=true;
    try{localStorage.setItem(storageKeys[city],JSON.stringify([...set]));}catch{persistent=false;}
    changed(city,id,persistent);
    return persistent;
  }
  window.addEventListener('storage',event=>{
    for(const [city,key] of Object.entries(storageKeys)){
      if(!sets.has(city)||(event.key!==null&&event.key!==key))continue;
      try{restore(get(city),event.newValue);changed(city,null,true);}catch{}
    }
  });
  window.TravelSaved={get,toggle};
})();
