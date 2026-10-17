import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,constants} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {inspectPreview,projectRoot} from '../scripts/open.mjs';

const firstScript=html=>html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('the root web entry preserves query and destination, while file opening shows the launcher guide',async()=>{
  const script=firstScript(await readFile('index.html','utf8'));
  for(const protocol of ['https:','http:','file:']){
    const calls=[];
    vm.runInNewContext(script,{location:{protocol,search:'?from=entry',hash:'#erhai',replace:url=>calls.push(url)}});
    assert.deepEqual(calls,protocol==='file:'?[]:['web/index.html?from=entry#erhai']);
  }
  await access('启动云南漫游.command',constants.X_OK);
});

test('directly opening the inner HTML leads to the guide instead of a misleading 2D fallback',async()=>{
  const script=firstScript(await readFile('web/index.html','utf8'));
  for(const protocol of ['file:','http:','https:']){
    const calls=[];
    vm.runInNewContext(script,{location:{protocol,hash:'#erhai',replace:url=>calls.push(url)}});
    assert.deepEqual(calls,protocol==='file:'?['../index.html#erhai']:[]);
  }
});

test('a preview is reused only if its HTML, JS, stylesheet and map data match this folder',async()=>{
  assert.equal(path.resolve(projectRoot),path.resolve('.'));
  const current=async(_port,file)=>readFile(path.join(projectRoot,'web',file));
  assert.equal(await inspectPreview(8765,current),'matching');
  assert.equal(await inspectPreview(8765,async(port,file)=>file==='app.js'?Buffer.from('old project'):current(port,file)),'other');
  assert.equal(await inspectPreview(8765,async()=>Buffer.from('unrelated website')),'other');
  assert.equal(await inspectPreview(8765,async()=>null),'other');
  assert.equal(await inspectPreview(8765,async()=>'unused'),'unused');
});
