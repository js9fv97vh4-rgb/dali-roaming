/* Shareable views for static hosting. Invalid URLs safely return to the map. */
(() => {
  const placeIds = new Set(['fengyangyi','ancient-town','longkan','caicun','panxi','xizhou','wenbi','xiaoputuo','shuanglang','santasi','cangshan','jizhaoan','haishe','wase','zhoucheng']);
  const photoList=view=>view.page==='lijiang'?globalThis.LIJIANG_DATA?.places.find(p=>p.id===view.spot)?.photos:view.scene?globalThis.DALI_GALLERIES?.[view.scene]:view.modal==='walk'?globalThis.DALI_GALLERIES?.['ancient-town']:undefined;
  const decode=(list,id)=>list?.some(p=>p.frame!==undefined)?list.findIndex(p=>p.frame===id):id;
  const encode=(list,index)=>list?.[index]?.frame??index;
  function parse(hash) {
    const [base, query = ''] = hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(query);
    if (base === 'kunming') {
      const view={page:'kunming',culture:false};
      const place=globalThis.KUNMING_DATA?.places.find(p=>p.id===params.get('spot'));
      if(place)view.spot=place.id;
      else if(['arrival','shopping'].includes(params.get('panel'))){
        view.panel=params.get('panel');
        if(view.panel==='arrival'&&['rail','south','airport'].includes(params.get('hub')))view.hub=params.get('hub');
      }
      if(params.get('view')==='credits')view.modal='credits';
      else if(place&&/^\d+$/.test(params.get('frame')||'')){
        const index=decode(place.photos,Number(params.get('frame')));
        if(index>=0&&index<place.photos.length){view.frame=index;view.modal='kunming-photo';}else view.imageUpdated=true;
      }
      return view;
    }
    if (base === 'lijiang') {
      const view={page:'lijiang',culture:false};
      const place=globalThis.LIJIANG_DATA?.places.find(p=>p.id===params.get('spot'));
      if(place)view.spot=place.id;
      if(params.get('view')==='credits')view.modal='credits';
      else if(params.get('view')==='shuhe-night'){view.spot='shuhe';view.modal='lijiang-walk';view.step=Math.max(0,Math.min(4,Math.floor(Number(params.get('step')))||0));}
      else if(place&&/^\d+$/.test(params.get('frame')||'')){const index=decode(place.photos,Number(params.get('frame')));if(index>=0&&index<place.photos.length){view.frame=index;view.modal='lijiang-photo';}else view.imageUpdated=true;}
      return view;
    }
    const view = { page: (base.startsWith('erhai') || base === 'tour-collection') ? 'erhai' : 'yunnan', culture: base === 'erhai-culture' };
    if (placeIds.has(params.get('scene'))) view.scene = params.get('scene');
    if (['panorama','night','itinerary','credits','walk','tour'].includes(params.get('view'))) view.modal = params.get('view');
    if(view.page==='erhai'&&['album','map'].includes(params.get('view')))view.modal=params.get('view');
    if (view.scene) delete view.modal;
    if (view.modal === 'walk') view.chapter = Math.max(0, Math.min(2, Number(params.get('chapter')) || 0));
    if (view.modal === 'tour') { view.tour = params.get('route') || 'shore'; view.step = Math.max(0, Number(params.get('step')) || 0); }
    if ((view.scene || ['night','walk','album'].includes(view.modal)) && /^\d+$/.test(params.get('photo') || '')) view.photo = Number(params.get('photo'));
    if(view.modal==='album'&&view.photo===undefined)view.photo=0;
    if(view.photo!==undefined){const index=decode(photoList(view),view.photo);if(index<0){delete view.photo;view.imageUpdated=true;}else view.photo=index;}
    return view;
  }
  function format(view) {
    const params = new URLSearchParams();
    if(view.page==='kunming'){
      if(view.spot)params.set('spot',view.spot);
      else if(view.panel){params.set('panel',view.panel);if(view.panel==='arrival'&&view.hub)params.set('hub',view.hub);}
      if(view.modal==='credits')params.set('view','credits');
      else if(view.spot&&view.frame!==undefined){const photos=globalThis.KUNMING_DATA?.places.find(p=>p.id===view.spot)?.photos;params.set('frame',encode(photos,view.frame));}
      return '#kunming'+(params.size?'?'+params:'');
    }
    if(view.page==='lijiang'){
      if(view.spot)params.set('spot',view.spot);
      if(view.modal==='credits')params.set('view','credits');
      else if(view.modal==='lijiang-walk'){params.set('view','shuhe-night');params.set('step',view.step||0);}
      else if(view.spot&&view.frame!==undefined)params.set('frame',encode(photoList(view),view.frame));
      return '#lijiang'+(params.size?'?'+params:'');
    }
    if (view.scene) params.set('scene', view.scene);
    else if (view.modal) params.set('view', view.modal);
    if (view.modal === 'walk') params.set('chapter', view.chapter || 0);
    if (view.modal === 'tour') { params.set('route', view.tour || 'shore'); params.set('step', view.step || 0); }
    if (view.photo !== undefined) params.set('photo', encode(photoList(view),view.photo));
    return '#' + (view.culture ? 'erhai-culture' : view.page || 'erhai') + (params.size ? '?' + params : '');
  }
  function parent(view) {
    if(view.modal==='album')return {page:'erhai',culture:view.culture};
    if(view.page==='kunming')return {page:'kunming',...(view.spot?{spot:view.spot}:{})};
    if(view.page==='lijiang')return {page:'lijiang',...(view.spot?{spot:view.spot}:{})};
    if (view.photo !== undefined) { const next = {...view}; delete next.photo; return next; }
    return {page:view.page, culture:view.culture};
  }
  globalThis.DaliViews = {parse, format, parent};
})();
