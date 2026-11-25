import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const s={URLSearchParams};s.window=s;vm.createContext(s);
for(const f of ['places','gallery-data','lijiang-data','view-routes','image-credit'])vm.runInContext(await readFile('web/'+f+'.js','utf8'),s);
const groups=[...Object.entries(s.DALI_GALLERIES).map(([id,photos])=>({id,photos,page:'erhai'})),...s.LIJIANG_DATA.places.map(p=>({...p,page:'lijiang'}))];
test('retained image share IDs resolve the same asset and roundtrip without reindexing',()=>{
 for(const g of groups){assert.equal(new Set(g.photos.map(p=>p.frame)).size,g.photos.length);
 g.photos.forEach((p,i)=>{const url=g.page==='lijiang'?'#lijiang?spot='+g.id+'&frame='+p.frame:'#erhai?scene='+g.id+'&photo='+p.frame;const v=s.DaliViews.parse(url);assert.equal(v.imageUpdated,undefined,url);assert.equal(g.photos[v.frame??v.photo].src,p.src,url);assert.equal(s.DaliViews.format(v),url);});}
});
test('retired photo IDs return to their own destination with an explicit update notice',async()=>{
 const retired=JSON.parse(await readFile('tests/fixtures/retired-images.json','utf8'));assert.equal(retired.length,55);
 for(const r of retired){const v=s.DaliViews.parse(r.url);assert.equal(v.imageUpdated,true,r.url);assert.equal(v[r.type],r.id);assert.equal(v.photo,undefined);assert.equal(v.frame,undefined);assert.doesNotMatch(s.DaliViews.format(v),/photo=|frame=/);}
});
test('all generated assets disclose generation metadata and have local full, thumbnail and preview files',async()=>{
 const generated=groups.flatMap(g=>g.photos).filter(p=>p.mediaType==='ai');assert.equal(generated.length,23);
 for(const p of generated){assert.match(p.generatedAt,/^2026-11-0[23]$/);assert.ok(p.references.length);assert.match(s.MediaCredits.badge(p),/AI生成 · 艺术演绎/);assert.match(s.MediaCredits.credit(p),/非现场实拍/);assert.doesNotMatch(s.MediaCredits.credit(p),/摄影：/);for(const k of ['src','thumb','preview'])await access('web/'+p[k]);}
 assert.equal(s.MediaCredits.summary([{mediaType:'photo'},{mediaType:'ai'}]),'1 张实拍 · 1 张AI演绎');
});

test('all nine owner originals remain byte-for-byte intact and visible in their regular albums',async()=>{
 const {createHash}=await import('node:crypto');const owned=JSON.parse(await readFile('tests/fixtures/owner-originals.json','utf8'));assert.equal(Object.keys(owned).length,9);
 const visible=[...s.DALI_SHORE_PHOTOS,...s.LIJIANG_DATA.places.flatMap(p=>p.galleryOrder.map(i=>p.photos[i]))];
 for(const [src,hash] of Object.entries(owned)){assert(visible.some(p=>p.src===src&&p.ownerProvided),src);assert.equal(createHash('sha256').update(await readFile('web/'+src)).digest('hex'),hash,src);}
 const html=await readFile('web/index.html','utf8');assert.match(html,/data-owner-step="-1"/);assert.match(html,/data-owner-step="1"/);
});
