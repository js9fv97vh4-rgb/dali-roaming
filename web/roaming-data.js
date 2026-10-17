/* Editorial planning ranges; excludes transport, queues and meals. */
window.DALI_VISITS = {
  'fengyangyi':{minutes:[60,90],mode:'村内步行'},
  'ancient-town':{minutes:[120,180],mode:'街巷步行'},
  'longkan':{minutes:[45,60],mode:'湖岸步行'},
  'caicun':{minutes:[45,90],mode:'步行 / 自行车'},
  'panxi':{minutes:[45,60],mode:'步行 / 自行车'},
  'xizhou':{minutes:[90,120],mode:'镇内步行'},
  'wenbi':{minutes:[45,60],mode:'村内步行'},
  'xiaoputuo':{minutes:[30,45],mode:'岸边步行'},
  'shuanglang':{minutes:[90,150],mode:'镇内步行'},
  'santasi':{minutes:[90,150],mode:'景区步行'},
  'cangshan':{minutes:[180,240],mode:'索道 / 山间步道'},
  'jizhaoan':{minutes:[60,90],mode:'山间步行'},
  'haishe':{minutes:[45,90],mode:'园内步行'},
  'wase':{minutes:[45,60],mode:'镇内步行'},
  'zhoucheng':{minutes:[60,120],mode:'村内步行 / 手作'}
};
window.DALI_TOURS = [
  {id:'shore',name:'风从洱海来',en:'A JOURNEY ALONG THE LAKE',label:'山海长卷 · 75 秒',plan:'一日灵感 · 海西到海东',cover:'assets/shuanglang-blue-lake.webp',stops:[
    {id:'ancient-town',line:'从一座城门出发，山海有了日常的尺度。',period:'day',photo:0,photos:[4, 0, 1]},
    {id:'caicun',line:'穿过村落，第一眼开阔的洱海就在路的尽头。',period:'day',photo:0,photos:[0, 1, 3]},
    {id:'panxi',line:'沿着湖岸转一个弯，把赶路换成看水。',period:'day',photo:1,photos:[1, 0, 2]},
    {id:'xizhou',line:'风越过田野，停在青瓦白墙之间。',period:'day',photo:0,photos:[0, 4, 5, 7]},
    {id:'shuanglang',line:'来到另一岸，回望刚刚走过的山与水。',period:'dusk',photo:0,photos:[1, 4, 2, 0]}
  ]},
  {id:'villages',name:'把时光染成蓝',en:'BETWEEN COURTYARDS AND INDIGO',label:'村落与手艺 · 60 秒',plan:'一日灵感 · 古城、喜洲与周城',cover:'assets/xizhou-square.webp',stops:[
    {id:'ancient-town',line:'走进古城，从屋檐下的生活开始认识大理。',period:'day',photo:1,photos:[4, 0, 1]},
    {id:'xizhou',line:'把脚步放慢，看看一座白族院落如何迎接阳光。',period:'day',photo:2,photos:[0, 4, 5, 7]},
    {id:'zhoucheng',line:'一块白布、一束线结，让今天留下自己的纹样。',period:'day',photo:2},
    {id:'haishe',line:'最后走向水边，让手里的靛蓝与眼前的湖色相遇。',period:'dusk',photo:0,photos:[0, 2, 1]}
  ]},
  {id:'halfday',name:'半日，留给湖岸',en:'SLOW DOWN BY THE WATER',label:'轻轻出发 · 45 秒',plan:'半日灵感 · 海西慢行',cover:'assets/caicun.jpg',stops:[
    {id:'caicun',line:'不用走得太远，先在村口找到通向湖边的路。',period:'day',photo:0,photos:[0, 1, 3]},
    {id:'panxi',line:'沿着水面走一段，让风把这一程慢慢拉长。',period:'day',photo:1,photos:[1, 0, 2]},
    {id:'xizhou',line:'在古镇收住脚步，把剩下的时间留给一张长椅。',period:'dusk',photo:0,photos:[0, 4, 5, 7]}
  ]}
];
/* Pure timeline sampling is shared with browser playback and regression tests. */
globalThis.sampleDaliTour = (stops, value) => {
  const position = Math.max(0, Math.min(stops.length, Number(value) || 0));
  const index = Math.min(stops.length - 1, Math.floor(position));
  const progress = Math.min(1, position - index);
  return {index, progress, stop:stops[index], ended:position >= stops.length};
};

// Select a different real photograph for each beat, preserving the editorial opener.
globalThis.sampleDaliTourPhoto = (photos, first, progress, sequence) => {
  const start=Math.min(photos.length-1,Math.max(0,first||0));
  const order=sequence?.filter(i=>Number.isInteger(i)&&i>=0&&i<photos.length);
  const count=order?.length||Math.min(4,photos.length);
  const beat=Math.min(count-1,Math.floor(Math.max(0,Math.min(1,progress))*count));
  return {index:order?.length?order[beat]:(start+Math.floor(beat*photos.length/count))%photos.length,beat,count};
};
