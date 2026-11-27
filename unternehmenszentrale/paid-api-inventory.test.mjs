import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync,readFileSync} from 'node:fs';
const root=new URL('../supabase/functions/',import.meta.url);
test('no new direct OpenAI integration in edge entrypoints',()=>{
 const known=['analyze-receipt','judith-ai-photo-order','judith-mail-invoice'];
 const found=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).filter(d=>{try{return /api\.openai\.com|OPENAI_API_KEY/.test(readFileSync(new URL(d.name+'/index.ts',root),'utf8'));}catch(e){if(e.code==='ENOENT')return false;throw e;}}).map(d=>d.name);
 assert.deepEqual(found.filter(n=>!known.includes(n)),[]);
 const expected={'analyze-receipt':5,'judith-ai-photo-order':1,'judith-mail-invoice':1};
 for(const [name,count] of Object.entries(expected)){
  const source=readFileSync(new URL(name+'/index.ts',root),'utf8');
  assert.match(source,/import\s*\{\s*guardedPaidFetch\s*\}\s*from\s*['"]\.\.\/_shared\/enterprise-ai-guard\.mjs['"]/);
  assert.equal((source.match(/guardedPaidFetch\s*\(\s*['"]https:\/\/api\.openai\.com/g)||[]).length,count,name);
  assert.doesNotMatch(source,/\bfetch\s*\(\s*['"]https:\/\/api\.openai\.com/);
 }
});
