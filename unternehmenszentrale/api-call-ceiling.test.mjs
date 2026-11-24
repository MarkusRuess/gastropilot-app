import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const root=new URL('../supabase/functions/',import.meta.url);
const limits={'analyze-receipt/index.ts':5,'judith-ai-photo-order/index.ts':1,'judith-mail-invoice/index.ts':1};
function scan(dir,prefix=''){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=prefix+entry.name;
  if(entry.isDirectory())scan(new URL(entry.name+'/',dir),path+'/');
  else if(/\.(?:ts|js|mjs|tsx|jsx)$/.test(entry.name)){
   const source=readFileSync(new URL(entry.name,dir),'utf8');
   const count=(source.match(/api\.openai\.com/g)||[]).length;
   assert.ok(count<=(limits[path]||0),`Unreviewed direct OpenAI reference: ${path}`);
  }
 }
}
test('legacy direct OpenAI references cannot increase across edge source files',()=>scan(root));
