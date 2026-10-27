/* A preview stays visible until the first real WebGL frame; times are estimates. */
(() => {
  const phases={engine:[.02,.30,'正在载入立体引擎'],terrain:[.30,.66,'正在下载山海地形'],mesh:[.66,.94,'正在构建立体山海'],frame:[.94,.99,'正在准备第一帧']};
  function estimate(elapsed,progress,previous){
    if(progress>=1)return [0,0];
    const total=previous>0?previous:progress>=.15&&elapsed>=600?elapsed/progress:null;
    if(!total||elapsed>total*1.7)return null;
    const remaining=Math.max(1000,total-elapsed);
    return [Math.max(1,Math.floor(remaining*.65/1000)),Math.max(2,Math.ceil(remaining*1.5/1000))];
  }
  window.atlasLoadEstimate=estimate;
  window.createAtlasLoading=()=>{
    const root=document.getElementById('atlas-loading'),home=root.parentElement;
    const bar=root.querySelector('progress'),stage=root.querySelector('[data-load-stage]'),percent=root.querySelector('[data-load-percent]'),eta=root.querySelector('[data-load-eta]');
    const retry=root.querySelector('[data-load-retry]'),flat=root.querySelector('[data-load-flat]');
    const historyKey='yunnan-roaming:atlas-load:v1';
    let previous=0;try{previous=Number(localStorage.getItem(historyKey))||0;}catch{}
    let started=0,progress=0,timer,hideTimer,state='idle',lastProgress=0,lastPaint=-Infinity,currentPhase='';
    const clock=()=>performance.now();
    function place(){
      if(state==='ready')return;
      const dialog=['panorama-dialog','lantern-dialog','tour-dialog'].map(id=>document.getElementById(id)).find(d=>d?.open);
      const target=dialog?.querySelector('#panorama-map,#lantern-map,#tour-map');
      const parent=target?.querySelector('.atlas3d')||target||home;
      if(root.parentElement!==parent)parent.append(root);
      flat.hidden=state==='recovering'||dialog?.id==='tour-dialog';
    }
    function tick(){
      const elapsed=clock()-started,range=estimate(elapsed,progress,previous);
      eta.textContent=state==='recovering'?'正在恢复画面，请稍候':elapsed>12000&&clock()-lastProgress>8000?'比预期稍久，仍在处理中':range?`预计还需 ${range[0]}–${range[1]} 秒（估算）`:'正在测量加载速度…';
      if(elapsed>12000)retry.hidden=false;
    }
    function start(attempt=0){
      clearInterval(timer);clearTimeout(hideTimer);root.hidden=false;root.classList.remove('is-ready','is-failed');
      state='loading';started=lastProgress=clock();progress=0;bar.value=0;percent.textContent='0%';retry.hidden=true;flat.hidden=false;
      lastPaint=-Infinity;currentPhase='';place();stage.textContent=attempt?'连接中断，正在重新加载':'正在展开立体山海';tick();timer=setInterval(tick,750);
    }
    function update(event){
      if(state!=='loading')return;
      if(typeof event==='string'){stage.textContent=event;return;}
      const phase=phases[event.stage];if(!phase)return;
      const ratio=Number.isFinite(event.ratio)?event.ratio:event.total>0?event.loaded/event.total:0;
      const next=Math.min(.99,phase[0]+(phase[1]-phase[0])*Math.max(0,Math.min(1,ratio)));
      if(next>progress){progress=next;lastProgress=clock();}
      if(event.stage===currentPhase&&clock()-lastPaint<100&&ratio<1&&!event.done)return;
      currentPhase=event.stage;lastPaint=clock();
      bar.value=Math.round(progress*100);percent.textContent=bar.value+'%';stage.textContent=event.message||phase[2];tick();
    }
    function ready(){
      if(state==='ready')return;
      if(state==='loading'){
        const duration=clock()-started;
        if(duration>100&&duration<120000)try{localStorage.setItem(historyKey,String(Math.round(previous?previous*.4+duration*.6:duration)));}catch{}
      }
      state='ready';clearInterval(timer);progress=1;bar.value=100;percent.textContent='100%';stage.textContent='立体山海已就绪';eta.textContent='现在可以旋转、缩放和探索';root.classList.add('is-ready');
      hideTimer=setTimeout(()=>{root.hidden=true;home.append(root);},220);
    }
    function fail(){
      state='failed';clearInterval(timer);clearTimeout(hideTimer);place();root.hidden=false;root.classList.remove('is-ready');root.classList.add('is-failed');
      stage.textContent='立体地图暂未加载成功';eta.textContent='预览图已保留，可以重试或先使用平面地图';retry.hidden=false;flat.hidden=false;
    }
    function recover(host){
      clearTimeout(hideTimer);host.append(root);root.hidden=false;root.classList.remove('is-ready','is-failed');state='recovering';started=lastProgress=clock();stage.textContent='立体画面中断，正在恢复';bar.removeAttribute('value');percent.textContent='';retry.hidden=false;flat.hidden=true;clearInterval(timer);tick();timer=setInterval(tick,750);
    }
    retry.addEventListener('click',()=>location.reload());
    flat.addEventListener('click',()=>{root.hidden=true;});
    return {start,update,ready,fail,recover,place};
  };
})();
