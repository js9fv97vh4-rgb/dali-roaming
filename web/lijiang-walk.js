/* A photo walk, not a fabricated street route. Only the active chapter is timed. */
(() => {
  const $=id=>document.getElementById(id),dialog=$('lj-walk-dialog');
  const photos=LIJIANG_DATA.places.find(p=>p.id==='shuhe').photos;
  const chapters=[
    {photo:'shuhe-owner-night.jpg',name:'灯下的门',title:'灯亮起来，\n夜游从这里开始。',text:'先在牌坊前停一停。金色的屋檐从夜空里显出来，红灯笼一盏接着一盏，把目光引向门后的街巷。',look:'看檐角的线条，也看门内留出的那片暗。'},
    {photo:'shuhe-owner-night-street.jpg',name:'转进街巷',title:'转一个弯，\n街巷有了温度。',text:'木窗、台阶和门边的花，把一间临街小店围在暖光里。沿着照片向远处看，街道的灯还在继续。',look:'从门前的台阶，慢慢看到画面深处的石板路。'},
    {photo:'shuhe-owner-night-dining.jpg',name:'水边人间',title:'一桌灯火，\n一段慢下来的夜。',text:'灯光落在木雕和桌面上，水边坐着聊天、吃饭的人。除了建筑，古镇的夜色里还有这些日常的片刻。',look:'找一找水岸、木柱和灯笼怎样把画面连起来。'},
    {photo:'shuhe-owner-night-corner.jpg',name:'檐下与水上',title:'屋檐留住灯，\n流水留住倒影。',text:'转角的楼阁被暖色勾出轮廓，水面又把它轻轻接住。向下看，蓝色与金色的光在暗处相遇。',look:'把屋檐的亮线，与水里的碎光对照着看。'},
    {photo:'shuhe-owner-night-reflections.jpg',name:'把夜色留下',title:'最后，\n把目光交给水。',text:'垂柳落在岸边，整排灯火映进水面。让视线在亮处与暗处之间停一会儿，这段夜游就收在倒影里。',look:'看水面上完整的楼影，再看被波纹打散的灯光。'}
  ];
  let step=-1,playing=false,elapsed=0,timer=null,lastTick=0,ready=false,opener=null,loadToken=0;
  const photoFor=c=>photos.find(p=>p.src.endsWith(c.photo));
  $('lj-walk-chapters').innerHTML=chapters.map((c,i)=>`<button data-lj-walk-step="${i}" aria-current="false"><img src="${photoFor(c).thumb}" alt="" loading="lazy"><span><small>0${i+1}</small>${c.name}</span></button>`).join('');
  function navigate(next){
    const hash=DaliViews.format({page:'lijiang',spot:'shuhe',modal:'lijiang-walk',step:next});
    history.replaceState(history.state,'',hash);window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  function refreshPlayback(){
    clearInterval(timer);timer=null;
    $('lj-walk-play').textContent=playing?'暂停慢游':step===4&&elapsed>=12000?'再看一次':'自动慢游';
    $('lj-walk-play').setAttribute('aria-pressed',String(playing));
    dialog.classList.toggle('is-playing',playing&&ready&&!document.hidden);
    $('lj-walk-play-status').textContent=!ready?'照片准备好后继续。':playing?'每段停留 12 秒 · 随时可暂停':'随自己的节奏，慢慢看。';
    if(!playing||!ready||document.hidden||!dialog.open)return;
    lastTick=performance.now();
    timer=setInterval(()=>{
      const now=performance.now();elapsed=Math.min(12000,elapsed+now-lastTick);lastTick=now;
      $('lj-walk-progress').value=elapsed;
      if(elapsed>=12000){if(step<4)navigate(step+1);else{playing=false;refreshPlayback();$('lj-walk-play-status').textContent='夜游到这里，愿灯火留在记忆里。';}}
    },200);
  }
  function sync(){
    const view=DaliViews.parse(location.hash);
    if(view.modal!=='lijiang-walk'){if(dialog.open)dialog.close();return;}
    if(!dialog.open){opener=document.activeElement;dialog.showModal();document.body.classList.add('dialog-open');step=-1;}
    if(step===view.step)return;
    step=view.step;elapsed=0;ready=false;const token=++loadToken,c=chapters[step],p=photoFor(c),img=$('lj-walk-image');
    $('lj-walk-number').textContent=`0${step+1} / 05 · ${c.name}`;
    $('lj-walk-heading').textContent=c.title;$('lj-walk-prose').textContent=c.text;$('lj-walk-look').textContent=c.look;
    $('lj-walk-progress').value=0;$('lj-walk-prev').disabled=step===0;$('lj-walk-next').disabled=step===4;
    document.querySelectorAll('[data-lj-walk-step]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.ljWalkStep)===step?'step':'false'));
    img.hidden=true;$('lj-walk-image-status').textContent='正在展开这一段夜色…';
    img.onload=()=>{if(token!==loadToken)return;ready=true;img.hidden=false;$('lj-walk-image-status').textContent='';refreshPlayback();};
    img.onerror=()=>{if(token!==loadToken)return;ready=false;playing=false;refreshPlayback();$('lj-walk-image-status').textContent='这张照片暂时未能加载，可以切换其他章节。';};
    img.alt=p.caption;img.src=p.src;
    if(step<4){const next=new Image();next.src=photoFor(chapters[step+1]).src;}
    refreshPlayback();
  }
  $('lj-walk-prev').onclick=()=>navigate(Math.max(0,step-1));
  $('lj-walk-next').onclick=()=>navigate(Math.min(4,step+1));
  $('lj-walk-play').onclick=()=>{playing=!playing;if(playing&&step===4&&elapsed>=12000)navigate(0);refreshPlayback();};
  $('lj-walk-original').onclick=()=>{const whole=dialog.classList.toggle('show-whole');$('lj-walk-original').setAttribute('aria-pressed',String(whole));$('lj-walk-original').textContent=whole?'回到沉浸画面 ⤡':'查看完整构图 ⤢';};
  $('lj-walk-chapters').onclick=e=>{const b=e.target.closest('[data-lj-walk-step]');if(b)navigate(Number(b.dataset.ljWalkStep));};
  dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(Math.max(0,Math.min(4,step+(e.key==='ArrowRight'?1:-1))));}});
  dialog.addEventListener('close',()=>{playing=false;ready=false;step=-1;loadToken++;clearInterval(timer);timer=null;if(opener?.isConnected)opener.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',refreshPlayback);
  window.addEventListener('destinationchange',sync);sync();
})();
