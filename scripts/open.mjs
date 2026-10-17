import {readFile} from 'node:fs/promises';
import {get} from 'node:http';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const identityFiles=['index.html','app.js','landing.css','prefecture-data.js','province-atlas.js'];

function request(port,file){
  return new Promise(resolve=>{
    const req=get({hostname:'127.0.0.1',port,path:'/'+file},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){res.destroy();resolve(null);}else chunks.push(chunk);});
      res.on('end',()=>resolve(res.statusCode===200?Buffer.concat(chunks):null));
      res.on('error',()=>resolve(null));
    });
    req.setTimeout(1200,()=>{req.destroy();resolve(null);});
    req.on('error',error=>resolve(error.code==='ECONNREFUSED'?'unused':null));
  });
}

// Matching the HTML alone cannot detect a different checkout with stale JS/CSS.
export async function inspectPreview(port,read=request){
  const index=await read(port,'index.html');
  if(index==='unused')return 'unused';
  if(!Buffer.isBuffer(index))return 'other';
  for(const file of identityFiles){
    const served=file==='index.html'?index:await read(port,file);
    const expected=await readFile(path.join(projectRoot,'web',file));
    if(!Buffer.isBuffer(served)||!served.equals(expected))return 'other';
  }
  return 'matching';
}

function openBrowser(url){
  const command=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';
  const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
  const opener=spawn(command,args,{stdio:'ignore'});
  opener.on('error',()=>console.log('请在浏览器中打开上方网址。'));
}

async function start(port){
  const child=spawn(process.execPath,[path.join(projectRoot,'scripts/serve.mjs'),path.join(projectRoot,'web'),'--port',String(port)],{cwd:projectRoot,stdio:['ignore','pipe','inherit']});
  await new Promise((resolve,reject)=>{
    let output='';
    const exited=code=>reject(new Error('预览进程提前结束，退出码 '+code));
    child.once('error',reject);child.once('exit',exited);
    child.stdout.on('data',data=>{
      process.stdout.write(data);output+=data.toString();
      if(output.includes(`http://127.0.0.1:${port}`)){child.off('exit',exited);resolve();}
    });
  });
  return child;
}

async function main(){
  if(Number(process.versions.node.split('.')[0])<20)throw new Error('请使用 Node.js 20 或更新版本。');
  const noOpen=process.argv.includes('--no-open');
  let child=null,port;
  for(port=8765;port<=8775;port++){
    const state=await inspectPreview(port);
    if(state==='matching')break;
    if(state==='unused'){child=await start(port);break;}
    console.log(`端口 ${port} 正在提供其他内容，跳过该端口。`);
  }
  if(port>8775)throw new Error('8765–8775 端口均已占用，请关闭不用的预览后再试。');
  const url=`http://127.0.0.1:${port}/#yunnan`;
  console.log(`\n当前项目：${projectRoot}\n打开网站：${url}`);
  if(!noOpen)openBrowser(url);
  if(!child){console.log('已使用这个文件夹正在运行的预览，无需重复启动。');return;}
  console.log('请保留此窗口；按 Control+C 结束预览。');
  for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,()=>child.kill(signal));
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
