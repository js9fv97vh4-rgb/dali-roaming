import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'web');
const portIndex=process.argv.indexOf('--port');
const port=Number(portIndex>=0?process.argv[portIndex+1]:8765);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Use --port with a port from 1 to 65535');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    let info=await stat(file);
    if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
    const etag=`W/"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
    const headers={'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache',etag,'last-modified':info.mtime.toUTCString()};
    if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
    const data=await readFile(file);
    res.writeHead(200,{...headers,'content-length':data.length});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'端口已占用，请使用 --port 8766':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`云南漫游： http://127.0.0.1:${port}\n预览目录：${root}`));
