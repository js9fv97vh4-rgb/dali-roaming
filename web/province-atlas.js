/* Local, attributed prefecture geometry. No external map service is needed at runtime. */
window.createProvinceAtlas = (geometry, data) => {
  const host = document.getElementById('province-map');
  const directory = document.getElementById('prefecture-directory');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const regions = data.regions;
  const destinations={dali:{href:'#erhai',name:'大理洱海',copy:'点击山水徽记，走进苍山洱海与白族村落。'},lijiang:{href:'#lijiang',name:'丽江',copy:'点击山水徽记，走进三座古镇、玉龙雪山与高原湖泊。'}};
  const outline = geometry.regions.map(r => `<path d="${r.path}"/>`).join('');
  const palette = ['#ddd6b8','#d9d0b6','#cbd4be','#e6d9bc','#c9d5c7','#e2ddc8'];
  host.classList.add('province-atlas');
  host.innerHTML = `<svg viewBox="20 0 680 660" role="group" tabindex="0" aria-describedby="province-map-help" aria-label="云南16个州、市分区地图；点击地名了解地区，点击山水徽记进入大理洱海或丽江">
    ${PaperAtlas.defs('province-paper')}<defs>
      <pattern id="prefecture-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#738c8b" stroke-opacity=".1"/></pattern>
      <clipPath id="prefecture-clip">${outline}</clipPath>

    </defs>
    <path class="paper-neatline" d="M32 55V28h30m566 0h30v27M32 585v27h30m566 0h30v-27" aria-hidden="true"/>
    <g class="province-shadow" transform="translate(0 7)" aria-hidden="true">${outline}</g>
    <g class="prefecture-base" aria-hidden="true">${outline}</g>
    <g clip-path="url(#prefecture-clip)">${regions.map((r,i) => `<g class="prefecture-region" data-prefecture="${r.id}" role="button" tabindex="0" aria-label="查看${escape(r.name)}" aria-pressed="false"><title>${escape(r.name)}</title><path class="prefecture-area" d="${r.path}" fill="${palette[i%palette.length]}" fill-rule="evenodd"/></g>`).join('')}</g>
    <g class="province-paper-scenery" aria-hidden="true" pointer-events="none" clip-path="url(#prefecture-clip)">
      <image class="atlas-painting" href="assets/shanshui/yunnan.webp" x="60.6794" y="60.7707" width="598.6412" height="571.1405" preserveAspectRatio="none"/>
    </g>
    <g class="province-boundaries" aria-hidden="true" pointer-events="none" clip-path="url(#prefecture-clip)">${regions.map(r=>`<path d="${r.path}"/>`).join('')}</g>
    ${regions.map(r => `<g class="prefecture-label" data-prefecture="${r.id}" role="button" tabindex="0" aria-label="选择${escape(r.name)}" aria-pressed="false" transform="translate(${r.id==='lijiang'?319:r.id==='dali'?186.6:r.label[0]} ${r.id==='lijiang'?207:r.id==='dali'?280.8:r.label[1]})"><rect class="prefecture-label-hit" x="${-Math.max(48,r.short.length*13)}" y="-48" width="${Math.max(96,r.short.length*26)}" height="96" rx="12"/><rect class="prefecture-name-back" x="${-(r.short.length*22+18)/2}" y="-18" width="${r.short.length*22+18}" height="36" rx="2"/><text text-anchor="middle" dominant-baseline="central" ${r.vertical?'writing-mode="vertical-rl"':''}>${escape(r.short)}</text></g>`).join('')}
    <g class="province-star prefecture-dali-star" id="dali-star" transform="translate(${geometry.star[0]} ${geometry.star[1]})" role="button" tabindex="0" aria-label="进入大理洱海地图"><title>大理洱海 · 点击开启漫游</title><circle class="destination-hit" cy="3" r="47" fill="transparent"/>${PaperAtlas.destinationEmblem('dali')}</g>
    <a id="lijiang-star" class="province-star prefecture-dali-star" href="#lijiang" transform="translate(250 225)" aria-label="进入丽江漫游"><title>丽江 · 点击开启漫游</title><circle class="destination-hit" cy="3" r="47" fill="transparent"/>${PaperAtlas.destinationEmblem('lijiang')}</a>
    ${PaperAtlas.art('province-paper','compass',608,46,62,82)}
    <text class="province-map-caption" x="64" y="645" aria-hidden="true">云 南 · 山 水 风 物 图</text>
  </svg>`;
  directory.innerHTML = regions.map(r => `<button type="button" data-prefecture="${r.id}" aria-pressed="false"><span>${escape(r.short)}</span><small>${destinations[r.id]?'漫游已开放':'尚未开放'}</small></button>`).join('');

  function select(id) {
    const region = regions.find(r => r.id===id);
    if(!region) return;
    for(const button of document.querySelectorAll('[data-prefecture]')) {
      const selected = button.dataset.prefecture===id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    const destination=destinations[id],open=!!destination;
    const craft=crafts[id];
    craftSource.hidden=!craft;
    if(craft){craftSource.href=craft.url;craftSource.innerHTML=`<img src="assets/atlas-art/${craft.art}.webp" alt="" width="66" height="44" loading="lazy"><span>${craft.name} · 非遗资料 ↗</span>`;}
    const introductions={kunming:'从一座城的街巷出发，认识滇中的日常。',qujing:'把下一段旅程，留给滇东的山野与城镇。',yuxi:'下一次，慢慢走近湖泊与村落。',baoshan:'越过山地，把目光投向滇西。',zhaotong:'沿着滇东北的山路，想象下一段出发。',lijiang:'在雪山与古城之间，留一个下次见的约定。',puer:'把脚步放慢，期待一段茶山旅程。',lincang:'下一站，想去山间的村落坐一坐。',chuxiong:'走近滇中的山地，期待更多地方故事。',honghe:'下一段旅程，留给梯田与村落。',wenshan:'向滇东南出发，期待山水之间的生活。',xishuangbanna:'让下一段旅程，带一点热带的绿意。',dehong:'下一次，把目光投向云南西边。',nujiang:'沿着峡谷，想象一段更深的山地旅程。',diqing:'往更高的地方，寻找下一段风景。'};
    document.getElementById('province-selection-name').textContent=region.name;
    document.getElementById('province-selection-status').textContent=open?'漫游已开放':region.kind+' · 漫游尚未开放';
    document.getElementById('province-selection-copy').textContent=open?destination.copy:(introductions[id]||'把下一段旅程，留给这里。')+' 此地区暂未开放漫游，可先体验大理。';
    document.getElementById('province-enter').hidden=!open;
    if(open){document.getElementById('province-enter').href=destination.href;document.getElementById('province-enter').setAttribute('aria-label','进入'+destination.name+'漫游');}
    document.getElementById('province-reset').hidden=open;
    document.getElementById('province-selection').classList.toggle('is-unopened', !open);
  }
  function highlight(id) {
    for(const button of document.querySelectorAll('[data-prefecture]')) button.classList.toggle('is-hovered',button.dataset.prefecture===id);
  }
  for(const element of [host,directory]) {
    element.addEventListener('click',event => {const target=event.target.closest('[data-prefecture]');if(target)select(target.dataset.prefecture);});
    element.addEventListener('pointerover',event => {const target=event.target.closest('[data-prefecture]');if(target)highlight(target.dataset.prefecture);});
    element.addEventListener('pointerleave',()=>highlight(null));
    element.addEventListener('focusin',event => {const target=event.target.closest('[data-prefecture]');if(target)highlight(target.dataset.prefecture);});
    element.addEventListener('focusout',()=>highlight(null));
  }
  document.getElementById('province-reset').addEventListener('click',()=>select('dali'));
  const craftSource=document.getElementById('province-craft-source');
  const crafts={dali:{name:'白族扎染技艺',art:'indigo',url:'https://www.ihchina.cn/project_details/14304.html'},xishuangbanna:{name:'傣族慢轮制陶技艺',art:'pottery',url:'https://www.ynich.cn/item/149.html'}};
  host.addEventListener('error',event=>{if(event.target.matches?.('image.atlas-painting'))event.target.style.display='none';},true);
  select('dali');
  window.enableProvinceViewport(host);

};
