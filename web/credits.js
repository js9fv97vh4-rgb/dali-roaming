/* Keep sources grouped by the places that actually use the image. */
window.showMediaCredits = () => {
  const host=document.getElementById('credits-list');
  if(host.childElementCount)return;
  const records=[];
  const add=(city,spot,photos)=>photos.forEach(photo=>records.push({city,spot,photo}));
  add('大理','洱海',[window.DALI_OVERVIEW,...DALI_SHORE_PHOTOS]);
  for(const p of DALI_PLACES)add('大理',p.name,DALI_GALLERIES[p.id]||[]);
  add('大理','洱海渔灯',DALI_NIGHT_PHOTOS);
  for(const p of LIJIANG_DATA.places)add('丽江',p.name,p.photos);
  for(const photo of KUNMING_DATA.cityPhotos)add('昆明',photo.location,[photo]);
  for(const p of KUNMING_DATA.places)add('昆明',p.name,p.photos);
  const filters=document.createElement('div');filters.className='credit-filters';
  function field(label){
    const wrap=document.createElement('label');wrap.textContent=label+' ';
    const select=document.createElement('select');wrap.append(select);filters.append(wrap);return select;
  }
  const city=field('目的地'),spot=field('地点'),kind=field('影像');
  function options(select,values){select.replaceChildren(...values.map(v=>new Option(v,v)));}
  options(city,['全部','大理','丽江','昆明']);options(kind,['全部','实拍摄影','AI生成 · 艺术演绎']);
  const output=document.createElement('div');host.append(filters,output);
  const art=document.createElement('p');art.textContent='地图中的青绿山水、页边山岚及扎染纹理由 OpenAI imagegen 辅助创作。丽江漫游主题插画由 OpenAI imagegen 于 2026 年 11 月 25 日生成。湖面灯影为模拟效果。';host.append(art);
  function show(){
    let rows=records.filter(r=>(city.value==='全部'||city.value===r.city)&&(spot.value==='全部'||spot.value===r.spot));
    output.replaceChildren();
    for(const title of ['实拍摄影','AI生成 · 艺术演绎']){
      if(kind.value!=='全部'&&kind.value!==title)continue;
      const unique=new Map();
      rows.filter(r=>MediaCredits.isAI(r.photo)===(title!=='实拍摄影')).forEach(r=>{const key=r.photo.src||r.photo.image;if(!unique.has(key))unique.set(key,r);});
      if(!unique.size)continue;
      const h=document.createElement('h3');h.textContent=title+' · '+unique.size+' 幅';output.append(h);
      for(const {city,spot,photo} of unique.values()){
        const item=document.createElement('p');item.className='credit-item';
        const name=document.createElement('strong');name.textContent=city+' · '+spot;
        const detail=document.createElement('span');detail.innerHTML=MediaCredits.credit(photo);
        item.append(name,document.createTextNode('　'+(photo.caption||spot)),document.createElement('br'),detail);output.append(item);
      }
    }
    if(!output.childElementCount)output.textContent='所选地点没有这一类影像。';
  }
  function updateSpots(){options(spot,['全部',...new Set(records.filter(r=>city.value==='全部'||r.city===city.value).map(r=>r.spot))]);show();}
  city.onchange=updateSpots;spot.onchange=kind.onchange=show;updateSpots();
};
