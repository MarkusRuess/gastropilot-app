import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {stripTypeScriptTypes} from 'node:module';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gp-stock-'));
try{for(const name of ['index.html','upload.html','einkaufsplanung.html','friedrich-inventur.html']){
 const s=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');let i=0;
 for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 const [_,attrs,code]=m;if(/\bsrc\s*=/.test(attrs)||(/\btype\s*=/.test(attrs)&&!/module|javascript/.test(attrs)))continue;
 const f=path.join(tmp,name+'-'+i+++(/module/.test(attrs)?'.mjs':'.js'));fs.writeFileSync(f,code);const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);
 }console.log(name+': inline syntax passed');
}
const code=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/functions/analyze-receipt/index.ts',import.meta.url),'utf8'));const f=path.join(tmp,'edge.mjs');fs.writeFileSync(f,code);const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);console.log('Edge TypeScript stripping and syntax passed');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
