/* A bounded SVG camera. No renderer or map service is needed. */
window.enableProvinceViewport = host => {
  const svg=host.querySelector('svg'),media=matchMedia('(max-width:600px)');
  const controls=[...document.querySelectorAll('[data-province-zoom]')];
  const status=document.getElementById('province-zoom-level'),hint=document.getElementById('province-map-help');
  let base,view,zoom=1,drag=null,suppressClick=false;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function paint(){
    view[0]=clamp(view[0],base[0],base[0]+base[2]-view[2]);
    view[1]=clamp(view[1],base[1],base[1]+base[3]-view[3]);
    svg.setAttribute('viewBox',view.join(' '));
    host.classList.toggle('is-zoomed',zoom>1);
    status.value=Math.round(zoom*100)+'%';
    hint.textContent=zoom>1?'拖动看细节 · 方向键移动 · 全图复位':'点选地名 · 循着山水徽记出发';
    for(const button of controls)button.disabled=button.dataset.provinceZoom==='out'?zoom===1:button.dataset.provinceZoom==='in'?zoom===3:false;
  }
  function reset(){base=media.matches?[30,35,645,600]:[20,0,680,660];view=[...base];zoom=1;paint();}
  function changeZoom(next){
    const cx=view[0]+view[2]/2,cy=view[1]+view[3]/2;
    zoom=clamp(next,1,3);const w=base[2]/zoom,h=base[3]/zoom;
    view=[cx-w/2,cy-h/2,w,h];paint();
  }
  controls.forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.provinceZoom==='reset')reset();
    else changeZoom(zoom+(button.dataset.provinceZoom==='in'?.5:-.5));
  }));
  // Convert pointer positions through the SVG matrix, including letterboxing.
  function point(event){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  svg.addEventListener('pointerdown',event=>{
    if(zoom===1||event.button!==0)return;
    const p=point(event);drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:p.x,y:p.y,moved:false};
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)return;
    if(!drag.moved){drag.moved=true;svg.setPointerCapture(event.pointerId);}
    const p=point(event);view[0]+=drag.x-p.x;view[1]+=drag.y-p.y;paint();
  });
  function endDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    suppressClick=drag.moved;drag=null;
    if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    if(suppressClick)setTimeout(()=>{suppressClick=false;},0);
  }
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
  host.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  svg.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&zoom>1){event.preventDefault();reset();return;}
    const offset={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!offset||zoom===1)return;
    event.preventDefault();view[0]+=offset[0]*view[2]*.15;view[1]+=offset[1]*view[3]*.15;paint();
  });
  // Tabbing to an off-screen region reveals it without losing keyboard focus.
  svg.addEventListener('focusin',event=>{
    const target=event.target.closest('[data-prefecture],.province-star');if(!target||zoom===1)return;
    const box=target.getBoundingClientRect(),frame=svg.getBoundingClientRect();
    if(box.left<frame.left||box.right>frame.right||box.top<frame.top||box.bottom>frame.bottom)reset();
  });
  media.addEventListener('change',reset);reset();
};
