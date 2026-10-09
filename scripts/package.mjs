import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import './build.mjs';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const name=`dali-roaming-v${version}`;
const roots=['web','data','docs','scripts','tests','worker','db','drizzle','README.md','LICENSE','THIRD_PARTY_NOTICES.md','CHANGELOG.md','CONTRIBUTING.md','asset-sources.json','package.json','package-lock.json','index.html','.gitignore','.nojekyll'];
const files=[];
async function walk(file){if((await stat(file)).isDirectory()){for(const child of (await readdir(file)).sort())await walk(path.join(file,child));}else if(path.basename(file)!=='.DS_Store')files.push(file);}
for(const root of roots)await walk(root);
await mkdir('release',{recursive:true});
// Python's standard library creates a portable archive without extra npm dependencies.
const result=spawnSync('python3',['-c',`import json,sys,zipfile\nm=json.load(sys.stdin)\nwith zipfile.ZipFile(m['zip'],'w',zipfile.ZIP_DEFLATED) as z:\n for p in m['files']: z.write(p,m['prefix']+'/'+p)`,],{input:JSON.stringify({zip:`release/${name}.zip`,prefix:name,files}),encoding:'utf8'});
if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);
const archive=await readFile(`release/${name}.zip`),hash=createHash('sha256').update(archive).digest('hex');
await writeFile(`release/${name}.sha256`,`${hash}  ${name}.zip\n`);
console.log(`Packaged release/${name}.zip (${(archive.length/1024/1024).toFixed(1)} MiB), ${files.length} files`);
