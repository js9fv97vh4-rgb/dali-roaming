import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
async function loader(){
  const images=[];
  class FakeImage{constructor(){images.push(this);}set src(value){this.url=value;}decode(){return Promise.resolve();}}
  const scope={window:{},Image:FakeImage,setTimeout,clearTimeout};vm.createContext(scope);vm.runInContext(await readFile('web/photo-loader.js','utf8'),scope);
  return {images,photos:scope.window.DaliPhotos};
}
test('preview queue bounds concurrent requests, shares duplicate URLs, and reuses loaded photos',async()=>{
  const {images,photos}=await loader(),q=photos.createLoader({concurrency:2});
  const a=q.load('a'),again=q.load('a'),b=q.load('b'),c=q.load('c');assert.equal(a,again);assert.equal(images.length,2);
  images[0].onload();await a;assert.equal(images.length,3);assert.equal(q.load('a'),a);
  images[1].onload();images[2].onload();assert.deepEqual(await Promise.all([b,c]),['b','c']);
});
test('a stalled host releases its queue slot and can be retried',async()=>{
  const {images,photos}=await loader(),q=photos.createLoader({concurrency:1,timeout:10});
  const a=q.load('a'),b=q.load('b');await assert.rejects(a,/超时/);assert.equal(images[0].url,'');assert.equal(images.length,2);
  images[1].onload();await b;const retry=q.load('a');assert.equal(images.length,3);images[2].onload();assert.equal(await retry,'a');
});
test('map previews prefer a licensed local photo of that same place',async()=>{
  const {photos}=await loader();const first={src:'https://remote/photo',remote:true},second={src:'assets/same-place.webp'};
  assert.equal(photos.preview([first,second]),second);assert.equal(photos.preview([first]),first);
});
