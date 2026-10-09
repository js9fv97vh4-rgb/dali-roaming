import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('every scenic gallery is complete and declares local or external photo rights',async()=>{
  const ctx={window:{}};vm.createContext(ctx);
  for(const name of ['places','gallery-data','lantern-data','map-data'])vm.runInContext(await fs.readFile(`web/${name}.js`,'utf8'),ctx);
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
        for(const file of [p.src,p.thumb])await fs.access('web/'+file);
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
  assert.equal(visited.size,local.size+remote.size);
  const declared=new Set(manifest.photos.flatMap(p=>[p.src,p.thumb].filter(Boolean)).concat(['assets/dali-indigo-ui-texture.webp']));
  for(const name of (await fs.readdir('web/assets')).filter(n=>/\.(?:webp|jpg|png)$/.test(n)))assert.ok(declared.has('assets/'+name),'unlisted image '+name);
  assert.equal(ctx.window.DALI_GALLERIES.zhoucheng.length,3);
  assert.ok(ctx.window.DALI_GALLERIES.zhoucheng.every(p=>p.shotDate==='2025-11-21'));
  const html=await fs.readFile('web/index.html','utf8');
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g))await fs.access('web/'+match[1]);
  assert.match(html,/新华社记者胡超/);
  assert.doesNotMatch(html,/DataV|zhoucheng-architecture/);
  await assert.rejects(fs.access('.openai/hosting.json'));
});
