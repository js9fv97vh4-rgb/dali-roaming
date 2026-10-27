/* Lijiang uses a local illustrated SVG atlas and the existing destination navigation. */
(() => {
  const {places,groups}=window.LIJIANG_DATA, byId=Object.fromEntries(places.map(p=>[p.id,p])), $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageKey='yunnan-lijiang-saved-v1';
  let saved=new Set(),saveMessage='',filter='all',selected='baisha',chapter=0,lakes=null,initialized=false,lastPage='',lastSpot='',photoOpener=null,mapReturn=null;
  try{const ids=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(ids))saved=new Set(ids.filter(id=>byId[id]));}catch{saveMessage='暂时无法读取收藏，本次选择仍可使用。';}
  const order=p=>p.galleryOrder||p.photos.map((_,i)=>i);
  const cover=p=>p.photos[p.cover??order(p)[0]];
  const portrait=p=>p.height>p.width?' is-portrait':'';
  const groupName=id=>groups.find(g=>g.id===id)?.name||'';
  const scroll=id=>$(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  const credit=p=>`${esc(p.author)} · ${esc(p.date)} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">原作</a> · ${p.licenseUrl?`<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>`:esc(p.license)}`;
  const photo=(p,thumb=false)=>`<img data-photo-managed="true" data-lj-image src="${esc(thumb?p.thumb:p.src)}" alt="${esc(p.caption)}" ${p.position?`style="object-position:${esc(p.position)}"`:""} ${p.width?`width="${p.width}" height="${p.height}"`:''} loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  function go(view,replace=false){
    const hash=DaliViews.format({page:'lijiang',...view});
    if(hash!==location.hash){const state={...history.state,lijiangPhoto:view.frame!==undefined,ljReading:view.frame!==undefined&&!!history.state?.ljReading,ljMapReturn:mapReturn};if(replace)history.replaceState(state,'',hash);else history.pushState(state,'',hash);}
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  function initialize(){
    if(initialized)return;initialized=true;
    $('lj-routes').innerHTML=groups.map(g=>`<button class="lj-route" data-lj-filter="${g.id}" aria-pressed="false"><small>${g.english}</small><strong>${g.name} ↗</strong><span>${g.subtitle}</span></button>`).join('');
    $('lj-sources').innerHTML=places.map(p=>`<div><strong>${esc(p.name)}</strong>${p.photos.map(img=>`<p>${esc(img.caption)} · ${credit(img)}</p>`).join('')}<a href="${p.coordinateSource}" target="_blank" rel="noopener noreferrer">查看地图点位来源</a></div>`).join('');
    renderDirectory();renderStory();renderAtlas();loadLakes();
  }
  function renderDirectory(){
    const filters=[['all','全部风景'],...groups.map(g=>[g.id,g.name]),['saved',`我的收藏 · ${saved.size}`]];
    $('lj-filters').innerHTML=filters.map(([id,name])=>`<button data-lj-filter="${id}" aria-pressed="${id===filter}">${name}</button>`).join('');
    document.querySelectorAll('#lj-routes [data-lj-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ljFilter===filter)));
    $('lj-nav-count').textContent=saved.size;
    const list=places.filter(p=>filter==='all'||(filter==='saved'?saved.has(p.id):p.group===filter));
    $('lj-directory-status').textContent=saveMessage||`${list.length} 处风景 · ${saved.size} 处已收藏`;
    $('lj-directory').innerHTML=list.length?list.map(p=>`<article class="lj-place-card ${p.id===selected?'active':''}"><button data-lj-spot="${p.id}" data-lj-scroll="story" aria-label="走进${p.name}"><div class="lj-card-image">${photo(cover(p),true)}<span>${groupName(p.group)}${p.area!=='core'?' · 独立行程':''}</span></div><div class="lj-card-copy"><h3>${p.name}${saved.has(p.id)?' ♡':''}</h3><p>${p.title}</p><small>${order(p).length} 张精选 · 走近看看 ↗</small></div></button></article>`).join(''):'<p class="lj-empty">还没有收藏。在喜欢的景点里点“收藏这处风景”，下次回来继续看。</p>';
  }
  function renderStory(){
    const p=byId[selected],c=p.chapters[chapter],frame=c.photo??order(p)[0],main=p.photos[frame],next=byId[p.next.id];
    // Original array indices remain in URLs; only the editorial sequence changes.
    const remaining=order(p).filter(i=>i!==frame);
    $('lj-current-name').textContent=p.name;
    $('lj-story').innerHTML=`<div class="lj-story-return"><button data-lj-back-map>← 回到刚才的地图</button><span>${groupName(p.group)} · ${order(p).length} 张精选实景</span></div><div class="lj-story-top"><figure class="lj-story-cover${portrait(main)}"><button class="lj-main-photo" data-lj-frame="${frame}" aria-label="放大${p.name}照片">${photo(main)}<span class="lj-photo-open">查看完整实景 ↗</span></button><figcaption>${esc(main.caption)}</figcaption></figure><div class="lj-story-copy"><span class="lj-eyebrow">${p.kicker}</span><h2 id="lj-story-title" tabindex="-1">${p.name}</h2><p>${p.story}</p><div class="lj-chapters" aria-label="${p.name}的观看角度">${p.chapters.map((c,i)=>`<button data-lj-chapter="${i}" aria-pressed="${i===chapter}"><small>0${i+1}</small> ${c.title}</button>`).join('')}</div><div class="lj-story-detail" aria-live="polite"><strong>${c.title}</strong><p>${c.text}</p></div><div class="lj-story-actions">${p.id==='shuhe'?'<a class="lj-night-start" href="#lijiang?spot=shuhe&view=shuhe-night&step=0">▶ 继续看：束河五段夜色</a>':''}<button data-lj-save="${p.id}" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'已收藏 · 取消':'收藏这处风景 ＋'}</button><button data-lj-back-map>在地图上看位置 ↗</button><button data-lj-share>分享这处风景</button></div><p class="lj-feedback" role="status" id="lj-feedback">${esc(saveMessage)}</p></div></div><p class="lj-story-source">主图：${credit(main)}</p><div class="lj-gallery-heading"><h3>再看几处细节</h3><p>主图之外的 ${remaining.length} 张精选 · 不同机位与时间的观看</p></div><div class="lj-photo-rail" aria-label="${p.name}精选相册，可横向滚动">${remaining.map(i=>{const img=p.photos[i],caption=p.chapters.find(c=>c.photo===i)?.title||'另一种观看';return `<figure class="${portrait(img).trim()}"><button data-lj-frame="${i}" aria-label="放大：${esc(img.caption)}">${photo(img)}</button><figcaption><small>${esc(caption)}</small><strong>${esc(img.caption)}</strong><br>${credit(img)}</figcaption></figure>`;}).join('')}</div><p class="lj-practical">${p.tip}${p.id==='lashihai'?' <a href="https://www.lijiang.cn/news/shengtai/article/181655.html" target="_blank" rel="noopener noreferrer">查看保护区通告 ↗</a>':''}</p><div class="lj-next-place"><div><span class="lj-eyebrow">还想继续看看？</span><h3>${next.name}</h3><p>${p.next.reason}</p><small>观看顺序建议 · 实际出行另行规划</small></div><button data-lj-spot="${next.id}" data-lj-scroll="story">继续看 ${next.name} ↗</button><button data-lj-back-map>回到地图，自由选择</button></div>`;
  }
  function showPick(){
    const p=byId[selected];$('lj-map-pick').hidden=false;placePick();
    $('lj-map-pick').innerHTML=`<button class="lj-pick-close" data-lj-dismiss aria-label="关闭景点卡片">×</button><button class="lj-pick-photo" data-lj-frame="${p.cover}" aria-label="放大${p.name}预览照片">${photo(cover(p),true)}</button><div><small>${groupName(p.group)} · ${order(p).length} 张精选</small><strong>${p.name}</strong><p>${p.title}</p><button data-lj-read>走近实景 ↗</button></div>`;
    $('lj-selection-live').textContent='已选'+p.name+'，可在本图下方预览，或点顶部“走近实景”。';
  }
  function readStory(){
    if(!history.state?.ljReading)history.pushState({...history.state,ljReading:true,ljMapReturn:mapReturn},'',location.href);
    scroll('lj-story');$('lj-story-title')?.focus({preventScroll:true});
  }
  const panels={
    core:{name:'雪山与三座古镇',bounds:[100.07,26.82,100.30,27.21],box:[560,720],plot:[35,100,490,560]},
    lugu:{name:'泸沽湖',bounds:[100.72,27.64,100.87,27.77],box:[390,300],plot:[45,55,300,205]},
    chenghai:{name:'程海',bounds:[100.60,26.43,100.73,26.65],box:[390,300],plot:[65,45,260,215]}
  };
  const artwork={dayan:['town',389,618],shuhe:['town',205,500],baisha:['town',427,444],yulong:['mountain',150,260],'blue-moon':['water',437,281],yunshanping:['forest',433,207],maoniuping:['forest',439,123],lashihai:['water',124,587]};
  function projection(panel){
    const {bounds:[w,s,e,n],plot:[x,y,width,height]}=panel,cos=Math.cos((s+n)/2*Math.PI/180),scale=Math.min(width/((e-w)*cos),height/(n-s));
    return ([lon,lat])=>[x+width/2+(lon-(w+e)/2)*cos*scale,y+height/2+((s+n)/2-lat)*scale];
  }
  function renderAtlas(){
    const focusId=document.activeElement?.closest?.('.paper-spot')?.dataset.ljSpot;
    for(const [id,panel] of Object.entries(panels)){
      const xy=projection(panel),prefix='paper-'+id,[width,height]=panel.box;
      const ringPath=ring=>ring.map((c,i)=>(i?'L':'M')+xy(c).map(v=>v.toFixed(1)).join(',')).join('')+'Z';
      const water=(lakes?.features||[]).filter(f=>id==='core'?f.name==='拉市海':f.name===panel.name).map(f=>`<path class="paper-lake" style="fill:url(#${prefix}-water-wash)" d="${[...f.rings,...f.holes].map(ringPath).join('')}" fill-rule="evenodd"/>`).join('');
      const scenery=`<image class="atlas-painting lj-landscape" href="assets/shanshui/${id==='core'?'lijiang':id}.webp" x="${id==='core'?15:0}" y="${id==='core'?45:20}" width="${id==='core'?530:390}" height="${id==='core'?650:260}" preserveAspectRatio="none"/>`;
      $('lj-paper-'+id).innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${panel.name}手绘位置图，北向上，插画为示意">
        ${PaperAtlas.defs(prefix)}<defs><linearGradient id="${prefix}-water-wash" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#b4d1bd"/><stop offset=".32" stop-color="#76b8b5"/><stop offset=".7" stop-color="#4b919e"/><stop offset="1" stop-color="#a2c6b9"/></linearGradient><clipPath id="${prefix}-clip"><rect x="16" y="20" width="${width-32}" height="${height-40}" rx="8"/></clipPath><pattern id="${prefix}-ripples" width="47" height="26" patternUnits="userSpaceOnUse"><path d="M3 10q5-2 12 0t15 0m-4 12q7-1 14 0" fill="none" stroke="#f5f3d9" stroke-width=".6" opacity=".38"/></pattern></defs>
        <path class="paper-neatline" d="M15 37V16h24m${width-78} 0h24v21M15 ${height-37}v21h24m${width-78} 0h24v-21"/>
        <g aria-hidden="true" pointer-events="none" clip-path="url(#${prefix}-clip)">${scenery}${water.replace(/ style="[^"]*"/g,'').replaceAll('class="paper-lake"','class="paper-shore-glaze"')}${water}${water.replace(/ style="[^"]*"/g,'').replaceAll('class="paper-lake"',`fill="url(#${prefix}-ripples)" stroke="none"`)}</g>
        ${PaperAtlas.art(prefix,'compass',width-70,id==='core'?30:13,48,65)}
        ${places.filter(p=>p.area===id).map(p=>{
          const [x,y]=xy(p.coords),[kind,cx,cy]=artwork[p.id]||['water',id==='lugu'?287:115,115];
          const core=id==='core',lx=cx,ly=core?cy:y;
          return `<g class="paper-spot ${p.id===selected?'is-selected':''}" data-lj-spot="${p.id}" role="button" tabindex="0" aria-label="查看${p.name}" aria-pressed="${p.id===selected}">
            <title>${p.name} · 点击看实景</title><circle class="paper-focus-halo" cx="${x}" cy="${y}" r="18"/><path class="paper-leader" d="M${x.toFixed(1)} ${y.toFixed(1)}Q${(x+lx)/2} ${y.toFixed(1)} ${lx+(lx>x?-61:61)} ${ly+20}"/><circle class="paper-anchor" cx="${x}" cy="${y}" r="3.5"/>
            <g transform="translate(${lx} ${ly})"><rect class="paper-hit" x="${kind==='mountain'?-98:-64}" y="${kind==='mountain'?-114:core?-25:-16}" width="${kind==='mountain'?196:128}" height="${kind==='mountain'?154:core?80:64}" rx="14"/>
            <rect class="paper-name-back" x="-61" y="4" width="122" height="33" rx="16"/><text class="paper-place-name" x="0" y="27" text-anchor="middle">${p.name}</text></g></g>`;
        }).join('')}
      </svg>`;
    }
    if(focusId)document.querySelector(`.paper-spot[data-lj-spot="${focusId}"]`)?.focus({preventScroll:true});
  }
  $('lj-map').addEventListener('error',event=>{if(event.target.matches?.('image.atlas-painting'))event.target.style.display='none';},true);
  async function loadLakes(){
    try{const r=await fetch('terrain/lijiang-lakes.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(r.status);lakes=await r.json();renderAtlas();}
    catch{$('lj-paper-note').textContent='湖岸轮廓暂未加载，景点位置与相册仍可使用。';}
  }
  function placePick(){
    const target=$('lj-panel-'+byId[selected].area);
    if($('lj-map-pick').parentElement!==target)target.append($('lj-map-pick'));
  }
  matchMedia('(max-width:760px)').addEventListener('change',()=>{if(initialized)placePick();});
  function highlight(){
    document.querySelectorAll('.paper-spot').forEach(b=>{const on=b.dataset.ljSpot===selected;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on));});
  }
  function locate(){
    showPick();highlight();const pin=document.querySelector(`.paper-spot[data-lj-spot="${selected}"]`);
    const back=mapReturn?.spot===selected?mapReturn:history.state?.ljMapReturn;
    if(back?.spot===selected&&back.width===window.innerWidth)window.scrollTo({top:back.y,behavior:'instant'});
    else pin?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});
    pin?.focus({preventScroll:true});
  }
  function closePhoto(){
    if(history.state?.lijiangPhoto)history.back();else go({spot:selected},true);
  }
  function renderPhoto(frame){
    const p=byId[selected],img=p.photos[frame],dialog=$('lj-photo-dialog');
    const wasOpen=dialog.open,active=document.activeElement;
    const focusStep=active?.dataset?.ljPhotoStep,focusMap=active?.hasAttribute?.('data-lj-photo-map');
    if(!wasOpen)photoOpener=active;
    $('lj-photo-content').innerHTML=`<header><strong id="lj-photo-title">${p.name} · ${order(p).includes(frame)?(order(p).indexOf(frame)+1)+' / '+order(p).length:'原链接照片'}</strong><button data-lj-photo-close aria-label="关闭完整照片">×</button></header><div class="lj-lightbox-stage"><button data-lj-photo-step="-1" aria-label="上一张" ${p.photos.length===1?'disabled':''}>‹</button>${photo(img)}<button data-lj-photo-step="1" aria-label="下一张" ${p.photos.length===1?'disabled':''}>›</button></div><footer><strong>${esc(img.caption)}</strong><p>${credit(img)}</p><button class="lj-photo-map" data-lj-photo-map>回到这个景点的地图 ↗</button></footer>`;
    if(!wasOpen)dialog.showModal();
    else dialog.querySelector(focusStep?`[data-lj-photo-step="${focusStep}"]`:focusMap?'[data-lj-photo-map]':'[data-lj-photo-close]')?.focus({preventScroll:true});
    document.body.classList.add('dialog-open');
  }
  function sync(){
    const v=DaliViews.parse(location.hash),isActive=v.page==='lijiang';
    if(!isActive){lastPage=v.page;return;}
    initialize();
    const next=v.spot||'baisha';
    if(next!==selected){selected=next;chapter=0;renderDirectory();renderStory();highlight();}
    if(v.spot){if(next!==lastSpot||lastPage!=='lijiang')showPick();}else $('lj-map-pick').hidden=true;
    lastSpot=next;
    if(v.frame!==undefined)renderPhoto(v.frame);
    if(lastPage!=='lijiang'){window.scrollTo(0,0);lastPage='lijiang';}
  }
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-lj-spot],[data-lj-filter],[data-lj-chapter],[data-lj-save],[data-lj-frame],[data-lj-photo-step],[data-lj-photo-close],[data-lj-dismiss],[data-lj-read],[data-lj-back-map],[data-lj-share],[data-lj-scroll],[data-lj-jump],[data-lj-photo-map]');if(!el)return;
    const d=el.dataset;
    if(d.ljSpot){
      const pin=el.closest('.paper-spot'),before=pin?.getBoundingClientRect().top;
      if(!pin)mapReturn=null;
      go({spot:d.ljSpot});showPick();highlight();
      if(pin){window.scrollBy({top:pin.getBoundingClientRect().top-before,behavior:'instant'});mapReturn={spot:d.ljSpot,y:window.scrollY,width:window.innerWidth};}
      if(d.ljScroll)readStory();
    }
    if(d.ljJump){
      if(d.ljJump==='map'){if(DaliViews.parse(location.hash).spot)locate();else scroll('lj-map');}
      else{filter=d.ljJump==='saved'?'saved':'all';renderDirectory();scroll('lj-directory-title');}
    }
    if(d.ljFilter){filter=d.ljFilter;renderDirectory();if(el.closest('#lj-routes'))scroll('lj-directory-title');}
    if(d.ljChapter!==undefined){chapter=Number(d.ljChapter);renderStory();document.querySelector(`[data-lj-chapter="${chapter}"]`)?.focus({preventScroll:true});}
    if(d.ljSave){saved.has(d.ljSave)?saved.delete(d.ljSave):saved.add(d.ljSave);try{localStorage.setItem(storageKey,JSON.stringify([...saved]));saveMessage='已保存在当前浏览器。';}catch{saveMessage='浏览器暂不能保存，收藏只在本次打开期间保留。';}renderDirectory();renderStory();document.querySelector('[data-lj-save]')?.focus({preventScroll:true});}
    if(d.ljFrame!==undefined)go({spot:selected,frame:Number(d.ljFrame)});
    if(d.ljPhotoStep){const v=DaliViews.parse(location.hash),sequence=order(byId[selected]),index=sequence.indexOf(v.frame),step=Number(d.ljPhotoStep);go({spot:selected,frame:sequence[index<0?(step>0?0:sequence.length-1):(index+step+sequence.length)%sequence.length]},true);}
    if('ljPhotoMap' in d){go({spot:selected},true);locate();}
    if('ljPhotoClose' in d)closePhoto();
    if('ljDismiss' in d){$('lj-map-pick').hidden=true;const target=document.querySelector(`.paper-spot[data-lj-spot="${selected}"]`);target?.focus({preventScroll:true});}
    if('ljRead' in d)readStory();
    if('ljBackMap' in d)locate();
    if('ljShare' in d){const url=new URL(location.href);url.hash=DaliViews.format({page:'lijiang',spot:selected});Promise.resolve().then(()=>navigator.clipboard.writeText(url.href)).then(()=>$('lj-feedback').textContent='景点链接已复制。').catch(()=>$('lj-feedback').textContent='复制浏览器地址即可分享这处风景。');}
    if(d.ljScroll&&!d.ljSpot){event.preventDefault();const url=new URL(el.href);mapReturn=null;go({spot:DaliViews.parse(url.hash).spot});readStory();}
  });
  $('lj-photo-dialog').addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
  $('lj-photo-dialog').addEventListener('close',()=>photoOpener?.isConnected&&photoOpener.focus({preventScroll:true}));
  $('lj-photo-dialog').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();$('lj-photo-dialog').querySelector(`[data-lj-photo-step="${event.key==='ArrowLeft'?-1:1}"]`)?.click();}});
  document.addEventListener('error',event=>{
    const img=event.target;if(!(img instanceof HTMLImageElement)||!img.hasAttribute('data-lj-image'))return;
    img.hidden=true;const note=document.createElement('span');note.className='lj-photo-error';note.textContent='此照片暂时无法加载 · 可通过下方原作链接查看';img.after(note);
  },true);
  window.addEventListener('destinationchange',sync);sync();
})();
