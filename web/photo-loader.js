/* Small previews share a bounded queue; a stalled host never occupies it forever. */
(() => {
  function createLoader({ImageClass=Image,concurrency=3,timeout=8000}={}){
    const cache=new Map(),queue=[];let active=0;
    function pump(){
      while(active<concurrency&&queue.length){
        const {url,resolve,reject}=queue.shift();active++;
        const image=new ImageClass();let settled=false;
        const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;active--;if(error){cache.delete(url);image.src='';reject(error);}else resolve(url);pump();};
        const timer=setTimeout(()=>finish(new Error('照片加载超时')),timeout);
        image.referrerPolicy='no-referrer';image.decoding='async';
        image.onload=()=>{if(image.decode)image.decode().catch(()=>{}).then(()=>finish());else finish();};
        image.onerror=()=>finish(new Error('照片暂不可用'));image.src=url;
      }
    }
    return {load(url){let promise=cache.get(url);if(!promise){promise=new Promise((resolve,reject)=>queue.push({url,resolve,reject}));cache.set(url,promise);pump();}return promise;}};
  }
  const loader=createLoader();
  const preview=photos=>photos.find(p=>!p.remote&&!p.placeholder)||photos[0];
  async function attach(img,photo){
    if(!photo||img.dataset.photoState)return;
    img.dataset.photoManaged='true';img.dataset.photoState='loading';img.loading='eager';img.decoding='async';
    const parent=img.parentElement;
    parent?.setAttribute('aria-busy','true');
    try{
      const url=await loader.load(photo.preview||photo.thumb||photo.src);
      img.src=url;img.dataset.photoState='ready';
    }catch{
      img.dataset.photoState='failed';img.hidden=true;
      const note=document.createElement('span');note.className='photo-unavailable';note.textContent='实景暂不可用';parent?.append(note);
    }finally{parent?.setAttribute('aria-busy','false');}
  }
  window.DaliPhotos={createLoader,preview,attach};
})();
