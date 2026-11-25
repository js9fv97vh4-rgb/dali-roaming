/* Native links share one visible target: name, caption and arrow all navigate together. */
window.provinceDestinationLink = (id, position, mobileY=position[1]) => {
  const dali=id==='dali',name=({dali:'大理',lijiang:'丽江',kunming:'昆明'})[id],href=dali?'#erhai':'#'+id;
  return `<a id="${id}-star" class="province-destination atlas-outside-label" data-destination="${id}" style="--label-x:${position[0]}px;--label-y:${position[1]}px;--mobile-y:${mobileY}px" href="${href}" transform="translate(${position[0]} ${position[1]})" aria-label="进入${dali?'大理洱海':name}漫游">
    <title>${name} · 点击进入漫游</title>
    <rect class="destination-target" x="-80" y="-30" width="160" height="60" rx="3"/>
    <text class="destination-name" text-anchor="middle" dominant-baseline="central">${name}</text>
  </a>`;
};
/* Local, attributed prefecture geometry. No external map service is needed at runtime. */
window.createProvinceAtlas = (geometry, data) => {
  const host = document.getElementById('province-map');
  const directory = document.getElementById('prefecture-directory');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const regions = data.regions;
  const destinations={kunming:{href:'#kunming',name:'昆明',copy:'走进花街、湖岸与茶咖日常。'},dali:{href:'#erhai',name:'大理洱海',copy:'走进苍山洱海与白族村落。'},lijiang:{href:'#lijiang',name:'丽江',copy:'走进三座古镇、玉龙雪山与高原湖泊。'}};
  const outline = geometry.regions.map(r => `<path d="${r.path}"/>`).join('');
  const palette = ['#ddd6b8','#d9d0b6','#cbd4be','#e6d9bc','#c9d5c7','#e2ddc8'];
  const columns=[['diqing','lijiang','nujiang','dali','baoshan','dehong','lincang','puer'],['zhaotong','kunming','chuxiong','qujing','yuxi','wenshan','honghe','xishuangbanna']];
  const labels=columns.flatMap((ids,side)=>ids.map((id,index)=>({region:regions.find(r=>r.id===id),side,x:side?750:-36,y:53+index*79,mobileY:54+index*119})));
  function leader(label,mobile=false){
    const {region:r,side,x}=label,y=mobile?label.mobileY:label.y;
    const [tx,ty]=[r.label[0],r.label[1]+(mobile?151:0)];
    const start=x+(side?-48:48),bend=side?660:50;
    return `M${start} ${y}C${bend} ${y+(side?8:-8)} ${tx+(side?42:-42)} ${ty-12} ${tx} ${ty}`;
  }
  host.classList.add('province-atlas');
  host.innerHTML = `<svg viewBox="-112 0 940 665" role="group" tabindex="0" aria-describedby="province-map-help" aria-label="云南16个州、市分区地图；点击大理、丽江、昆明进入漫游；其他地名可查看开放状态">
    ${PaperAtlas.defs('province-paper')}<defs>
      <pattern id="prefecture-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#738c8b" stroke-opacity=".1"/></pattern>
      <clipPath id="prefecture-clip">${outline}</clipPath>
      <marker id="province-pen-arrow" viewBox="0 0 9 8" refX="8" refY="4" markerWidth="7" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1Q5 3 8 4Q5 5 1 7" fill="none" stroke="#59796b" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></marker>

    </defs>
    <path class="paper-neatline" d="M32 55V28h30m566 0h30v27M32 585v27h30m566 0h30v-27" aria-hidden="true"/>
    <g class="province-artwork">
    <g class="province-shadow" transform="translate(0 7)" aria-hidden="true">${outline}</g>
    <g class="prefecture-base" aria-hidden="true">${outline}</g>
    <g clip-path="url(#prefecture-clip)">${regions.map((r,i) => {
      const destination=destinations[r.id],tag=destination?'a':'g';
      return `<${tag} class="prefecture-region" data-prefecture="${r.id}" ${destination?`href="${destination.href}" data-destination="${r.id}"`:'role="button" aria-pressed="false"'} tabindex="-1" aria-label="${destination?'进入':'查看'}${escape(r.name)}${destination?'漫游':''}"><title>${escape(r.name)}</title><path class="prefecture-area" d="${r.path}" fill="${palette[i%palette.length]}" fill-rule="evenodd"/></${tag}>`;
    }).join('')}</g>
    <g class="province-paper-scenery" aria-hidden="true" pointer-events="none" clip-path="url(#prefecture-clip)">
      <image class="atlas-painting" href="assets/shanshui/yunnan.webp" x="60.6794" y="60.7707" width="598.6412" height="571.1405" preserveAspectRatio="none"/>
    </g>
    <g class="province-boundaries" aria-hidden="true" pointer-events="none" clip-path="url(#prefecture-clip)">${regions.map(r=>`<path d="${r.path}"/>`).join('')}</g>
    ${PaperAtlas.art('province-paper','compass',618,40,36,50)}
    </g>
    <g class="province-points" aria-hidden="true" pointer-events="none">${regions.map(r=>`<circle cx="${r.label[0]}" cy="${r.label[1]}" r="${destinations[r.id]?4.5:1.8}" fill="${destinations[r.id]?'#a55b38':'#698173'}" stroke="#f6f1df" stroke-width="1.3"/>`).join('')}</g>
    <g class="province-leaders" aria-hidden="true" pointer-events="none">${labels.map(label=>`<g class="province-leader ${destinations[label.region.id]?'is-open':''}" data-leader="${label.region.id}"><path class="desktop-leader" d="${leader(label)}" marker-end="url(#province-pen-arrow)"/><path class="mobile-leader" d="${leader(label,true)}" marker-end="url(#province-pen-arrow)"/></g>`).join('')}</g>
    ${labels.map(({region:r,x,y,mobileY})=> {
      const style=`style="--label-x:${x}px;--label-y:${y}px;--mobile-y:${mobileY}px"`;
      return destinations[r.id]
        ? window.provinceDestinationLink(r.id,[x,y],mobileY)
        : `<g class="prefecture-label atlas-outside-label" ${style} data-prefecture="${r.id}" role="button" tabindex="0" aria-label="查看${escape(r.name)}，尚未开放漫游" aria-pressed="false"><rect class="prefecture-label-hit" x="-80" y="-30" width="160" height="60" rx="3"/><text text-anchor="middle" dominant-baseline="central">${escape(r.short)}</text><text class="province-status-inline" y="34" text-anchor="middle" aria-hidden="true">尚未开放</text></g>`;
    }).join('')}
  </svg>`;
  directory.innerHTML = regions.map(r => destinations[r.id]
    ? `<a href="${destinations[r.id].href}" data-destination="${r.id}"><span>${escape(r.short)}</span><small>进入漫游 ↗</small></a>`
    : `<button type="button" data-prefecture="${r.id}" aria-pressed="false"><span>${escape(r.short)}</span><small>尚未开放</small></button>`).join('');

  function select(id) {
    document.getElementById("province-selection").hidden=false;
    const region = regions.find(r => r.id===id);
    if(!region) return;
    for(const button of document.querySelectorAll('[data-prefecture]')) {
      const selected = button.dataset.prefecture===id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    document.querySelectorAll('[data-leader]').forEach(line=>line.classList.toggle('is-selected',line.dataset.leader===id));
    const destination=destinations[id],open=!!destination;
    document.getElementById('province-map-help').textContent=open?'大理、丽江、昆明 · 点击地名进入漫游':region.short+' · 尚未开放漫游';
    const craft=crafts[id];
    craftSource.hidden=!craft;
    if(craft){craftSource.href=craft.url;craftSource.innerHTML=`<img src="assets/atlas-art/${craft.art}.webp" alt="" width="66" height="44" loading="lazy"><span>${craft.name} · 非遗资料 ↗</span>`;}
    const introductions={kunming:'从一座城的街巷出发，认识滇中的日常。',qujing:'把下一段旅程，留给滇东的山野与城镇。',yuxi:'下一次，慢慢走近湖泊与村落。',baoshan:'越过山地，把目光投向滇西。',zhaotong:'沿着滇东北的山路，想象下一段出发。',lijiang:'在雪山与古城之间，留一个下次见的约定。',puer:'把脚步放慢，期待一段茶山旅程。',lincang:'下一站，想去山间的村落坐一坐。',chuxiong:'走近滇中的山地，期待更多地方故事。',honghe:'下一段旅程，留给梯田与村落。',wenshan:'向滇东南出发，期待山水之间的生活。',xishuangbanna:'让下一段旅程，带一点热带的绿意。',dehong:'下一次，把目光投向云南西边。',nujiang:'沿着峡谷，想象一段更深的山地旅程。',diqing:'往更高的地方，寻找下一段风景。'};
    document.getElementById('province-selection-name').textContent=region.name;
    document.getElementById('province-selection-status').textContent=open?'漫游已开放':region.kind+' · 漫游尚未开放';
    document.getElementById('province-selection-copy').textContent=open?destination.copy:(introductions[id]||'把下一段旅程，留给这里。')+'';
    document.getElementById('province-enter').hidden=!open;
    if(open){document.getElementById('province-enter').href=destination.href;document.getElementById('province-enter').textContent='进入'+destination.name+' ↗';document.getElementById('province-enter').setAttribute('aria-label','进入'+destination.name+'漫游');}
    document.getElementById('province-reset').hidden=open;
    document.getElementById('province-selection').classList.toggle('is-unopened', !open);
  }
  function highlight(id) {
    document.querySelectorAll('[data-leader]').forEach(line=>line.classList.toggle('is-hovered',line.dataset.leader===id));
    for(const button of document.querySelectorAll('[data-prefecture]')) button.classList.toggle('is-hovered',button.dataset.prefecture===id);
  }
  for(const element of [host,directory]) {
    element.addEventListener('click',event => {const target=event.target.closest('[data-prefecture]');if(target&&!target.dataset.destination)select(target.dataset.prefecture);});
    element.addEventListener('pointerover',event => {const target=event.target.closest('[data-prefecture],[data-destination]');highlight(target?.dataset.prefecture||target?.dataset.destination||null);});
    element.addEventListener('pointerleave',()=>highlight(null));
    element.addEventListener('focusin',event => {const target=event.target.closest('[data-prefecture],[data-destination]');highlight(target?.dataset.prefecture||target?.dataset.destination||null);});
    element.addEventListener('focusout',()=>highlight(null));
  }
  document.getElementById('province-reset').addEventListener('click',()=>{
    document.getElementById('province-selection').hidden=true;
    document.querySelectorAll('[data-prefecture].is-selected,[data-leader].is-selected').forEach(el=>{el.classList.remove('is-selected');if(el.hasAttribute('aria-pressed'))el.setAttribute('aria-pressed','false');});
    host.querySelector('svg').focus({preventScroll:true});
    document.getElementById('province-map-help').textContent='点地名看地区';
  });
  host.addEventListener('keydown',e=>{const b=e.target.closest('[role="button"]');if(b&&['Enter',' '].includes(e.key)){e.preventDefault();select(b.dataset.prefecture);}});
  const craftSource=document.getElementById('province-craft-source');
  const crafts={dali:{name:'白族扎染技艺',art:'indigo',url:'https://www.ihchina.cn/project_details/14304.html'},xishuangbanna:{name:'傣族慢轮制陶技艺',art:'pottery',url:'https://www.ynich.cn/item/149.html'}};
  host.addEventListener('error',event=>{if(event.target.matches?.('image.atlas-painting'))event.target.style.display='none';},true);

  window.enableProvinceViewport(host);

};
