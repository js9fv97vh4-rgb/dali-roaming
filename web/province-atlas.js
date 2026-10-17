/* Local, attributed prefecture geometry. No external map service is needed at runtime. */
window.createProvinceAtlas = (geometry, data) => {
  const host = document.getElementById('province-map');
  const directory = document.getElementById('prefecture-directory');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const regions = data.regions;
  const outline = geometry.regions.map(r => `<path d="${r.path}"/>`).join('');
  const palette = ['#cbd9c8','#d7dfcb','#bcd3c9','#dbe1cd','#c4d6c3','#cdddcf'];
  host.classList.add('province-atlas');
  host.innerHTML = `<svg viewBox="0 0 720 660" role="group" aria-label="云南16个州、市分区地图；点击地名了解地区，红星进入大理洱海">
    <defs>
      <pattern id="prefecture-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#738c8b" stroke-opacity=".1"/></pattern>
      <clipPath id="prefecture-clip">${outline}</clipPath>
      <filter id="province-cloud-soft"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <rect x="35" y="20" width="650" height="605" fill="url(#prefecture-grid)" aria-hidden="true"/>
    <g class="province-shadow" transform="translate(0 7)" aria-hidden="true">${outline}</g>
    <g class="prefecture-base" aria-hidden="true">${outline}</g>
    <g clip-path="url(#prefecture-clip)">${regions.map((r,i) => `<g class="prefecture-region" data-prefecture="${r.id}" role="button" tabindex="0" aria-label="查看${escape(r.name)}" aria-pressed="false"><title>${escape(r.name)}</title><path class="prefecture-area" d="${r.path}" fill="${palette[i%palette.length]}" fill-rule="evenodd"/></g>`).join('')}</g>
    <g class="province-cloud-layer" clip-path="url(#prefecture-clip)" aria-hidden="true" pointer-events="none"><g class="province-cloud province-cloud-one" filter="url(#province-cloud-soft)"><ellipse cx="240" cy="150" rx="112" ry="15"/><ellipse cx="292" cy="145" rx="68" ry="23"/></g><g class="province-cloud province-cloud-two" filter="url(#province-cloud-soft)"><ellipse cx="460" cy="443" rx="130" ry="14"/><ellipse cx="407" cy="440" rx="67" ry="21"/></g><path class="province-wind" d="M90 393C150 348 185 406 230 365S305 321 330 339M407 163C455 130 504 182 546 151"/></g>
    ${regions.map(r => `<g class="prefecture-label" data-prefecture="${r.id}" role="button" tabindex="0" aria-label="选择${escape(r.name)}" aria-pressed="false" transform="translate(${r.label[0]} ${r.label[1]})"><rect class="prefecture-label-hit" x="${-r.short.length*12-7}" y="-18" width="${r.short.length*24+14}" height="36" rx="12"/><text text-anchor="middle" dominant-baseline="central" ${r.vertical?'writing-mode="vertical-rl"':''}>${escape(r.short)}</text></g>`).join('')}
    <g class="province-star prefecture-dali-star" id="dali-star" transform="translate(${geometry.star[0]} ${geometry.star[1]})" role="button" tabindex="0" aria-label="进入大理洱海地图"><title>大理洱海 · 点击开启漫游</title><circle class="star-pulse" r="18"/><circle class="star-locator" r="20"/><circle r="25" fill="transparent"/><text class="star-symbol" text-anchor="middle" dominant-baseline="middle">★</text><text class="prefecture-open-label" x="0" y="37" text-anchor="middle">洱海 ↗</text></g>
    <g class="province-compass" transform="translate(646 62)" aria-hidden="true"><circle cx="6" cy="10" r="27"/><path d="M0 22 6 0 12 22 6 17Z"/><text x="6" y="-26" text-anchor="middle" class="map-compass">N</text></g>
    <text class="province-map-caption" x="66" y="620" aria-hidden="true">云在走，风景在等你。</text>
  </svg>`;
  directory.innerHTML = regions.map(r => `<button type="button" data-prefecture="${r.id}" aria-pressed="false"><span>${escape(r.short)}</span><small>${r.id==='dali'?'漫游已开放':'尚未开放'}</small></button>`).join('');

  function select(id) {
    const region = regions.find(r => r.id===id);
    if(!region) return;
    for(const button of document.querySelectorAll('[data-prefecture]')) {
      const selected = button.dataset.prefecture===id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    const open = id==='dali';
    const introductions={kunming:'从一座城的街巷出发，认识滇中的日常。',qujing:'把下一段旅程，留给滇东的山野与城镇。',yuxi:'下一次，慢慢走近湖泊与村落。',baoshan:'越过山地，把目光投向滇西。',zhaotong:'沿着滇东北的山路，想象下一段出发。',lijiang:'在雪山与古城之间，留一个下次见的约定。',puer:'把脚步放慢，期待一段茶山旅程。',lincang:'下一站，想去山间的村落坐一坐。',chuxiong:'走近滇中的山地，期待更多地方故事。',honghe:'下一段旅程，留给梯田与村落。',wenshan:'向滇东南出发，期待山水之间的生活。',xishuangbanna:'让下一段旅程，带一点热带的绿意。',dehong:'下一次，把目光投向云南西边。',nujiang:'沿着峡谷，想象一段更深的山地旅程。',diqing:'往更高的地方，寻找下一段风景。'};
    document.getElementById('province-selection-name').textContent=region.name;
    document.getElementById('province-selection-status').textContent=open?'漫游已开放':region.kind+' · 漫游尚未开放';
    document.getElementById('province-selection-copy').textContent=open?'点击红星，走进苍山洱海与白族村落。':(introductions[id]||'把下一段旅程，留给这里。')+' 此地区暂未开放漫游，可先体验大理。';
    document.getElementById('province-enter').hidden=!open;
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
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('province-motion');
  let motion=!reducedMotion.matches, visible=true;
  function syncMotion() {
    host.classList.toggle('is-paused',!motion||!visible||document.hidden||reducedMotion.matches);
    motionButton.disabled=reducedMotion.matches;
    motionButton.setAttribute('aria-pressed',String(motion&&!reducedMotion.matches));
    motionButton.textContent=reducedMotion.matches?'静态模式':motion?'暂停云影':'开启云影';
  }
  motionButton.addEventListener('click',()=>{motion=!motion;syncMotion();});
  reducedMotion.addEventListener('change',()=>{motion=!reducedMotion.matches;syncMotion();});
  document.addEventListener('visibilitychange',syncMotion);
  if('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;syncMotion();}).observe(host);
  select('dali');syncMotion();
};
