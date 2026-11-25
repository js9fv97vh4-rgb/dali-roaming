import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('web/travel-saved.js','utf8');
function browser({blocked=false}={}){
  const values=new Map([
    ['yunnan-lijiang-saved-v1','["lugu"]'],
    ['dali-roaming:journey:v1','{"entrance":"railway","stops":["caicun"]}']
  ]);
  const events=new Map();
  const win={localStorage:{getItem:key=>values.get(key),setItem:(key,v)=>{if(blocked)throw Error('storage denied');values.set(key,v);}},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    addEventListener:(type,fn)=>events.set(type,fn),dispatchEvent:e=>events.get(e.type)?.(e)};
  win.window=win;vm.runInNewContext(source,win);
  return {values,store:win.TravelSaved,events};
}
test('legacy city bookmarks survive and saving a lake place never edits the itinerary',()=>{
  const {values,store}=browser(),journey=values.get('dali-roaming:journey:v1');
  assert.deepEqual([...store.get('lijiang')],['lugu']);
  assert.equal(store.get('erhai').size,0);
  store.toggle('erhai','caicun');store.toggle('lijiang','shuhe');
  assert.equal(values.get('dali-roaming:journey:v1'),journey);
  assert.deepEqual(JSON.parse(values.get('yunnan-lijiang-saved-v1')),['lugu','shuhe']);
});
test('unavailable storage keeps bookmarks in memory; storage events update live city sets',()=>{
  const {store,events}=browser({blocked:true});const visible=store.get('kunming');
  assert.equal(store.toggle('kunming','dounan'),false);assert(visible.has('dounan'));
  events.get('storage')({key:'yunnan-kunming-saved-v1',newValue:'["jacaranda"]'});
  assert.deepEqual([...visible],['jacaranda']);events.get('storage')({key:null,newValue:null});assert.equal(visible.size,0);
});
