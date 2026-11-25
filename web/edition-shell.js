/* Load each destination on first use. All resources are local classic scripts. */
(() => {
  const $ = id => document.getElementById(id);
  const loaded = new Map();
  const readyCities=new Set();
  const pendingGroups = new Map();
  const places = {erhai:() => window.DALI_PLACES, lijiang:() => window.LIJIANG_DATA?.places, kunming:() => window.KUNMING_DATA?.places};
  const names = {erhai:'大理', lijiang:'丽江', kunming:'昆明'};
  const cityStyles = {
    erhai:['upgrade','heritage','map3d','immersion','roaming','atlas-theme'],
    lijiang:['lijiang','paper-map','atlas-theme'], kunming:['atlas-theme','kunming']
  };
  const styleOrder = ['upgrade','heritage','map3d','immersion','landing','roaming','lijiang','paper-map','atlas-theme','kunming'];
  function resource(name,css=false) {
    const file = name + (css ? '.css' : '.js');
    if(loaded.has(file)) return loaded.get(file);
    const promise = new Promise((resolve,reject) => {
      const el = document.createElement(css?'link':'script');
      if(css){el.rel='stylesheet';el.href=file;el.dataset.cityStyle=name;}
      else {el.src=file;el.async=false;}
      el.onload=()=>{
        if(css){el.dataset.ready='';el.media=cityStyles[currentPage()]?.includes(name)?'all':'not all';}
        resolve();
      };
      el.onerror=()=>{loaded.delete(file);el.remove();reject(new Error(file));};
      if(css){
        const after=[...document.querySelectorAll('[data-city-style]')].find(node=>styleOrder.indexOf(node.dataset.cityStyle)>styleOrder.indexOf(name));
        (after || $('edition-style')).before(el);
      }else document.head.append(el);
    });
    loaded.set(file,promise);return promise;
  }
  function group(key,names) {
    if(!pendingGroups.has(key))pendingGroups.set(key,Promise.all(names.map(name=>resource(name))).catch(error=>{pendingGroups.delete(key);throw error;}));
    return pendingGroups.get(key);
  }
  const home=async()=>{
    await group('atlas',['map-data','prefecture-data','paper-map','province-viewport','province-atlas']);
    if(!$('province-map').firstElementChild)window.createProvinceAtlas(window.DALI_MAP,window.DALI_PREFECTURES);
  };
  async function city(page) {
    const styles=Promise.all(cityStyles[page].map(name=>resource(name,true)));
    if(page==='erhai'){
      await group('lake-data',['map-data','places','journey-core','gallery-data','photo-loader','lantern-data','town-story','image-credit','roaming-data','roaming','atlas-loading']);
      await resource('app');
    }else{
      await Promise.all([styles,group(page+'-data',[page+'-data','image-credit','paper-map','photo-loader'])]);
      await resource(page);
      if(page==='lijiang')await resource('lijiang-walk');
    }
    await styles;readyCities.add(page);
  }
  function currentPage(){
    const base=location.hash.slice(1).split('?')[0];
    return base.startsWith('erhai')||base==='tour-collection'?'erhai':names[base]?base:'yunnan';
  }
  // Keep the selection visible until the full preview comes into view.
  let dismissReceipt = () => {};
  window.showMapReceipt = (pin, map, action, name, shot) => {
    dismissReceipt();
    if(!map || !action || !pin)return;
    const box=document.createElement('aside');
    box.className='map-receipt';box.hidden=true;box.setAttribute('aria-label','地图选点');
    const image=document.createElement('img');image.alt='';image.src=shot.thumb||shot.src;
    image.addEventListener('error',()=>image.hidden=true,{once:true});
    const read=document.createElement('button');read.type='button';read.className='receipt-read';
    const title=document.createElement('strong');title.textContent=name;
    const detail=document.createElement('span');detail.textContent=shot.mediaType==='ai'?'AI生成 · 艺术演绎 ↗':'走近影像 ↗';
    read.setAttribute('aria-label','走近'+name+'的影像');read.append(image,title,detail);
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','收起选点提示');
    box.append(read,close);document.body.append(box);
    const controller=new AbortController(), options={passive:true,signal:controller.signal};
    let frame=0;
    function update(){
      frame=0;const p=pin.getBoundingClientRect(),r=map.getBoundingClientRect(),a=action.getBoundingClientRect();
      const top=document.querySelector('.site-header').getBoundingClientRect().bottom;
      const safe=Math.max(0,top)+8,h=innerHeight;
      box.hidden=!pin.isConnected||map.closest('[hidden]')!==null||!!document.querySelector('dialog[open]')||
        r.bottom<safe+48||r.top>h-48||(a.height>0&&a.top>=safe&&a.bottom<=h);
      box.classList.toggle('at-top',p.bottom>h-96);box.style.setProperty('--receipt-top',safe+'px');
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(update);}
    dismissReceipt=()=>{controller.abort();cancelAnimationFrame(frame);box.remove();dismissReceipt=()=>{};};
    read.onclick=()=>{dismissReceipt();action.click();};
    close.onclick=()=>{dismissReceipt();pin.focus({preventScroll:true});};
    window.addEventListener('scroll',schedule,{...options,capture:true});
    window.addEventListener('resize',schedule,options);
    window.addEventListener('hashchange',()=>dismissReceipt(),{once:true,signal:controller.signal});
    document.addEventListener('click',e=>{if(!box.contains(e.target)&&!pin.contains(e.target))dismissReceipt();},{capture:true,signal:controller.signal});
    schedule();
  };

  let serial=0;
  async function navigate(){
    const token=++serial,page=currentPage();
    const changed=document.body.dataset.page!==page;
    if(changed&&document.body.dataset.page==='erhai')window.leaveLakeView?.();
    for(const link of document.querySelectorAll('[data-city-style][data-ready]')){
      link.media=cityStyles[page]?.includes(link.dataset.cityStyle)?'all':'not all';
    }
    document.body.dataset.page=page;
    for(const id of ['yunnan',...Object.keys(names)])$(id+'-page').hidden=id!==page;
    document.querySelectorAll('[data-page-link]').forEach(a=>{const current=a.dataset.pageLink===page;a.classList.toggle('active',current);if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=(names[page]||'云南地图')+' · 云南漫游';
    const query=new URLSearchParams(location.hash.split('?')[1]);
    const credits=query.get('view')==='credits',savedOpen=query.get('saved')==='1';
    const v=DaliViews.parse(location.hash);
    for(const d of document.querySelectorAll('dialog[open]')){
      if(d.id==='saved-dialog'){if(!savedOpen)d.close();continue;}
      if( (d.id==='credits-dialog'&&!credits) || (page!=='lijiang'||v.modal!=='lijiang-photo')&&d.id==='lj-photo-dialog' || (page!=='lijiang'||v.modal!=='lijiang-walk')&&d.id==='lj-walk-dialog' || (page!=='kunming'||v.modal!=='kunming-photo')&&d.id==='km-photo-dialog' || page!=='erhai'&&!['credits-dialog','lj-photo-dialog','lj-walk-dialog','km-photo-dialog'].includes(d.id))d.close();
    }
    if(changed)window.scrollTo({top:0,behavior:'instant'});
    try {
      if(page==='yunnan')await home();else if(!readyCities.has(page))await city(page);
      if(credits){await group('credit-data',['places','gallery-data','lantern-data','lijiang-data','kunming-data','image-credit']);await resource('credits');}
      if(token!==serial)return;
      if(page==='erhai')window.syncDaliView?.();
      else{
        const parsed=DaliViews.parse(location.hash);
        if(parsed.imageUpdated){history.replaceState(history.state,'',DaliViews.format(parsed));notify('这张图片已更新，已返回对应景点。');}
        window.dispatchEvent(new Event('destinationchange'));
      }
      if(credits){window.showMediaCredits();if(!$('credits-dialog').open)$('credits-dialog').showModal();}
      if(savedOpen)await showSaved();
      document.body.classList.toggle('dialog-open',!!document.querySelector('dialog[open]'));
      $('edition-retry').hidden=true;
    }catch(error){if(token===serial){$('edition-retry').hidden=false;console.error('页面资源载入失败',error);}}
  }
  function notify(message){const el=$('edition-status');el.textContent=message;el.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.hidden=true,3500);}
  $('edition-retry').onclick=navigate;
  $('credits-button').onclick=()=>{const url=new URL(location.href);const [base,query='']=location.hash.split('?');const p=new URLSearchParams(query);p.set('view','credits');url.hash=(base||'#yunnan')+'?'+p;history.pushState({creditsFrom:location.hash||'#yunnan'},'',url);navigate();};
  function closeCredits(e){e.preventDefault();if(history.state?.creditsFrom){history.back();return;}const url=new URL(location.href);const [base,q]=url.hash.split('?');const p=new URLSearchParams(q);p.delete('view');url.hash=base+(p.size?'?'+p:'');history.replaceState(null,'',url);navigate();}
  $('credits-dialog').addEventListener('cancel',closeCredits);
  $('credits-dialog').querySelector('[data-close]').addEventListener('click',closeCredits);
  document.querySelector('.skip-link').onclick=e=>{e.preventDefault();$('main').tabIndex=-1;$('main').focus();};
  const {get:saved,toggle}=TravelSaved;
  window.addEventListener('savedchange',e=>{
    if(!e.detail.persistent)notify('本次收藏已更新，浏览器暂时无法保存。');
    if($('saved-dialog').open)fillSaved();
  });
  function fillSaved(){
    const list=$('saved-list');list.replaceChildren();
    for(const [city,get] of Object.entries(places)){
      const items=(get()||[]).filter(p=>saved(city).has(p.id));if(!items.length)continue;
      const title=document.createElement('h3');title.textContent=names[city];list.append(title);
      for(const p of items){
        const row=document.createElement('div');row.className='saved-item';const link=document.createElement('a');link.textContent=p.name+' ↗';link.href='#'+city+'?'+(city==='erhai'?'scene':'spot')+'='+p.id;
        link.onclick=()=>{
          $('saved-dialog').close();
          if(city==='lijiang'||city==='kunming')requestAnimationFrame(()=>{
            const active=DaliViews.parse(location.hash),story=$(city==='lijiang'?'lj-story':'km-story');
            if(active.spot===p.id&&story&&!story.hidden){story.scrollIntoView({block:'start'});story.querySelector('[tabindex="-1"]')?.focus({preventScroll:true});}
          });
        };
        const b=document.createElement('button');b.textContent='移除';b.setAttribute('aria-label','移除'+p.name+'的收藏');b.onclick=()=>{toggle(city,p.id);(list.querySelector('button')||$('saved-close')).focus();};row.append(link,b);list.append(row);
      }
    }
    if(!list.childElementCount)list.textContent='还没有收藏。在景点详情点「收藏」，就能在这里找回来。';
  }
  async function showSaved(){
    if(!$('saved-dialog').open){$('saved-list').textContent='正在读取收藏…';$('saved-dialog').showModal();}
    try{await Promise.all(Object.keys(places).filter(city=>saved(city).size&&!places[city]()).map(city=>resource(city==='erhai'?'places':city+'-data')));fillSaved();}catch{$('saved-list').textContent='收藏暂时无法读取，请关闭后重试。';}
  };
  document.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');},true);
  // Only single-finger horizontal swipes change a frame. Pinch and vertical scroll stay native.
  const galleries={'lj-photo-dialog':'[data-lj-photo-step]','km-photo-dialog':'[data-km-step]','photo-dialog':'[data-photo-step]'};
  for(const [id,selector] of Object.entries(galleries)){
    let start=null;const dialog=$(id);
    dialog.addEventListener('touchstart',event=>{start=event.touches.length===1?[event.touches[0].clientX,event.touches[0].clientY]:null;},{passive:true});
    dialog.addEventListener('touchcancel',()=>{start=null;},{passive:true});
    dialog.addEventListener('touchend',event=>{
      if(!start||event.touches.length)return;
      const dx=event.changedTouches[0].clientX-start[0],dy=event.changedTouches[0].clientY-start[1];start=null;
      if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.6)dialog.querySelector(selector.replace(']', '="'+(dx<0?'1':'-1')+'"]'))?.click();
    },{passive:true});
  }
  function closeSaved(event){
    event?.preventDefault();
    if(history.state?.savedOverlay){history.back();return;}
    const [base,query='']=location.hash.split('?'),params=new URLSearchParams(query);
    params.delete('saved');history.replaceState(history.state,'',base+(params.size?'?'+params:''));navigate();
  }
  $('saved-button').onclick=()=>{
    const [base,query='']=(location.hash||'#yunnan').split('?'),params=new URLSearchParams(query);
    if(params.get('saved')==='1')return;
    params.set('saved','1');history.pushState({...history.state,savedOverlay:true},'',base+'?'+params);navigate();
  };
  $('saved-close').onclick=closeSaved;
  $('saved-dialog').addEventListener('cancel',closeSaved);
  $('saved-dialog').addEventListener('click',e=>{
    if(e.target!==e.currentTarget)return;
    const b=e.currentTarget.getBoundingClientRect();
    if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeSaved(e);
  });
  window.addEventListener('hashchange',navigate);
  window.addEventListener('popstate',navigate);
  navigate();
})();
