(() => {
  'use strict';
  const places=window.DALI_PLACES,entrances=window.DALI_ENTRANCES,geometry=window.DALI_MAP;
  const byId=Object.fromEntries(places.map(p=>[p.id,p]));
  const entranceById=Object.fromEntries(entrances.map(e=>[e.id,e]));
  const model=createDaliJourney(places,entrances),state=model.state;
  const ui={zoom:1,center:[400,405],night:false,motion:true,chooseEntry:false,scene:null,photo:0,photoContext:'scene',autoplay:true,craftStage:0,craftReached:0};
  const $=id=>document.getElementById(id),sceneDialog=$('scene-dialog');
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const regionName=id=>({west:'海西',east:'海东',all:'全部风景'}[id]);
  const project=([lng,lat])=>[380+(lng-100.21)*1260,360-(lat-25.80)*1400];
  const linePath=points=>points.map((p,i)=>`${i?'L':'M'}${project(p).map(v=>v.toFixed(1)).join(',')}`).join('');
  const iconPaths={
    plane:'<path d="M17.8 2.2a2 2 0 0 1 2.8 2.8l-4 4 2 10-3 3-4-8-4 4v3l-2 1-1-5-5-1 1-2h3l4-4-8-4 3-3 10 2z"/>',
    train:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M8 3v7m8-7v7M8 18l-2 3m10-3 2 3"/><circle cx="8.5" cy="14.5" r=".5"/><circle cx="15.5" cy="14.5" r=".5"/>',
    road:'<path d="M7 3 2 21M17 3l5 18M12 3v3m0 4v4m0 4v3M5 13h14"/>'
  };
  const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[n]}</svg>`;
  const orderedStops=()=>model.stops(),suggestions=()=>model.suggestions();
  const routePoints=()=>model.route().map(id=>model.nodes[id].coords);
  const visiblePlaces=()=>places.filter(p=>state.region==='all'||p.region===state.region);
  const galleryFor=id=>window.DALI_GALLERIES?.[id]||[{src:byId[id].image,thumb:byId[id].image,caption:byId[id].kicker,...byId[id]}];
  const photoCount=id=>galleryFor(id).filter(p=>!p.placeholder).length;
  const photoLabel=id=>photoCount(id)?photoCount(id)+'张实拍':'照片待补充';
  const nightPhotos=window.DALI_NIGHT_PHOTOS||[];
  const activePhotos=()=>ui.photoContext==='night'?nightPhotos:galleryFor(ui.scene);
  const isStop=id=>orderedStops().includes(id);
  let toastTimer,saveStatus='正在读取行程',galleryTimer,galleryObserver;
  const localStorageKey='dali-roaming:journey:v1';
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
  function updateSaveStatus(text){saveStatus=text;const node=$('save-status');if(node)node.textContent=text;}
  function persist(){
    try{localStorage.setItem(localStorageKey,JSON.stringify(model.snapshot()));updateSaveStatus('已保存到此浏览器');}
    catch{updateSaveStatus('无法本地保存 · 可导出行程');}
  }
  function hydrate(){
    try{const saved=localStorage.getItem(localStorageKey);if(saved)model.restore(JSON.parse(saved));render();updateSaveStatus(saved?'已恢复此浏览器的行程':'行程会保存在此浏览器');}
    catch{updateSaveStatus('无法读取本地行程 · 可导出行程');}
  }
  function renderLanterns(clipId='lake-clip'){
    const ring=geometry.lake.map(project),levels=[204,244,282,322,359,399,438,477,516,552,583];
    const lamps=levels.map((y,row)=>{
      const xs=[];for(let j=1;j<ring.length;j++){const [a,b]=[ring[j-1],ring[j]];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
      xs.sort((a,b)=>a-b);if(xs.length<2)return '';
      const left=xs[0]+8,right=xs.at(-1)-8,count=Math.max(2,Math.round((right-left)/15));
      return Array.from({length:count},(_,col)=>{
        const seed=row*11+col,x=left+(right-left)*(col+.35+(seed%3)*.1)/count,dy=((seed*13)%19)-9,r=1.15+(seed%4)*.25;
        return `<g transform="translate(${x.toFixed(1)} ${(y+dy).toFixed(1)})"><g class="fishing-light-drift" style="animation-duration:${21+seed%13}s;animation-delay:-${seed%23}s"><g class="fishing-light-bob" style="animation-duration:${5+seed%4}s;animation-delay:-${seed%9}s"><g class="fishing-light-glow" style="animation-duration:${7+seed%6}s;animation-delay:-${seed%11}s"><circle class="light-halo" r="${r*3.3}"/><circle class="light-core" r="${r}"/><ellipse class="light-reflection" cy="5.5" rx="${r*.65}" ry="3.5"/></g></g></g></g>`;
      }).join('');
    }).join('');
    return `<g clip-path="url(#${clipId})" class="lantern-layer ${!ui.motion?'motion-paused':''}" aria-hidden="true" pointer-events="none">${lamps}</g>`;
  }
  function renderProvince(){
    $('province-map').innerHTML=`<svg viewBox="0 0 720 690" role="group" aria-label="云南省地图，大理洱海以红星标记">${geometry.regions.map(r=>`<path class="province-region ${r.dali?'dali-region':''}" d="${r.path}"/><text class="province-label ${r.dali?'dali-label':''}" x="${r.label[0]}" y="${r.label[1]}" text-anchor="middle">${r.name}</text>`).join('')}<g class="province-star" id="dali-star" transform="translate(${geometry.star[0]} ${geometry.star[1]})" role="button" tabindex="0" aria-label="进入大理洱海地图"><circle class="star-pulse" r="18"/><circle r="23" fill="transparent"/><text text-anchor="middle" dominant-baseline="middle">★</text><rect x="25" y="-27" width="123" height="53" rx="8"/><text class="star-name" x="38" y="-5">大理 · 洱海</text><text class="star-sub" x="38" y="14">点击进入漫游</text></g><g transform="translate(657 42)"><path d="M0 22 6 0 12 22 6 17Z" fill="#668a8b"/><text x="6" y="-9" text-anchor="middle" class="map-compass">N</text></g></svg>`;
  }
  function renderMap(){
    const width=570/ui.zoom, height=670/ui.zoom;
    const viewBox=`${ui.center[0]-width/2} ${ui.center[1]-height/2} ${width} ${height}`;
    $('lake-map').closest('.lake-map-wrap').classList.toggle('night',ui.night);
    const candidate=suggestions();
    const routeSet=new Set([...orderedStops(),...candidate.along]);
    const route=routePoints();
    const lakePath=linePath(geometry.lake)+'Z';
    $('lake-map').innerHTML=`<svg id="lake-svg" viewBox="${viewBox}" role="group" aria-label="洱海地图：点击景点查看实景，点击入口选择起点"><defs><clipPath id="lake-clip"><path d="${lakePath}"/></clipPath><linearGradient id="lake-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b3d9dd"/><stop offset="1" stop-color="#81b6c5"/></linearGradient></defs><path class="mountain-band" d="M190 188C240 235 225 350 259 420S269 512 299 541L257 559C217 473 214 432 205 374S183 250 165 204Z"/><path class="mountain-contour" d="M195 225C216 270 211 320 233 373S238 472 277 523M182 231C201 281 196 332 217 389S222 481 259 528"/><path class="lake-water" d="${lakePath}"/>${renderLanterns()}<text class="lake-label" x="367" y="366" transform="rotate(-13 367 366)" text-anchor="middle">洱海</text><text class="lake-en-label" x="374" y="393" transform="rotate(-13 374 393)" text-anchor="middle">ERHAI LAKE</text><text class="mountain-label" x="220" y="331" writing-mode="vertical-rl">苍山</text>${route.length?`<path class="route-halo" d="${linePath(route)}"/><path class="route-line" d="${linePath(route)}"/>`:''}${places.map(p=>{
      const [x,y]=project(p.coords);const onRoute=routeSet.has(p.id);const dim=state.region!=='all'&&p.region!==state.region&&!onRoute&&state.selected!==p.id;
      return `<g class="map-place ${state.selected===p.id?'active':''} ${onRoute?'on-route':''} ${dim?'dimmed':''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" role="button" tabindex="0" aria-label="查看${p.name}" data-place="${p.id}"><rect class="marker-hit" x="${Math.min(-12,p.label[0]+(p.anchor==='end'?-p.name.length*16:0)-7)}" y="${Math.min(-12,p.label[1]-15)}" width="${p.name.length*16+40}" height="${Math.abs(p.label[1])+32}" style="fill:transparent;stroke:none"/>${Math.abs(p.label[1])>12?`<path class="marker-leader" d="M0 0L${p.label[0]*.65} ${p.label[1]}"/>`:''}<circle r="6"/><text x="${p.label[0]}" y="${p.label[1]}" text-anchor="${p.anchor}" dominant-baseline="middle">${p.name}</text>${p.id===state.destination?'<text class="target-star" x="0" y="-20" text-anchor="middle">★</text>':''}</g>`;
    }).join('')}${entrances.map(e=>{
      const [x,y]=project(e.coords);let dx=e.id==='airport'?27:e.id==='highway'?-27:27;
      return `<g class="map-entrance ${state.entrance===e.id?'active':''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" role="button" tabindex="0" aria-label="从${e.name}开始" data-entrance="${e.id}"><rect x="${dx<0?-110:-22}" y="-23" width="135" height="46" style="fill:transparent;stroke:none"/><rect x="-17" y="-17" width="34" height="34" rx="8"/><g class="marker-icon" transform="translate(-11 -11) scale(.92)" stroke-linecap="round" stroke-linejoin="round">${iconPaths[e.icon]}</g><text x="${dx}" y="4" text-anchor="${dx<0?'end':'start'}">${state.entrance===e.id?'我的起点':e.short}</text></g>`;
    }).join('')}<g transform="translate(602 122)"><path d="M0 18 5 0 10 18 5 14Z" fill="#668a8b"/><text x="5" y="-10" text-anchor="middle" class="map-compass">N</text></g></svg><div class="map-zoom-controls"><button data-zoom="in" aria-label="放大地图" ${ui.zoom>=2?'disabled':''}>＋</button><button data-zoom="out" aria-label="缩小地图" ${ui.zoom<=1?'disabled':''}>−</button><button data-zoom="reset" aria-label="显示全图">全图</button><button data-zoom="locate" aria-label="定位选中地点">定位</button></div>`;
  }

  function openPanorama(){
    const ring=geometry.lake.map(project),ys=ring.map(p=>p[1]),minY=Math.min(...ys),maxY=Math.max(...ys);
    const panoProject=coords=>{const [x,y]=project(coords);return [560+(x-375)*1.7,80+(y-minY)*1.7];};
    const path=geometry.lake.map((p,i)=>`${i?'L':'M'}${panoProject(p).map(v=>v.toFixed(1)).join(',')}`).join('')+'Z';
    const height=(maxY-minY)*1.7+180;
    const west=places.filter(p=>p.region==='west').sort((a,b)=>b.coords[1]-a.coords[1]);
    const east=places.filter(p=>p.region==='east').sort((a,b)=>b.coords[1]-a.coords[1]);
    const cards=[];
    for(const [group,side] of [[west,'west'],[east,'east']]){
      const columns=side==='west'?2:1;
      for(let col=0;col<columns;col++){
        const subset=group.filter((_,i)=>i%columns===col),positions=subset.map(p=>Math.max(85,Math.min(height-145,panoProject(p.coords)[1]-35)));
        for(let i=1;i<positions.length;i++)positions[i]=Math.max(positions[i],positions[i-1]+115);
        if(positions.at(-1)>height-135){positions[positions.length-1]=height-135;for(let i=positions.length-2;i>=0;i--)positions[i]=Math.min(positions[i],positions[i+1]-115);}
        subset.forEach((p,i)=>{const [x,y]=panoProject(p.coords),cx=side==='west'?(col===0?30:195):745,cy=positions[i],photo=galleryFor(p.id)[0],id='pano-photo-'+p.id;cards.push(`<path class="panorama-connector" d="M${side==='west'?cx+130:cx} ${cy+40}L${x.toFixed(1)} ${y.toFixed(1)}"/><circle class="panorama-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/><g class="panorama-photo-pin" data-scene="${p.id}" role="button" tabindex="0" aria-label="打开${p.name}实景相册"><defs><clipPath id="${id}"><rect x="${cx+4}" y="${cy+4}" width="122" height="71" rx="7"/></clipPath></defs><rect class="panorama-pin-bg ${isStop(p.id)?'saved':''}" x="${cx}" y="${cy}" width="130" height="106" rx="10"/><image href="${photo.thumb}" x="${cx+4}" y="${cy+4}" width="122" height="71" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/><text x="${cx+65}" y="${cy+94}" text-anchor="middle">${p.name}</text></g>`);});
      }
    }
    $('panorama-map').innerHTML=`<svg viewBox="0 0 910 ${height}" role="group" aria-label="洱海全景地图，十五处景点，可点击进入相册；部分景点使用明确标注的占位纹样"><defs><linearGradient id="panorama-lake-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b4dce2"/><stop offset="1" stop-color="#69aabf"/></linearGradient></defs><text class="panorama-coast-label" x="170" y="45" text-anchor="middle">海西 · 古城与村落</text><text class="panorama-coast-label" x="810" y="45" text-anchor="middle">海东 · 山海之间</text><path d="${path}" fill="url(#panorama-lake-fill)" stroke="#71acb7" stroke-width="1.5"/><text class="panorama-lake-label" x="550" y="${height*.45}" text-anchor="middle" transform="rotate(-13 550 ${height*.45})">洱 海</text>${cards.join('')}</svg>`;
    $('panorama-dialog').showModal();const frame=$('panorama-map');if(matchMedia('(max-width:720px)').matches)frame.scrollLeft=(frame.scrollWidth-frame.clientWidth)/2;document.body.classList.add('dialog-open');
  }
  function openLanternMode(){
    ui.motion=true;renderControls();
    $('lantern-dialog').classList.toggle('two-photos',nightPhotos.length===2);
    $('lantern-photos').innerHTML=nightPhotos.map((p,i)=>`<button class="night-photo-window" data-night-photo="${i}" aria-label="查看夜景照片：${esc(p.title)}"><img referrerpolicy="no-referrer" src="${p.thumb}" alt="${esc(p.caption)}" width="${p.width}" height="${p.height}" style="object-position:${p.position||'center'}" decoding="async"><span class="night-photo-caption"><small>${esc(p.location)} · 实景资料图</small><strong>${esc(p.title)}</strong><span aria-hidden="true">＋</span></span></button>`).join('');
    const ring=geometry.lake.map(project),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    const minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY;
    const d=linePath(geometry.lake)+'Z';
    $('lantern-map').innerHTML=`<svg viewBox="${minX-20} ${minY-18} ${width+40} ${height+36}" role="img" aria-label="放大的洱海轮廓，渔灯光点随水波缓慢漂动"><defs><clipPath id="lantern-lake-clip"><path d="${d}"/></clipPath><linearGradient id="night-lake-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1b5266"/><stop offset=".5" stop-color="#123e50"/><stop offset="1" stop-color="#0a2c3f"/></linearGradient><pattern id="wind-ripple-pattern" patternUnits="userSpaceOnUse" width="38" height="24"><path d="M-6 5Q3 1 11 5T28 5T44 5M7 18Q13 15 21 18T38 18" fill="none" stroke="#9dcbd6" stroke-width=".65" opacity=".18"/></pattern><pattern id="wind-shimmer-pattern" patternUnits="userSpaceOnUse" width="61" height="39"><path d="M8 9Q17 5 28 9M35 28Q46 24 57 28" fill="none" stroke="#d5f1f2" stroke-width=".6" opacity=".14"/></pattern></defs><path class="immersive-lake" d="${d}" fill="url(#night-lake-fill)"/><g clip-path="url(#lantern-lake-clip)" class="wind-layer ${!ui.motion?'motion-paused':''}" aria-hidden="true"><rect class="wind-ripples" x="${minX-65}" y="${minY-50}" width="${width+130}" height="${height+100}" fill="url(#wind-ripple-pattern)"/><rect class="wind-shimmer" x="${minX-65}" y="${minY-50}" width="${width+130}" height="${height+100}" fill="url(#wind-shimmer-pattern)"/></g>${renderLanterns('lantern-lake-clip')}</svg>`;
    const b=document.querySelector('#lantern-dialog [data-action=motion]');b.textContent=ui.motion?'暂停灯影与水波':'继续灯影与水波';b.setAttribute('aria-pressed',String(ui.motion));
    $('lantern-dialog').showModal();document.body.classList.add('dialog-open');
  }
  function renderControls(){
    const entry=entranceById[state.entrance];
    $('explore-controls').innerHTML=`<div class="arrival-control">${entry?`<span class="arrival-current">${icon(entry.icon)}<strong>${entry.name}</strong></span><button class="plain-button" data-action="change-entry">更换入口</button>`:'<span class="arrival-label">从哪里出发？</span>'}${!entry||ui.chooseEntry?`<div class="arrival-options">${entrances.map(e=>`<button data-entrance="${e.id}" aria-pressed="${state.entrance===e.id}">${icon(e.icon)}<span>${e.short}</span></button>`).join('')}</div>`:''}</div><div class="explore-filter-row"><div class="region-tabs" aria-label="游览区域">${['west','east','all'].map(r=>`<button class="region-tab" aria-pressed="${state.region===r}" data-region="${r}">${regionName(r)}</button>`).join('')}</div><div class="lake-mood-controls"><button data-action="panorama">全景地图</button><button data-action="lantern-mode">渔灯模式</button><a class="culture-link" href="#erhai-culture">白族扎染 ↗</a></div></div>`;
  }
  function renderSidebar(){
    const selected=byId[state.selected],target=byId[state.destination],entry=entranceById[state.entrance],candidate=suggestions();
    $('explore-sidebar').innerHTML=`${selected?`<div class="selected-place-header"><div><span class="sidebar-label">${regionName(selected.region)}</span><h2>${selected.name}</h2></div><button class="small-scene-button" data-scene="${selected.id}">${photoLabel(selected.id)}</button></div><button class="selected-cover" data-scene="${selected.id}" aria-label="进入${selected.name}实景"><img referrerpolicy="no-referrer" src="${selected.thumb||selected.image}" alt="${selected.name}${selected.placeholder?'照片待补充，扎染纹样占位':'实拍风景'}"><span>${selected.kicker}</span></button><div class="route-action"><button data-set-destination="${selected.id}" class="solid-button">${state.destination===selected.id?'当前目的地':'设为目的地'}</button><button data-add-stop="${selected.id}">${isStop(selected.id)?'移出行程':'加入行程'}</button></div><p class="visit-tip">${selected.tip}</p>`:`<div class="sidebar-label">从地图，走进现场</div><h2>哪一处风景让你心动？</h2><p class="sidebar-copy">点击景点先看照片，喜欢的地方再加入行程。${!entry?'入口也可以稍后选择。':''}</p>`}${target?`<div class="route-destination"><strong>目的地 · ${target.name}</strong><button data-action="clear-destination">取消</button></div>${entry?`<p class="route-summary">${candidate.along.length?'按当前起点和停留顺序，沿岸可留意：'+candidate.along.map(id=>byId[id].name).join('、'):'当前游览段没有其他沿岸候选，可看看附近风景。'}</p><div class="along-chips">${candidate.along.map(id=>`<button data-place="${id}">${byId[id].name}</button>`).join('')}</div>`:'<p class="route-summary">选择上方抵达入口，就能查看沿岸候选。</p>'}`:''}<details class="place-directory" ${!selected?'open':''}><summary>${regionName(state.region)} · ${visiblePlaces().length}处景点</summary><div class="place-list">${visiblePlaces().map((p,i)=>`<button class="place-list-button ${state.selected===p.id?'active':''}" data-place="${p.id}" aria-label="选择${p.name}"><span class="place-index">${String(i+1).padStart(2,'0')}</span><span class="place-list-name">${p.name}</span></button>`).join('')}</div></details>`;
  }
  function renderCards(){
    const c=suggestions();let list=visiblePlaces();
    if(state.entrance&&orderedStops().length){list=[...new Set([...orderedStops(),...c.along,...c.nearby,...list.map(p=>p.id)])].map(id=>byId[id]);}
    $('strip-title').textContent=state.destination?`前往${byId[state.destination].name}，看见沿途`:'沿着洱海，看见风景';
    $('strip-meta').textContent=`${list.length}处风景 · 点击看实景相册`;
    $('scenery-cards').innerHTML=list.map(p=>{
      const tag=p.id===state.destination?'目的地':isStop(p.id)?'已加入行程':c.along.includes(p.id)?'沿岸候选':c.nearby.includes(p.id)?'附近可加游':p.id==='zhoucheng'?'非遗 · 扎染':regionName(p.region);
      return `<button class="scenery-card ${state.selected===p.id?'active':''}" data-scene="${p.id}" aria-label="进入${p.name}实景"><img referrerpolicy="no-referrer" src="${p.thumb||p.image}" alt="${p.name}${p.placeholder?'照片待补充，扎染纹样占位':'真实风景'}" width="600" height="400" loading="lazy"><span class="card-tag ${isStop(p.id)?'route-tag':''}">${tag}</span><div class="scenery-card-content"><h3>${p.name}<small>${photoLabel(p.id)}</small></h3><p>${p.kicker}</p></div></button>`;
    }).join('');
  }
  function render(){renderControls();renderSidebar();renderMap();renderCards();$('itinerary-count').textContent=orderedStops().length;}
  function renderCraft(stage){
    ui.craftStage=stage;ui.craftReached=stage===0?0:Math.max(ui.craftReached,stage);
    const scenes=[
      {label:'从一块白布开始',alt:'尚未绞扎的白色布面',text:'先点“绞扎”，把白布收紧。'},
      {label:'白布收紧，留住纹样',alt:'绞扎后收紧的白色布面',text:'扎紧的部分不易被染液浸透，展开后留下浅色纹样。接着点“浸染”。'},
      {label:'靛蓝慢慢染入布面',alt:'保持收紧、染成靛蓝的布面',text:'布面染上了靛蓝。点“拆线”，看蓝与白一起展开。'},
      {label:'你的蓝白纹样，展开了',alt:'展开的蓝白扎染灵感纹样',text:'拆开线结，蓝与白相间的纹样展开了。可以再染一次，或走进周城看真实作品。'}
    ];
    const scene=scenes[stage];$('craft-experience').dataset.craftStage=String(stage);$('craft-stage-label').textContent=scene.label;$('craft-visual').setAttribute('aria-label',scene.alt);$('craft-status').textContent=scene.text;$('craft-reset').hidden=stage===0;
    document.querySelectorAll('[data-craft-step]').forEach(b=>{const step=Number(b.dataset.craftStep);b.disabled=step>ui.craftReached+1;b.setAttribute('aria-pressed',String(step===stage));});
  }
  function selectEntrance(id){model.arrival(id);ui.chooseEntry=false;render();persist();location.hash='erhai';toast(`已从${entranceById[id].name}出发，原行程继续保留`);}
  function selectPlace(id){model.select(id);render();persist();}
  function setDestination(id){model.setDestination(id);render();persist();if(!state.entrance)toast('目的地已选好，再选择抵达入口查看游览方向');}
  function addStop(id){const added=model.toggle(id);render();persist();toast(`${byId[id].name}${added?'已加入行程':'已移出行程'}`);updateSceneButtons();return added;}
  function updateSceneButtons(){
    document.querySelectorAll('[data-add-stop]').forEach(b=>b.textContent=isStop(b.dataset.addStop)?'移出行程':b.closest('#scene-content')?'加入我的行程':'加入行程');
    document.querySelectorAll('[data-scene-destination]').forEach(b=>b.textContent=state.destination===b.dataset.sceneDestination?'当前目的地':'以这里为目的地');
  }
  function credit(photo){if(photo.remote)return `影像来源：${esc(photo.author)} · <a href="${photo.source}" target="_blank" rel="noopener noreferrer">查看原作</a> · 源站图片，版权归原作者；不随开源包分发`;if(photo.placeholder)return '原创扎染灵感纹样 · 实景照片待补充';return `摄影：${esc(photo.author)} · <a href="${photo.source}" target="_blank" rel="noopener noreferrer">原作</a> · ${photo.licenseUrl?`<a href="${photo.licenseUrl}" target="_blank" rel="noopener noreferrer">${esc(photo.license)}</a>`:esc(photo.license)}`;}
  function renderScene(id){
    const p=byId[id],photos=galleryFor(id),heroIndex=id==='zhoucheng'?Math.min(2,photos.length-1):0,hero=photos[heroIndex];stopGallery();
    $('scene-content').innerHTML=`<div class="scene-stage"><img referrerpolicy="no-referrer" class="scene-background" src="${hero.src}" ${hero.remote?'':`srcset="${hero.thumb} ${hero.thumbWidth||960}w, ${hero.src} ${hero.width||2400}w"`} sizes="(max-width:720px) 100vw, 1200px" alt="${esc(hero.caption)}" style="object-position:${hero.position||p.position}"><div class="scene-topbar"><span class="scene-location">大理 · ${regionName(p.region)} · ${p.name}</span><button class="scene-close" data-close="scene-dialog" aria-label="返回洱海地图">×</button></div><div class="scene-content"><span class="scene-kicker">${p.en}</span><h1 class="scene-art-title">${p.title.map(esc).join('<br>')}</h1><div class="scene-hero-footer"><span>${p.kicker}</span><button data-scroll-gallery>${photoCount(id)?'下滑看'+photoCount(id)+'张实景':'实景照片待补充'}</button></div></div><button class="hero-original" data-photo="${heroIndex}" aria-label="查看${p.name}主图完整画面">查看完整照片</button></div><section class="scene-gallery" id="scene-gallery" aria-label="${p.name}多视角实景相册"><div class="gallery-heading"><div><span class="eyebrow">换一个角度，看见这里</span><h2>${p.name} · ${p.placeholder?'照片待补充':'实景相册'}</h2></div><div class="gallery-controls"><button data-gallery-step="-1" aria-label="上一张实景">上一张</button><button data-gallery-autoplay aria-pressed="${ui.autoplay}">${ui.autoplay?'暂停轮播':'自动轮播'}</button><button data-gallery-step="1" aria-label="下一张实景">下一张</button></div></div><div class="gallery-track" id="gallery-track" tabindex="0" aria-label="横向滑动查看照片">${photos.map((photo,i)=>`<figure class="gallery-item"><button data-photo="${i}" aria-label="放大${p.name}第${i+1}张照片"><img referrerpolicy="no-referrer" src="${photo.thumb}" alt="${esc(photo.caption)}" loading="lazy" width="960" height="640"><span class="gallery-image-count">${i+1} / ${photos.length}</span>${photo.period==='night'?'<span class="gallery-night-badge">夜景</span>':''}<span class="gallery-expand">查看完整画面</span></button><figcaption><strong>${esc(photo.caption)}</strong><span>${credit(photo)}</span></figcaption></figure>`).join('')}</div><div class="gallery-dots" aria-label="选择照片">${photos.map((_,i)=>`<button data-gallery-index="${i}" aria-label="滚动到第${i+1}张" aria-pressed="${i===0}"></button>`).join('')}</div></section><section class="scene-details"><div><span class="eyebrow">${regionName(p.region)} · ${p.name}</span><h2>${p.kicker}</h2><p>${p.description}</p>${p.cultureSource?`<a class="scene-culture-source" href="${p.cultureSource}" target="_blank" rel="noopener noreferrer">白族扎染技艺 · 官方非遗介绍 ↗</a>`:''}<div class="scene-tags">${p.tags.map(t=>`<span>${t}</span>`).join('')}</div></div><div class="scene-practical"><h3>到这里，慢慢看</h3><p>${p.tip}</p><div class="scene-actions"><button class="scene-primary" data-add-stop="${p.id}">${isStop(id)?'移出行程':'加入我的行程'}</button><button data-scene-destination="${p.id}">${state.destination===id?'当前目的地':'以这里为目的地'}</button><button data-close="scene-dialog">回到地图</button></div><small>照片记录拍摄当时的景色，天气与季节会改变现场。</small></div></section>`;
    $('scene-dialog').scrollTop=0;bindGallery();
  }
  function stopGallery(){clearInterval(galleryTimer);galleryObserver?.disconnect();}
  function galleryIndex(){const track=$('gallery-track');return track?Math.round(track.scrollLeft/(track.querySelector('.gallery-item')?.getBoundingClientRect().width+18)):0;}
  function galleryTo(index){const track=$('gallery-track');if(!track)return;const count=galleryFor(ui.scene).length,i=(index+count)%count;const card=track.children[i];track.scrollTo({left:card.offsetLeft-track.children[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
  function bindGallery(){
    const track=$('gallery-track');let inView=false,interacting=false;
    galleryObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{root:sceneDialog,threshold:.25});galleryObserver.observe(track);
    track.addEventListener('scroll',()=>{const i=galleryIndex();document.querySelectorAll('[data-gallery-index]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));},{passive:true});
    track.addEventListener('pointerdown',()=>{ui.autoplay=false;document.querySelector('[data-gallery-autoplay]').textContent='自动轮播';document.querySelector('[data-gallery-autoplay]').setAttribute('aria-pressed','false');});
    track.addEventListener('mouseenter',()=>interacting=true);track.addEventListener('mouseleave',()=>interacting=false);
    galleryTimer=setInterval(()=>{if(ui.autoplay&&inView&&!interacting&&!document.hidden&&!$('photo-dialog').open&&!matchMedia('(prefers-reduced-motion:reduce)').matches)galleryTo(galleryIndex()+1);},5500);
  }
  function openScene(id){if(!byId[id])return;closeDialog('panorama-dialog');ui.scene=id;ui.autoplay=!matchMedia('(prefers-reduced-motion:reduce)').matches;model.select(id);render();persist();renderScene(id);if(!sceneDialog.open)sceneDialog.showModal();document.body.classList.add('dialog-open');}
  function openPhoto(index,context='scene'){ui.photoContext=context;ui.photo=index;renderPhoto();if(!$('photo-dialog').open)$('photo-dialog').showModal();document.body.classList.add('dialog-open');}
  function renderPhoto(){const photos=activePhotos(),p=photos[ui.photo];if(!p)return;$('photo-content').innerHTML=`<div class="lightbox-header"><span>${ui.photoContext==='night'?'洱海渔灯夜景':byId[ui.scene].name} · ${ui.photo+1}/${photos.length}</span><button data-close="photo-dialog" aria-label="关闭完整照片">×</button></div><div class="lightbox-stage"><button data-photo-step="-1" aria-label="上一张完整照片">‹</button><img referrerpolicy="no-referrer" src="${p.src}" alt="${esc(p.caption)}"><button data-photo-step="1" aria-label="下一张完整照片">›</button></div><div class="lightbox-caption"><strong>${esc(p.caption)}</strong><span>${credit(p)}</span></div>`;}
  function renderCredits(){
    $('credits-list').innerHTML=[window.DALI_OVERVIEW,...places.flatMap(p=>galleryFor(p.id).filter(photo=>!photo.placeholder).map(photo=>({...photo,name:p.name}))),...nightPhotos.filter(p=>p.newAsset).map(p=>({...p,name:'洱海渔灯 · '+p.title}))].map(p=>`<div class="credit-item"><strong>${esc(p.name)}</strong> · ${esc(p.author)}<br><a href="${p.source}" target="_blank" rel="noopener noreferrer">原作与拍摄信息</a> · ${p.licenseUrl?`<a href="${p.licenseUrl}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>`:esc(p.license)}</div>`).join('')+'<div class="credit-item">地图渔灯参考洱海夜间作业灯光，以光点模拟水上灯影；不表示实时灯光位置。</div><div class="credit-item"><strong>界面扎染布纹</strong> · 使用内置 imagegen 创作的原创靛蓝布面纹样；用于导航、按钮与照片边框。为扎染灵感装饰，不是传统纹样复刻或非遗实物照片。</div>';
  }
  function renderItinerary(){
    const ids=orderedStops();$('itinerary-content').innerHTML=`<button class="save-status" id="save-status" data-action="retry-save">${saveStatus}</button>${state.entrance?`<div class="itinerary-entry">出发 · ${entranceById[state.entrance].name}</div>`:'<p class="route-note">还未选择抵达入口</p>'}${ids.length?ids.map((id,index)=>{const p=byId[id];return `<div class="itinerary-item"><img referrerpolicy="no-referrer" src="${p.thumb||p.image}" alt="${p.name}"><span>${index+1}. ${p.name}<small>${id===state.destination?'目的地':regionName(p.region)+' · 停留点'}</small></span>${index>0&&id!==state.destination?`<button data-move-stop="${id}" aria-label="将${p.name}提前一站">提前</button>`:''}<button class="remove-stop" data-remove-stop="${id}" aria-label="从行程移除${p.name}">移除</button></div>`;}).join(''):'<p class="itinerary-empty">去地图上选一处风景，加入自己的旅程。</p>'}${ids.length?'<button class="itinerary-use" data-action="show-itinerary">在地图上查看行程</button><div class="itinerary-export"><button data-action="copy-itinerary">复制行程文字</button><button data-action="download-itinerary">下载行程</button></div>':''}<p class="itinerary-foot">停留点按加入顺序排列，目的地放在最后。行程自动保存到当前浏览器；连线表示沿岸方向，不是道路导航。</p>`;
  }
  function openItinerary(){renderItinerary();$('itinerary-dialog').showModal();document.body.classList.add('dialog-open');}
  function itineraryText(){return ['大理漫游 · 我的洱海行程',state.entrance?'出发：'+entranceById[state.entrance].name:'抵达入口：待选',...orderedStops().map((id,i)=>`${i+1}. ${byId[id].name}${id===state.destination?'（目的地）':''}\n   ${byId[id].tip}`),'路线为沿岸游览示意，实际道路、开放及停车情况以现场为准。',location.origin].join('\n\n');}
  function navigate(){const page=location.hash.startsWith('#erhai')?'erhai':'yunnan';$('yunnan-page').hidden=page!=='yunnan';$('erhai-page').hidden=page!=='erhai';document.querySelectorAll('[data-page-link]').forEach(a=>a.classList.toggle('active',a.dataset.pageLink===page));document.title=page==='erhai'?'洱海漫游 · 大理漫游':'大理漫游 · 从地图走进风景';if(location.hash==='#erhai-culture')requestAnimationFrame(()=>$('erhai-culture').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'}));}
  function closeDialog(id){const d=$(id);if(d?.open)d.close();}
  async function performAction(action){
    if(action==='change-entry'){ui.chooseEntry=!ui.chooseEntry;renderControls();}
    if(action==='clear-destination'){state.destination=null;render();persist();updateSceneButtons();}
    if(action==='lantern-mode')openLanternMode();
    if(action==='panorama')openPanorama();
    if(action==='motion'){ui.motion=!ui.motion;renderControls();document.querySelectorAll('.lantern-layer,.wind-layer').forEach(n=>n.classList.toggle('motion-paused',!ui.motion));const b=document.querySelector('#lantern-dialog [data-action=motion]');if(b){b.textContent=ui.motion?'暂停灯影与水波':'继续灯影与水波';b.setAttribute('aria-pressed',String(ui.motion));}}
    if(action==='retry-save'){if(saveStatus.startsWith('读取失败'))await hydrate();else persist();}
    if(action==='show-itinerary'){closeDialog('itinerary-dialog');if(!state.entrance){ui.chooseEntry=true;renderControls();toast('先选择入口，就能显示行程方向');}else{ui.zoom=1;ui.center=[400,405];renderMap();$('lake-map').scrollIntoView({behavior:'smooth',block:'center'});}}
    if(action==='copy-itinerary'){try{await navigator.clipboard.writeText(itineraryText());toast('行程文字已复制');}catch{toast('复制未完成，可以点击下载行程');}}
    if(action==='download-itinerary'){const url=URL.createObjectURL(new Blob([itineraryText()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='大理漫游-我的行程.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  let ignoreClickUntil=0;
  document.addEventListener('click',event=>{
    if(Date.now()<ignoreClickUntil&&event.target.closest('#lake-map'))return;
    const el=event.target.closest('[data-entrance],[data-place],[data-scene],[data-region],[data-action],[data-add-stop],[data-set-destination],[data-scene-destination],[data-close],[data-zoom],[data-remove-stop],[data-move-stop],[data-photo],[data-night-photo],[data-photo-step],[data-gallery-step],[data-gallery-index],[data-gallery-autoplay],[data-scroll-gallery]');if(!el)return;const d=el.dataset;
    if(d.entrance)selectEntrance(d.entrance);if(d.place)selectPlace(d.place);if(d.scene)openScene(d.scene);
    if(d.region){model.region(d.region);render();persist();}
    if(d.action)performAction(d.action);if(d.addStop)addStop(d.addStop);if(d.setDestination)setDestination(d.setDestination);
    if(d.sceneDestination){setDestination(d.sceneDestination);closeDialog('scene-dialog');}
    if(d.close)closeDialog(d.close);
    if(d.zoom){
      if(d.zoom==='reset'){ui.zoom=1;ui.center=[400,405];}
      else if(d.zoom==='locate'){const place=byId[state.selected]||entranceById[state.entrance];if(place){ui.center=project(place.coords);ui.zoom=1.6;}else toast('先点击一个地点，再定位');}
      else ui.zoom=Math.min(2,Math.max(1,ui.zoom+(d.zoom==='in'?.25:-.25)));
      renderMap();
    }
    if(d.removeStop){model.remove(d.removeStop);render();renderItinerary();persist();}
    if(d.moveStop){const i=state.itinerary.indexOf(d.moveStop);if(i>0)[state.itinerary[i-1],state.itinerary[i]]=[state.itinerary[i],state.itinerary[i-1]];render();renderItinerary();persist();}
    if(d.photo!==undefined)openPhoto(Number(d.photo));
    if(d.nightPhoto!==undefined)openPhoto(Number(d.nightPhoto),'night');
    if(d.photoStep){const count=activePhotos().length;ui.photo=(ui.photo+Number(d.photoStep)+count)%count;renderPhoto();}
    if(d.galleryStep)galleryTo(galleryIndex()+Number(d.galleryStep));if(d.galleryIndex!==undefined)galleryTo(Number(d.galleryIndex));
    if('galleryAutoplay' in d){ui.autoplay=!ui.autoplay;el.textContent=ui.autoplay?'暂停轮播':'自动轮播';el.setAttribute('aria-pressed',String(ui.autoplay));}
    if('scrollGallery' in d)$('scene-gallery').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  });
  let drag;
  $('lake-map').addEventListener('pointerdown',event=>{if(event.button!==0||!event.target.closest('#lake-svg'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,center:[...ui.center],moved:false,svg:$('lake-svg')};});
  $('lake-map').addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;
    if(!drag.moved){drag.svg.setPointerCapture(event.pointerId);drag.moved=true;}event.preventDefault();
    const matrix=drag.svg.getScreenCTM();const scaleX=matrix?.a||1,scaleY=matrix?.d||1;
    ui.center=[Math.min(680,Math.max(160,drag.center[0]-dx/scaleX)),Math.min(760,Math.max(120,drag.center[1]-dy/scaleY))];
    drag.svg.setAttribute('viewBox',`${ui.center[0]-285/ui.zoom} ${ui.center[1]-335/ui.zoom} ${570/ui.zoom} ${670/ui.zoom}`);
  });
  function endDrag(event){if(!drag||event.pointerId!==drag.id)return;if(drag.moved){ignoreClickUntil=Date.now()+250;if(drag.svg.hasPointerCapture(event.pointerId))drag.svg.releasePointerCapture(event.pointerId);}drag=null;}
  $('lake-map').addEventListener('pointerup',endDrag);$('lake-map').addEventListener('pointercancel',endDrag);
  document.addEventListener('keydown',event=>{
    const button=event.target.closest('g[role="button"]');if(button&&(event.key==='Enter'||event.key===' ')){event.preventDefault();button.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
    if($('photo-dialog').open&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){const count=activePhotos().length;ui.photo=(ui.photo+(event.key==='ArrowRight'?1:-1)+count)%count;renderPhoto();}
    if(event.target.id==='gallery-track'&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();ui.autoplay=false;const b=document.querySelector('[data-gallery-autoplay]');if(b){b.textContent='自动轮播';b.setAttribute('aria-pressed','false');}galleryTo(galleryIndex()+(event.key==='ArrowRight'?1:-1));}
  });
  $('dali-card').addEventListener('click',()=>location.hash='erhai');$('province-map').addEventListener('click',e=>{if(e.target.closest('#dali-star'))location.hash='erhai';});
  $('itinerary-toggle').addEventListener('click',openItinerary);$('credits-button').addEventListener('click',()=>{renderCredits();$('credits-dialog').showModal();document.body.classList.add('dialog-open');});
  $('craft-experience').addEventListener('click',event=>{const button=event.target.closest('[data-craft-step]');if(button&&!button.disabled)renderCraft(Number(button.dataset.craftStep));});
  $('craft-reset').addEventListener('click',()=>{renderCraft(0);document.querySelector('[data-craft-step="1"]').focus();});
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{if(dialog===sceneDialog)stopGallery();if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');});
  window.addEventListener('hashchange',()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();navigate();});
  document.addEventListener('error',event=>{
    const img=event.target;if(!(img instanceof HTMLImageElement)||img.dataset.fallback)return;
    img.dataset.fallback='true';img.removeAttribute('srcset');img.src='assets/erhai.jpg';img.alt='原照片暂时无法加载，显示洱海全景参考图';
    const note=document.createElement('span');note.className='image-load-note';note.textContent='原图暂时无法加载 · 此处为洱海全景参考';img.insertAdjacentElement('afterend',note);
  },true);
  renderProvince();render();navigate();hydrate();
  const publicState=()=>({...model.snapshot(),stops:orderedStops(),saveStatus});
  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();
    const tools=[
      {name:'read_dali_journey',title:'查看大理漫游行程',description:'Read the arrival entrance, region, selected destination, ordered stops, and save status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({state:publicState(),places:places.map(p=>({id:p.id,name:p.name,region:p.region})),entrances:entrances.map(e=>({id:e.id,name:e.name}))})},
      {name:'select_dali_arrival',title:'选择洱海抵达入口',description:'Change the arrival entrance while preserving the itinerary. The private browser-local journey is saved automatically.',inputSchema:{type:'object',properties:{entranceId:{type:'string',enum:entrances.map(e=>e.id)}},required:['entranceId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!entranceById[input.entranceId])throw new Error('Invalid entranceId');selectEntrance(input.entranceId);return publicState();}},
      {name:'select_dali_destination',title:'选择大理景点目的地',description:'Set a scenic place as the destination and save the itinerary in this browser; lines show shoreline directions, not realtime road navigation.',inputSchema:{type:'object',properties:{placeId:{type:'string',enum:places.map(p=>p.id)}},required:['placeId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!byId[input.placeId])throw new Error('Invalid placeId');setDestination(input.placeId);location.hash='erhai';return publicState();}},
      {name:'add_dali_stop',title:'加入洱海行程停留点',description:'Add a stop and save the itinerary in this browser. Adding an existing stop is idempotent; no reservation or external navigation is made.',inputSchema:{type:'object',properties:{placeId:{type:'string',enum:places.map(p=>p.id)}},required:['placeId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!byId[input.placeId])throw new Error('Invalid placeId');if(!isStop(input.placeId))addStop(input.placeId);return publicState();}}
    ];
    for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
