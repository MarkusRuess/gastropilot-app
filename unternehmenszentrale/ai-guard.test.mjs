import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardedPaidFetch } from '../supabase/functions/_shared/enterprise-ai-guard.mjs';
test('paid requests fail closed without a verified reservation, including parallel requests and month changes', async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('provider must not be called')};
 try{
  for(const date of ['2026-11-30T23:59:59+01:00','2026-12-01T00:00:00+01:00']){
   const requests=Array.from({length:25},()=>guardedPaidFetch('https://api.openai.com/v1/responses',{budget:1500,enabled:true,date}));
   for(const response of await Promise.all(requests)){
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,'PAID_AI_DISABLED');
   }
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=previous}
});
