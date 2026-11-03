import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync('judith-ai/postfach.html','utf8');let count=0;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!match[2].trim())continue;const args=['--check'];if(match[1].includes('module'))args.push('--input-type=module');const r=spawnSync(process.execPath,args,{input:match[2],encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);count++;}
console.log(`Judith inline syntax passed: ${count} scripts`);

if(html.indexOf('window.jdHeaders=')>html.indexOf("const cached=sessionStorage.getItem('jd-calendar-cache-v2')"))throw Error('Session helper must exist before cached calendar rendering');
