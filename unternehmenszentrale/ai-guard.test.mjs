import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardedPaidFetch } from '../supabase/functions/_shared/enterprise-ai-guard.mjs';
test('paid requests fail closed without a verified budget service', async()=>{
 await assert.rejects(guardedPaidFetch('https://api.openai.com/v1/responses'), /PAID_AI_DISABLED/);
 await assert.rejects(guardedPaidFetch('https://api.openai.com/v1/responses',{budget:1500,enabled:true}), /PAID_AI_DISABLED/);
});
