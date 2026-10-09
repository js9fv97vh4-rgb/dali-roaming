import {mkdir,copyFile,cp,writeFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await cp('web','dist/client',{recursive:true});
await copyFile('worker/index.js','dist/server/index.js');
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'dali-roaming',main:'index.js',compatibility_date:'2026-10-03',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'dali-roaming',database_id:'00000000-0000-0000-0000-000000000000'}]},null,2));
console.log('Built Dali website and journey API');
