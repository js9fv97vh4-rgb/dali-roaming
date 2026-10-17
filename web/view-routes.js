/* Shareable views for static hosting. Invalid URLs safely return to the map. */
(() => {
  const placeIds = new Set(['fengyangyi','ancient-town','longkan','caicun','panxi','xizhou','wenbi','xiaoputuo','shuanglang','santasi','cangshan','jizhaoan','haishe','wase','zhoucheng']);
  function parse(hash) {
    const [base, query = ''] = hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(query);
    const view = { page: (base.startsWith('erhai') || base === 'tour-collection') ? 'erhai' : 'yunnan', culture: base === 'erhai-culture' };
    if (placeIds.has(params.get('scene'))) view.scene = params.get('scene');
    if (['panorama','night','itinerary','credits','walk','tour'].includes(params.get('view'))) view.modal = params.get('view');
    if (view.scene) delete view.modal;
    if (view.modal === 'walk') view.chapter = Math.max(0, Math.min(2, Number(params.get('chapter')) || 0));
    if (view.modal === 'tour') { view.tour = params.get('route') || 'shore'; view.step = Math.max(0, Number(params.get('step')) || 0); }
    if ((view.scene || ['night','walk'].includes(view.modal)) && /^\d+$/.test(params.get('photo') || '')) view.photo = Number(params.get('photo'));
    return view;
  }
  function format(view) {
    const params = new URLSearchParams();
    if (view.scene) params.set('scene', view.scene);
    else if (view.modal) params.set('view', view.modal);
    if (view.modal === 'walk') params.set('chapter', view.chapter || 0);
    if (view.modal === 'tour') { params.set('route', view.tour || 'shore'); params.set('step', view.step || 0); }
    if (view.photo !== undefined) params.set('photo', view.photo);
    return '#' + (view.culture ? 'erhai-culture' : view.page || 'erhai') + (params.size ? '?' + params : '');
  }
  function parent(view) {
    if (view.photo !== undefined) { const next = {...view}; delete next.photo; return next; }
    return {page:view.page, culture:view.culture};
  }
  globalThis.DaliViews = {parse, format, parent};
})();
