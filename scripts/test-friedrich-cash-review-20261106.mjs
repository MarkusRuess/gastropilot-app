// Regression fixture: 2026-11-05 Friedrich. No database writes.
import assert from 'node:assert/strict';
const near=(a,b,t=.03)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=t;
const rows=[{rate:10,net:450.82,vat:45.08,gross:495.90},{rate:20,net:739.91,vat:147.99,gross:887.90}];
const saved={gross_total:1383.80,net_total:1190.73,vat_total:193.07,cash_total:296,card_total:null,tax_breakdown:rows};
const sum=k=>rows.reduce((n,r)=>n+r[k],0);
assert.ok(near(sum('gross'),saved.gross_total));
assert.ok(near(sum('net'),saved.net_total));
assert.ok(near(sum('vat'),saved.vat_total));
assert.ok(near(saved.net_total+saved.vat_total,saved.gross_total));
assert.ok(rows.every(r=>near(r.net+r.vat,r.gross)));
assert.equal(saved.card_total,null,'Missing card amount must not be guessed');
assert.equal(typeof saved.card_total==='number',false);
console.log('PASS Friedrich 05.11 saved tax sums; missing payment remains blocked');
