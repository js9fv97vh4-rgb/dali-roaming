/* A single timeline directs the shared 3D camera, real photographs and story. */
window.createDaliRoaming = config => {
  const dialog=document.getElementById('tour-dialog'), byId=Object.fromEntries(window.DALI_PLACES.map(p=>[p.id,p]));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let route,position=0,playing=false,frame=0,lastTime=0,current=-1,period='',finished=false,photoKey='',photoRequest=0,manualPhoto=null;
  const $=selector=>dialog.querySelector(selector);
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function resolve(id){
    if(id==='mine'){
      const ids=config.getStops();
      if(ids.length)return {id:'mine',name:'这一程，由你来写',en:'YOUR OWN JOURNEY',plan:'按我的行程顺序',stops:ids.map((id,i)=>({id,line:byId[id].kicker,period:i===ids.length-1?'dusk':'day',photo:0}))};
    }
    return window.DALI_TOURS.find(r=>r.id===id)||window.DALI_TOURS[0];
  }
  function open(id='shore',step=0){
    const next=resolve(id);
    if(dialog.open&&route?.id===next.id){seek(step>0?step+.27:0);return;}
    stop();route=next;current=-1;photoKey='';period='';position=Math.max(0,Math.min(route.stops.length,step>0?step+.27:0));finished=false;
    dialog.innerHTML=`<div class="tour-shell"><header class="tour-header"><div><span>YUNNAN ROAMING / 一镜漫游</span><h2 id="tour-title">${escape(route.name)}</h2></div><button data-tour-close aria-label="退出一镜漫游">返回地图 <b>×</b></button></header><div class="tour-stage"><div class="tour-map" id="tour-map"><div class="tour-map-fallback">正在展开山海…</div></div><figure class="tour-window"><img id="tour-photo-back" referrerpolicy="no-referrer" alt="" aria-hidden="true"><img id="tour-photo" referrerpolicy="no-referrer" alt=""><div class="tour-photo-controls"><button data-photo-prev aria-label="上一张实景照片">←</button><span id="tour-photo-count"></span><button data-photo-next aria-label="下一张实景照片">→</button><button data-photo-auto hidden aria-label="恢复照片自动切换">自动换图</button></div><div class="tour-window-shade"></div><div class="tour-location"><span id="tour-number"></span><span id="tour-period"></span></div><figcaption><span id="tour-en"></span><h3 id="tour-place"></h3><p id="tour-line"></p><p id="tour-photo-caption"></p><div class="tour-stop-actions"><button data-tour-album>走进实景 ↗</button><button data-tour-save></button></div><details class="tour-credit"><summary>这张照片的来源</summary><div id="tour-credit"></div></details></figcaption></figure></div><footer class="tour-timeline"><div class="tour-playbar"><button class="tour-play" data-tour-play></button><label class="tour-scrubber"><span class="sr-only">漫游进度</span><input type="range" min="0" max="${route.stops.length}" step="0.001" value="${position}" aria-label="漫游进度"></label><span class="tour-time"></span><button data-tour-route>收藏整段旅程 ＋</button></div><nav class="tour-stops" aria-label="跳转漫游站点">${route.stops.map((s,i)=>`<button data-tour-step="${i}" aria-current="false"><span>${String(i+1).padStart(2,'0')}</span>${escape(byId[s.id].name)}</button>`).join('')}</nav><p class="tour-note">${escape(route.plan)} · 实景为不同时刻的照片，光线为艺术化演绎 · 连线为叙事顺序，非道路导航</p><p class="tour-announcement sr-only" role="status" aria-live="polite"></p></footer></div>`;
    dialog.showModal();document.body.classList.add('dialog-open');
    attachMap();draw();setPlaying(!reduced.matches&&position<route.stops.length);
  }
  function attachMap(){
    if(!dialog.open)return;
    const map=config.getMap();
    if(map){map.mount(document.getElementById('tour-map'),'tour');draw();}
    else document.getElementById('tour-map').innerHTML='<div class="tour-map-fallback"><span>沿着湖岸，走进风景</span><strong>实景漫游</strong><p>当前使用照片模式；立体山海就绪后会自动接入。</p></div>';
  }
  function syncSave(){const button=$('[data-tour-save]');if(button&&route)button.textContent=config.isStop(route.stops[current]?.id)?'已在行程中 ✓':'留在我的行程 ＋';}
  function draw(){
    if(!dialog.open||!route)return;
    const sample=sampleDaliTour(route.stops,position),{index,progress,stop:station}=sample,p=byId[station.id];
    if(index!==current){
      current=index;manualPhoto=null;
      $('#tour-photo').style.opacity='0';$('#tour-photo-back').style.opacity='0';
      $('#tour-photo-caption').textContent='正在载入这站实景…';$('#tour-credit').textContent='';$('#tour-photo-count').textContent='载入中';
      $('#tour-number').textContent=`${String(index+1).padStart(2,'0')} / ${String(route.stops.length).padStart(2,'0')}`;
      $('#tour-period').textContent=station.period==='dusk'?'暮色 · 山海演绎':'日光 · 山海演绎';
      $('#tour-en').textContent=p.en;$('#tour-place').textContent=p.name;$('#tour-line').textContent=station.line;

      $('.tour-announcement').textContent=`第${index+1}站，${p.name}。${station.line}`;
      dialog.querySelectorAll('[data-tour-step]').forEach((b,i)=>b.setAttribute('aria-current',i===index?'step':'false'));
      config.onPosition(route.id,index);syncSave();
    }
    const photos=config.gallery(p.id),shot=sampleDaliTourPhoto(photos,station.photo,progress,station.photos);
    const nextShot=sampleDaliTourPhoto(photos,station.photo,Math.min(1,(shot.beat+1.01)/shot.count),station.photos);
    const photoIndex=manualPhoto??shot.index;
    $('[data-photo-auto]').hidden=manualPhoto===null;
    showPhoto(photos[photoIndex],p,`${index}:${photoIndex}`,photoIndex,photos.length,photos[manualPhoto===null?nextShot.index:(photoIndex+1)%photos.length]);
    const map=config.getMap();
    if(map){
      if(period!==station.period){period=station.period;map.setAtmosphere(period);}
      const previous=byId[route.stops[Math.max(0,index-1)].id];
      map.tourPose(previous.coords,p.coords,progress,index,p.id);
    }
    $('#tour-photo').style.transform=reduced.matches||manualPhoto!==null?'none':`scale(${1+(progress*shot.count%1)*.045})`;
    $('input').value=position;
    $('input').setAttribute('aria-valuetext',`第 ${index+1} 站，${p.name}`);
    $('.tour-time').textContent=`${String(Math.floor(position*15)).padStart(2,'0')} / ${route.stops.length*15} 秒`;
    if(sample.ended&&!finished){finished=true;setPlaying(false);$('.tour-announcement').textContent='这一程已走完。可以收藏整段旅程，或重新出发。';}
    else if(!sample.ended&&finished){finished=false;$('.tour-announcement').textContent=`第${index+1}站，${p.name}。${station.line}`;}
  }
  function showPhoto(photo,p,key,index,count,nextPhoto){
    if(photoKey===key)return;photoKey=key;
    const request=++photoRequest,preload=new Image();preload.referrerPolicy='no-referrer';
    const commit=()=>{
      if(request!==photoRequest||!dialog.open)return;
      const image=$('#tour-photo'),back=$('#tour-photo-back');
      back.src=image.dataset.place===p.id?(image.currentSrc||image.src):photo.src;back.style.objectPosition=image.dataset.place===p.id?image.style.objectPosition:(photo.position||p.position||'center');image.dataset.place=p.id;
      image.style.opacity='1';back.style.opacity='1';
      $('#tour-photo-count').textContent=`${index+1} / ${count} 实景`;
      delete image.dataset.fallback;dialog.querySelectorAll('.image-load-note').forEach(n=>n.remove());
      image.src=photo.src;image.alt=photo.caption;image.style.objectPosition=photo.position||p.position||'center';
      if(!reduced.matches)image.animate([{opacity:0},{opacity:1}],{duration:700,easing:'ease-out'});
      $('#tour-credit').innerHTML=config.credit(photo);$('#tour-photo-caption').textContent=photo.caption;
    };
    preload.onload=commit;
    preload.onerror=()=>{if(request!==photoRequest)return;commit();};
    preload.src=photo.src;
    // Only preload the next image; never fetch the whole album at once.
    const photos=config.gallery(p.id),next=new Image();next.referrerPolicy='no-referrer';next.src=(nextPhoto||photos[(index+1)%photos.length]).src;
  }
  function tick(time){
    if(!playing||!dialog.open)return;
    if(lastTime&&!document.hidden)position=Math.min(route.stops.length,position+Math.min(.15,(time-lastTime)/1000)/15);
    lastTime=time;draw();if(playing)frame=requestAnimationFrame(tick);
  }
  function setPlaying(value){
    cancelAnimationFrame(frame);playing=value;lastTime=0;
    const button=$('[data-tour-play]');if(button){button.textContent=finished?'↻ 再走一遍':playing?'Ⅱ 暂停':'▶ 继续';button.setAttribute('aria-label',finished?'重新播放漫游':playing?'暂停漫游':'继续漫游');}
    if(playing)frame=requestAnimationFrame(tick);
  }
  function seek(value){manualPhoto=null;position=Number(value)||0;draw();setPlaying(playing);}
  function stop(){photoRequest++;playing=false;cancelAnimationFrame(frame);lastTime=0;}
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!route)return;
    if(button.hasAttribute('data-tour-close'))config.close();
    if(button.hasAttribute('data-photo-prev')||button.hasAttribute('data-photo-next')){
      const station=route.stops[current],p=byId[station.id],photos=config.gallery(p.id);
      const old=Number(photoKey.split(':')[1])||0,index=(old+(button.hasAttribute('data-photo-next')?1:-1)+photos.length)%photos.length;
      manualPhoto=index;draw();
    }
    if(button.hasAttribute('data-photo-auto')){manualPhoto=null;draw();}
    if(button.hasAttribute('data-tour-play')){if(finished){position=0;finished=false;draw();}setPlaying(!playing);}
    if(button.dataset.tourStep!==undefined)seek(Number(button.dataset.tourStep)+.27);
    if(button.hasAttribute('data-tour-save')){config.addStop(route.stops[current].id);syncSave();}
    if(button.hasAttribute('data-tour-album')){setPlaying(false);config.openScene(route.stops[current].id);}
    if(button.hasAttribute('data-tour-route')){config.saveRoute(route.stops.map(s=>s.id));button.textContent='整段旅程已收藏 ✓';}
  });
  dialog.addEventListener('input',event=>{if(event.target.matches('input[type=range]'))seek(event.target.value);});
  dialog.addEventListener('close',stop);
  document.addEventListener('visibilitychange',()=>{lastTime=0;});
  reduced.addEventListener('change',()=>{if(reduced.matches)setPlaying(false);});
  return {open,attachMap,stop,syncSave};
};
