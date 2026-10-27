import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('every scenic gallery is complete and declares local or external photo rights',async()=>{
  const ctx={window:{}};vm.createContext(ctx);
  for(const name of ['places','gallery-data','lantern-data','map-data','lijiang-data'])vm.runInContext(await fs.readFile(`web/${name}.js`,'utf8'),ctx);
  assert.equal(ctx.window.DALI_PLACES.length,15);
  const manifest=JSON.parse(await fs.readFile('asset-sources.json','utf8'));
  const local=new Map(manifest.photos.map(p=>[p.src,p]));
  const remote=new Map(manifest.remoteReferences.map(p=>[p.src,p]));
  const visited=new Set();
  for(const [id,photos] of Object.entries(ctx.window.DALI_GALLERIES)){
    assert.ok(photos.length>=2,id+' requires multiple views');
    const place=ctx.window.DALI_PLACES.find(p=>p.id===id);
    assert.equal(place.image,photos[0].src);
    assert.equal(place.placeholder,false);
    for(const p of photos){
      assert.ok(!p.placeholder&&p.caption&&p.author&&p.source,id);
      assert.match(p.source,/^https:\/\//);
      assert.ok(p.width>0&&p.height>0);
      if(p.remote){
        assert.match(p.src,/^https:\/\//);
        assert.equal(p.redistributed,false);
        assert.equal(p.licenseUrl,null);
        assert.ok(remote.has(p.src));
      }else{
        assert.match(p.license,/^(CC BY-SA (2\.0|3\.0|4\.0)|CC0(?: 1\.0)?|Public domain|Unsplash License)$/);
        assert.ok(p.licenseUrl&&local.has(p.src));
        for(const file of [p.src,p.thumb,p.preview].filter(Boolean))await fs.access('web/'+file);
        assert.equal(local.get(p.src).width,p.width);
        assert.equal(local.get(p.src).height,p.height);
        assert.ok(p.thumbWidth>0&&p.thumbHeight>0);
      }
      visited.add(p.src);
    }
  }
  assert.equal(ctx.window.DALI_NIGHT_PHOTOS.length,4);
  for(const p of ctx.window.DALI_NIGHT_PHOTOS){
    assert.equal(p.location,'洱海渔灯');assert.equal(p.remote,true);assert.equal(p.redistributed,false);
    assert.ok(remote.has(p.src));visited.add(p.src);
  }
  visited.add(ctx.window.DALI_OVERVIEW.image);
  assert.equal(ctx.window.DALI_SHORE_PHOTOS.length,3);
  for(const photo of ctx.window.DALI_SHORE_PHOTOS){assert.equal(photo.location,'洱海');assert.equal(photo.ownerProvided,true);assert.equal(photo.source,photo.src);assert.equal(photo.redistributed,false);assert.match(photo.license,/摄影者保留版权/);assert(local.has(photo.src));await fs.access('web/'+photo.src);visited.add(photo.src);}
  for(const place of ctx.window.LIJIANG_DATA.places)for(const photo of place.photos){assert.ok((photo.remote?remote:local).has(photo.src));visited.add(photo.src);}
  assert.equal(visited.size,local.size+remote.size);
  const declared=new Set(manifest.photos.flatMap(p=>[p.src,p.thumb,p.preview].filter(Boolean)).concat([manifest.originalArt.src,manifest.map.preview.src]));
  await fs.access('web/'+manifest.map.preview.src);
  for(const name of (await fs.readdir('web/assets')).filter(n=>/\.(?:webp|jpg|png)$/.test(n)))assert.ok(declared.has('assets/'+name),'unlisted image '+name);
  assert.equal(ctx.window.DALI_GALLERIES.zhoucheng.filter(p=>p.remote).length,3);
  assert.ok(ctx.window.DALI_GALLERIES.zhoucheng.filter(p=>p.remote).every(p=>p.shotDate==='2025-11-21'));
  assert.equal(ctx.window.DALI_GALLERIES.zhoucheng[0].shotDate,'2007');
  const html=await fs.readFile('web/index.html','utf8');
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g))await fs.access('web/'+match[1]);
  assert.match(html,/新华社记者胡超/);
  assert.doesNotMatch(html,/DataV|zhoucheng-architecture/);
  // Local working copies may retain a Sites binding; it must stay outside version control.
  assert.match(await fs.readFile('.gitignore','utf8'), /^\.openai\/$/m);
});
