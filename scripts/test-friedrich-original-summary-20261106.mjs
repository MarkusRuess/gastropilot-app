import assert from 'node:assert/strict';
import {reconcileFriedrichSummary} from '../supabase/functions/analyze-receipt/friedrich-pages.mjs';

const original={gross_total:1383.80,net_total:1190.73,vat_total:192.97,
 tax_breakdown:[{rate:10,gross:495.90,net:450.82,vat:45.08},{rate:20,gross:887.90,net:739.92,vat:147.98}],
 printed_payment_lines:[{label:'BAR Rechnung',count:70,amount:1087.80},{label:'Kreditkarte',count:16,amount:296.00},{label:'Personal / Einladung mit 0',count:1,amount:0}]};
assert.deepEqual(reconcileFriedrichSummary(original,{gross_total:1383.80}),[]);
assert.equal(original.vat_total,193.07);
assert.equal(original.cash_total,1087.80);
assert.equal(original.card_total,296);
const missing=structuredClone(original);missing.printed_payment_lines=[];
assert.ok(reconcileFriedrichSummary(missing,{gross_total:1383.80}).length);
const wrong=structuredClone(original);wrong.tax_breakdown[1].vat=147.08;
assert.ok(reconcileFriedrichSummary(wrong,{gross_total:1383.80}).length);
console.log('PASS Z 1857 original payment labels and cent rounding');
