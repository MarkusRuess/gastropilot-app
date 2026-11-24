import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const registry = JSON.parse(readFileSync(new URL('./module-registry.json', import.meta.url)));
const required = {
 'document-intake':['file-hash-deduplication','tenant-isolation','multi-page-extraction','review-before-write'],
 'mail-classification':['idempotent-reply','no-loop','subject-and-body','customer-contact-extraction'],
 'inventory-pricing':['unit-normalization','net-purchase-price','source-traceability'],
 'knowledge-feedback':['evidence-link','test-result','privacy-review','reuse-before-build']
};
test('unique module identifiers',()=>assert.equal(new Set(registry.modules.map(m=>m.id)).size,registry.modules.length));
for(const [id,checks] of Object.entries(required)){
 test(id+' mandatory safeguards',()=>{
  const m=registry.modules.find(m=>m.id===id);
  assert.ok(m);
  for(const check of checks) assert.ok(m.checks.includes(check),check);
  assert.ok(['inventory-required','foundation'].includes(m.status),'Promotion requires separate evidence validation');
 });
}
