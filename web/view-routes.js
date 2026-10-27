/* Shareable views for static hosting. Invalid URLs safely return to the map. */
(() => {
  const placeIds = new Set(['fengyangyi','ancient-town','longkan','caicun','panxi','xizhou','wenbi','xiaoputuo','shuanglang','santasi','cangshan','jizhaoan','haishe','wase','zhoucheng']);
  function parse(hash) {
    const [base, query = ''] = hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(query);
    if (base === 'lijiang') {
      const view={page:'lijiang',culture:false};
      const place=globalThis.LIJIANG_DATA?.places.find(p=>p.id===params.get('spot'));
      if(place)view.spot=place.id;
      if(params.get('view')==='credits')view.modal='credits';
      else if(params.get('view')==='shuhe-night'){view.spot='shuhe';view.modal='lijiang-walk';view.step=Math.max(0,Math.min(4,Math.floor(Number(params.get('step')))||0));}
      else if(place&&/^\d+$/.test(params.get('frame')||'')){view.frame=Math.min(Number(params.get('frame')),place.photos.length-1);view.modal='lijiang-photo';}
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
    return view;
  }
  function format(view) {
    const params = new URLSearchParams();
    if(view.page==='lijiang'){
      if(view.spot)params.set('spot',view.spot);
      if(view.modal==='credits')params.set('view','credits');
      else if(view.modal==='lijiang-walk'){params.set('view','shuhe-night');params.set('step',view.step||0);}
      else if(view.spot&&view.frame!==undefined)params.set('frame',view.frame);
      return '#lijiang'+(params.size?'?'+params:'');
    }
    if (view.scene) params.set('scene', view.scene);
    else if (view.modal) params.set('view', view.modal);
    if (view.modal === 'walk') params.set('chapter', view.chapter || 0);
    if (view.modal === 'tour') { params.set('route', view.tour || 'shore'); params.set('step', view.step || 0); }
    if (view.photo !== undefined) params.set('photo', view.photo);
    return '#' + (view.culture ? 'erhai-culture' : view.page || 'erhai') + (params.size ? '?' + params : '');
  }
  function parent(view) {
    if(view.modal==='album')return {page:'erhai',culture:view.culture};
    if(view.page==='lijiang')return {page:'lijiang',...(view.spot?{spot:view.spot}:{})};
    if (view.photo !== undefined) { const next = {...view}; delete next.photo; return next; }
    return {page:view.page, culture:view.culture};
  }
  globalThis.DaliViews = {parse, format, parent};
})();
