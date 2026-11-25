/* Kunming uses the shared hash router and keeps its photos local to this page. */
(() => {
  const $ = id => document.getElementById(id);
  const page = $('kunming-page');
  if (!page || !window.KUNMING_DATA) return;

  const {places} = window.KUNMING_DATA;
  const byId = new Map(places.map(place => [place.id, place]));
  const tea = byId.get('tea-coffee');
  const story = $('km-story');
  const dialog = $('km-photo-dialog');
  const loader = DaliPhotos.createLoader();
  const saved = TravelSaved.get('kunming');

  let initialized = false;
  let selected = 'jacaranda';
  let mapSelection = selected;
  let filter = 'all';
  let zoom = 1;
  let lastPage, opener, displayedPhoto;
  let locateAfterClose = false;
  let displayedHub = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]
  ));
  const href = (spot, view = {}) => DaliViews.format({page:'kunming', spot, ...view});
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  const origin = photo => MediaCredits.isAI(photo) ? MediaCredits.label(photo) : photo.shotDate ? photo.shotDate.slice(0,4) + ' 年实拍' : '报道配图';
  const pin = id => page.querySelector(`.km-pin[data-km-spot="${id}"]`);

  function go(view, replace = false) {
    const hash = DaliViews.format({page:'kunming', ...view});
    if (hash !== location.hash) {
      const isPhoto = view.frame !== undefined;
      const parent = isPhoto ? (history.state?.kmParent || location.hash) : null;
      history[replace ? 'replaceState' : 'pushState']({...history.state, kmParent:parent}, '', hash);
    }
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function media(photo, {thumbnail = false, control = '', badge = false} = {}) {
    const src = thumbnail ? photo.thumb : photo.src;
    const width = thumbnail ? photo.thumbWidth : photo.width;
    const height = thumbnail ? photo.thumbHeight : photo.height;
    return `<div class="km-media" data-km-media data-src="${esc(src)}" ${photo.remote ? 'data-remote' : ''}>
      <img ${photo.remote ? 'hidden' : `src="${esc(src)}"`} alt="${esc(photo.caption)}" width="${width}" height="${height}"
        loading="lazy" decoding="async" referrerpolicy="no-referrer" data-photo-managed="true">
      ${control}${(badge || MediaCredits.isAI(photo)) ? `<span class="km-photo-origin">${origin(photo)}</span>` : ''}
      <div class="km-image-status" hidden>
        <span role="status">影像正在载入…</span>
        <div class="km-image-recovery" hidden>
          <button type="button" data-km-retry>重试</button>
          <a href="${esc(photo.source)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>
        </div>
      </div>
    </div>`;
  }

  function imageStatus(box, status) {
    const img = box.querySelector('img');
    const message = box.querySelector('.km-image-status');
    box.dataset.state = status;
    img.hidden = status !== 'ready';
    message.hidden = status === 'ready';
    message.querySelector('[role="status"]').textContent = status === 'error' ? '影像暂时无法加载' : '影像正在载入…';
    message.querySelector('.km-image-recovery').hidden = status !== 'error';
  }

  async function loadImage(box) {
    if (!box.isConnected || box.dataset.state === 'loading') return;
    const retryFocused = box.contains(document.activeElement) && document.activeElement.matches('[data-km-retry]');
    const img = box.querySelector('img');
    imageStatus(box, 'loading');
    try {
      img.src = await loader.load(box.dataset.src);
      if (!box.isConnected) return;
      imageStatus(box, 'ready');
      if (retryFocused && document.activeElement === document.body) box.querySelector('.km-media-action')?.focus();
    } catch {
      if (!box.isConnected) return;
      imageStatus(box, 'error');
      if (retryFocused && document.activeElement === document.body) box.querySelector('[data-km-retry]').focus();
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      loadImage(target);
    }
  }, {rootMargin:'180px'});

  function observeImages(root) {
    root.querySelectorAll('[data-km-media][data-remote]').forEach(box => observer.observe(box));
  }

  function saveButton(place) {
    return `<button type="button" data-km-save="${place.id}"></button>`;
  }

  function refreshSaved() {
    page.querySelectorAll('[data-km-save]').forEach(button => {
      const place = byId.get(button.dataset.kmSave);
      const checked = saved.has(place.id);
      button.setAttribute('aria-pressed', String(checked));
      button.setAttribute('aria-label', `${checked ? '取消收藏' : '收藏'}${place.name}`);
      button.textContent = checked ? '已收藏 −' : '收藏 ＋';
    });
    $('km-saved-count').textContent = saved.size;
  }

  function renderFeature() {
    const current = byId.get(selected);
    if (current.pin) mapSelection = current.id;
    const place = byId.get(mapSelection);
    const feature = $('km-feature');
    feature.innerHTML = media(place.photos[0], {thumbnail:true}) + `
      <div class="km-feature-copy"><small>${esc(place.label)}</small><h3>${esc(place.name)}</h3>
        <p>${esc(place.tagline)}</p>
        <a href="${href(place.id)}" data-km-read="${place.id}">看影像与详情 ↗</a>
      </div>`;
    page.querySelectorAll('[data-km-marker]').forEach(marker => {
      marker.classList.toggle('is-current', marker.dataset.kmMarker === mapSelection);
    });
    page.querySelectorAll('.km-pin').forEach(link => {
      if (link.dataset.kmSpot === mapSelection) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function renderCollection() {
    const visible = places.filter(place =>
      filter === 'all' || (filter === 'saved' ? saved.has(place.id) : place.group === filter)
    );
    $('km-cards').innerHTML = visible.filter(place => place.pin).map(place => `
      <article class="km-card" data-km-card="${place.id}">
        ${media(place.photos[0], {thumbnail:true,badge:true,control:`
          <a href="${href(place.id)}" class="km-media-action" data-km-read="${place.id}" aria-label="查看${esc(place.name)}"><span aria-hidden="true">↗</span></a>`})}
        <div class="km-card-copy">
          <small>${esc(place.label)}</small>
          <h3><a href="${href(place.id)}" data-km-read="${place.id}">${esc(place.name)}</a></h3>
          <p>${esc(place.tagline)}</p>${saveButton(place)}
        </div>
      </article>`).join('');
    $('km-tea').hidden = !visible.includes(tea);
    $('km-empty').hidden = visible.length > 0;
    page.querySelectorAll('[data-km-filter]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.kmFilter === filter))
    );
    refreshSaved();
  }

  function renderStory() {
    const place = byId.get(selected);
    const [photo, ...photos] = place.photos;
    story.innerHTML = `
      <div class="km-story-heading">
        <span>${esc(place.label)}</span>
        <button type="button" data-km-dismiss aria-label="关闭${esc(place.name)}详情">收起 ×</button>
      </div>
      <div class="km-story-grid">
        <figure>
          ${media(photo, {badge:true,control:`<button type="button" class="km-media-action" data-km-frame="0">查看完整影像 ↗</button>`})}
          <figcaption>${esc(photo.caption)}<br>${MediaCredits.credit(photo)}</figcaption>
        </figure>
        <div class="km-story-copy">
          <h2 id="km-story-title" tabindex="-1">${esc(place.name)}</h2>
          <p class="km-story-lead">${esc(place.tagline)}</p>
          <p>${esc(place.story)}</p>
          <p class="km-looking">${esc(place.look)}</p>
          <p class="km-season">${esc(place.note)}</p>
          <div class="km-story-actions">
            ${saveButton(place)}
            <button type="button" data-km-locate>${place.pin ? '回到地图' : '回到茶与咖啡'} ↗</button>
            <button type="button" data-km-share>分享这一处</button>
          </div>
          <p id="km-share-feedback" role="status" class="km-feedback"></p>
          <a class="km-reference" href="${esc(place.reference)}" target="_blank" rel="noopener noreferrer">查看地点资料 ↗</a>
        </div>
      </div>
      ${photos.length ? `<div class="km-photo-rail" aria-label="${esc(place.name)}更多影像">
        ${photos.map((photo, index) => `<figure>
          ${media(photo, {thumbnail:true,control:`<button type="button" class="km-media-action" data-km-frame="${index + 1}" aria-label="查看${esc(photo.caption)}">↗</button>`})}
          <figcaption>${esc(photo.caption)}<br>${MediaCredits.credit(photo)}</figcaption>
        </figure>`).join('')}
      </div>` : ''}`;
    refreshSaved();
    observeImages(story);
  }

  function renderPhoto(index) {
    const place = byId.get(selected);
    const photo = place.photos[index];
    const wasOpen = dialog.open;
    if (wasOpen && displayedPhoto === photo) return;
    displayedPhoto = photo;
    const step = document.activeElement?.dataset.kmStep;
    if (!wasOpen) opener = document.activeElement;
    $('km-photo-content').innerHTML = `
      <header>
        <h2 id="km-photo-title">${esc(place.name)} <span>${index + 1} / ${place.photos.length}</span></h2>
        <button type="button" data-km-photo-close aria-label="关闭完整影像">关闭 ×</button>
      </header>
      <div class="km-lightbox-stage">
        ${media(photo)}
        <button type="button" data-km-step="-1" aria-label="上一张影像" ${place.photos.length === 1 ? 'disabled' : ''}>←</button>
        <button type="button" data-km-step="1" aria-label="下一张影像" ${place.photos.length === 1 ? 'disabled' : ''}>→</button>
      </div>
      <footer>
        <strong>${esc(photo.caption)}</strong><p>${MediaCredits.credit(photo)}</p>
        <button type="button" data-km-photo-map>返回${place.pin ? '地图' : '茶与咖啡'} ↗</button>
      </footer>`;
    if (!wasOpen) dialog.showModal();
    else (dialog.querySelector(`[data-km-step="${step}"]`) || dialog.querySelector('[data-km-photo-close]')).focus();
    observeImages(dialog);
    document.body.classList.add('dialog-open');
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    $('km-source-details').innerHTML = places.map(place => `<section>
      <h3>${esc(place.name)}</h3>
      ${place.photos.map(photo => `<p>${esc(photo.caption)}<br>${MediaCredits.credit(photo)}</p>`).join('')}
      <a href="${esc(place.reference)}" target="_blank" rel="noopener noreferrer">地点与生活资料 ↗</a>
    </section>`).join('');
    renderCollection();
    renderFeature();
  }

  function sync() {
    const view = DaliViews.parse(location.hash);
    const entered = lastPage !== 'kunming';
    lastPage = view.page;
    if (view.page !== 'kunming') return;
    initialize();
    const changed = !!view.spot && view.spot !== selected;
    if (changed) {
      selected = view.spot;
      renderFeature();
    }
    if (view.spot && (changed || entered || story.hidden)) renderStory();
    story.hidden = !view.spot;
    for(const trigger of page.querySelectorAll('[data-city-note]')){
      const opened=trigger.dataset.cityNote===view.panel;
      $('city-'+trigger.dataset.cityNote).hidden=!opened;
      trigger.setAttribute('aria-expanded',String(opened));
    }
    const hub=view.panel==='arrival'?(view.hub||'rail'):null;
    if(hub)selectHub(page.querySelector('[data-hub="'+hub+'"]'));
    if(hub!==displayedHub){
      page.querySelector('.arrival-photo').open=hub==='south';
      displayedHub=hub;
    }
    if (view.frame !== undefined) renderPhoto(view.frame);
    if (entered) {
      window.scrollTo(0,0);
      if(view.panel)requestAnimationFrame(()=>$('city-'+view.panel).scrollIntoView({block:'start'}));
      if (view.spot && view.frame === undefined) requestAnimationFrame(() => story.scrollIntoView({block:'start'}));
    }
  }

  function locate(id) {
    const viewport = $('km-map-viewport');
    const marker = pin(id);
    const teaSection = $('km-tea');
    if (id === tea.id && teaSection.hidden) {
      filter = 'city';
      renderCollection();
    }
    const target = id === tea.id ? teaSection : $('km-atlas');
    target.scrollIntoView({behavior:motion(),block:'start'});
    if (marker) {
      viewport.scrollTo({
        left:marker.offsetLeft - viewport.clientWidth / 2,
        top:marker.offsetTop - viewport.clientHeight / 2,
        behavior:motion()
      });
    }
    (marker || (id === tea.id ? $('km-tea-read') : $('km-atlas-title'))).focus({preventScroll:true});
  }

  function closePhoto(returnToMap = false) {
    locateAfterClose = returnToMap;
    const parent = DaliViews.parse(history.state?.kmParent || '');
    if (parent.page === 'kunming' && parent.spot === selected && parent.frame === undefined) history.back();
    else go({spot:selected}, true);
  }

  function toggleSaved(button) {
    const id = button.dataset.kmSave;
    const persistent=TravelSaved.toggle('kunming',id);
    $('km-feedback').textContent=persistent?(saved.has(id)?'已收藏。':'已移除收藏。'):'收藏仅在本次打开期间有效。';
    if(!button.isConnected)page.querySelector('[data-km-filter="saved"]').focus();
  }

  window.addEventListener('savedchange',e=>{
    if(e.detail.city!=='kunming'||!initialized)return;
    if(filter==='saved')renderCollection();
    refreshSaved();
  });
  const hubNotes = {
    rail: ['铁路 · 主城南侧', '昆明站', '车票写「昆明」，抵达的是主城南侧的昆明站。想先逛昆明老街、南屏街，可以从这一带安排进城后的第一段。'],
    south: ['铁路 · 主城东南', '昆明南站', '车票写「昆明南」，下车地点在呈贡。去斗南花市可以先看滇池东岸的点位；进老街或翠湖，则要向主城方向走。'],
    airport: ['航空 · 主城东北', '昆明长水国际机场', '飞机降落在长水，主城在机场西南方向。订接机或约人碰面时，先确认航站楼和到达出口。']
  };
  function selectHub(button) {
    const [bearing, name, description] = hubNotes[button.dataset.hub];
    $('hub-bearing').textContent = bearing;
    $('hub-name').textContent = name;
    $('hub-description').textContent = description;
    for (const pin of $('city-arrival').querySelectorAll('[data-hub]')) {
      pin.setAttribute('aria-pressed', String(pin === button));
    }
  }
  page.addEventListener('click',event=>{
    const b=event.target.closest('[data-city-note],[data-city-close],[data-hub]');if(!b)return;
    if(b.dataset.hub){go({panel:'arrival',hub:b.dataset.hub});return;}
    const key=b.dataset.cityNote||b.closest('.city-note').id.slice(5);
    const opened=!!b.dataset.cityNote&&$('city-'+key).hidden;
    go(opened?{panel:key}:{});
    (opened?$('city-'+key).querySelector('h3'):page.querySelector('[data-city-note="'+key+'"]')).focus();
  });
  function zoomMap(action) {
    zoom = action === 'reset' ? 1 : Math.max(1, Math.min(1.8, (Math.round(zoom * 10) + (action === 'in' ? 2 : -2)) / 10));
    $('km-map').style.width = `${zoom * 100}%`;
    $('km-zoom-level').textContent = `${Math.round(zoom * 100)}%`;
    page.querySelector('[data-km-zoom="out"]').disabled = zoom === 1;
    page.querySelector('[data-km-zoom="in"]').disabled = zoom === 1.8;
    if (zoom === 1) $('km-map-viewport').scrollTo(0,0);
  }

  function click(event) {
    const control = event.target.closest('button,a');
    if (!control) return;
    const data = control.dataset;
    if (data.kmRead || data.kmSpot) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go({spot:data.kmRead || data.kmSpot});
      if(data.kmSpot){
        const place=byId.get(data.kmSpot);
        window.showMapReceipt?.(control,$('km-atlas'),$('km-feature').querySelector('[data-km-read]'),place.name,place.photos[0]);
      }
      if (data.kmRead) {
        story.scrollIntoView({behavior:motion(),block:'start'});
        $('km-story-title').focus({preventScroll:true});
      }
    } else if (data.kmSave) {
      toggleSaved(control);
    } else if (data.kmFilter) {
      filter = data.kmFilter;
      renderCollection();
    } else if ('kmDismiss' in data) {
      go({});
      locate(selected);
    } else if ('kmAtlas' in data) {
      locate();
    } else if ('kmLocate' in data) {
      locate(selected);
    } else if ('kmFrame' in data) {
      go({spot:selected,frame:Number(data.kmFrame)});
    } else if (data.kmStep) {
      const {frame} = DaliViews.parse(location.hash);
      const count = byId.get(selected).photos.length;
      go({spot:selected,frame:(frame + Number(data.kmStep) + count) % count}, true);
    } else if ('kmPhotoClose' in data) {
      closePhoto();
    } else if ('kmPhotoMap' in data) {
      closePhoto(true);
    } else if ('kmShare' in data) {
      const url = new URL(location.href);
      url.hash = href(selected);
      Promise.resolve().then(() => navigator.clipboard.writeText(url.href)).then(
        () => $('km-share-feedback') && ($('km-share-feedback').textContent = '这一处的链接已复制。'),
        () => $('km-share-feedback') && ($('km-share-feedback').textContent = '可复制链接分享：' + url.href)
      );
    } else if (data.kmZoom) {
      zoomMap(data.kmZoom);
    } else if ('kmRetry' in data) {
      loadImage(control.closest('[data-km-media]'));
    }
  }

  function onImageError(event) {
    const img = event.target;
    if (img.tagName !== 'IMG') return;
    const box = img.closest('[data-km-media]');
    if (box) imageStatus(box,'error');
    else if (img.matches('[data-km-terrain]')) img.hidden = true;
  }

  page.addEventListener('click', click);
  dialog.addEventListener('click', click);
  page.addEventListener('error', onImageError, true);
  dialog.addEventListener('error', onImageError, true);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePhoto(); });
  dialog.addEventListener('close', () => {
    if (lastPage === 'kunming') {
      if (locateAfterClose) locate(selected);
      else if (opener?.isConnected) opener.focus({preventScroll:true});
      else story.querySelector('[data-km-frame]')?.focus({preventScroll:true});
    }
    locateAfterClose = false;
    displayedPhoto = undefined;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
  });
  dialog.addEventListener('keydown', event => {
    const step = {'ArrowLeft':-1,'ArrowRight':1}[event.key];
    if (!step) return;
    event.preventDefault();
    dialog.querySelector(`[data-km-step="${step}"]`)?.click();
  });
  window.addEventListener('destinationchange', sync);
  sync();
})();
