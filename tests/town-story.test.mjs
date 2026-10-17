import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('each story chapter resolves to a credited local photo of the matching subject',async()=>{
  const scope={window:{}};vm.createContext(scope);
  for(const name of ['gallery-data','town-story'])vm.runInContext(await readFile(`web/${name}.js`,'utf8'),scope);
  const chapters=scope.window.DALI_TOWN_STORY,photos=scope.window.DALI_GALLERIES['ancient-town'];
  assert.equal(new Set(chapters.map(c=>c.id)).size,chapters.length);
  for(const chapter of chapters){
    const photo=photos[chapter.photo];assert.ok(photo,`${chapter.id}: missing photo`);
    assert.ok(photo.caption.includes(chapter.name),`${chapter.id}: photo subject mismatch`);
    assert.ok(photo.source&&photo.author&&photo.license);
    assert.equal(photo.period,chapter.period);
    assert.ok((await readFile('web/'+photo.src)).length>0);
  }
  assert.match(chapters.find(c=>c.id==='night').note,/2008/,'historical night image must retain its date');
});
