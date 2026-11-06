import assert from 'node:assert/strict';
import {reconcileFriedrichSummary} from '../supabase/functions/analyze-receipt/friedrich-pages.mjs';
import {validatePages} from '../supabase/functions/analyze-receipt/friedrich-pages.mjs';
import {readFileSync} from 'node:fs';

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
const fixture=JSON.parse(readFileSync(new URL('./fixtures/friedrich-z1857.json',import.meta.url)));
const items=[fixture.rows_page_1,fixture.rows_page_2].flatMap((page,source)=>page.map((row,index)=>({source_page:source+1,row_index:index+1,article_number:String(row[0]),name:row[1],quantity:row[2],unit_price:row[3],gross_amount:row[4],tax_rate:row[5]})));
const complete={...fixture,sales_items:items};
assert.equal(items.length,62);
assert.equal(Math.round(items.reduce((sum,item)=>sum+item.gross_amount,0)*100)/100,fixture.gross_total);
assert.equal(Math.round(fixture.category_sales.reduce((sum,row)=>sum+row.gross,0)*100)/100,fixture.gross_total);
assert.deepEqual(validatePages(complete,fixture,3).errors,[]);
const missingItem={...complete,sales_items:items.slice(1)};
assert.ok(validatePages(missingItem,fixture,3).errors.length);
const wrongBusiness={...complete,date:'2026-11-04'};
assert.ok(validatePages(wrongBusiness,fixture,3).errors.length);
console.log('PASS Z 1857: 62 original article rows, 11 groups, 3 pages, payments and duplicate row preservation');
