import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/analyze-receipt/index.ts',import.meta.url),'utf8');
const extract=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to));
const code=[
  extract('function amount(', 'function count(').replaceAll(': unknown','').replaceAll(': number | null',''),
  extract('function count(', 'function quantity(').replaceAll(': unknown','').replaceAll(': number | null',''),
  extract('function quantity(', 'function textOrNull(').replaceAll(': unknown','').replaceAll(': number | null',''),
  extract('function normalizeCategorySales(', 'const TAX_PIPELINE_VERSION').replace('value: unknown','value'),
  extract('const near =', 'async function verifyPrintedTaxes(').replace('new Map<number,number>()','new Map()'),
  'globalThis.check = reconcileJudithReport;'
].join('\n');
const sandbox={Math,Number,Map,Array,String};
vm.runInNewContext(code,sandbox);
const check=sandbox.check;
const report={
  category_sales:[
    {name:'SHOP 10%',gross:66.10},{name:'SHOP 20%',gross:56.45},
    {name:'TORTEN 10%',gross:3301.66},
    {name:'RABATT AUF TOTAL 10%',gross:0},{name:'RABATT AUF TOTAL 20%',gross:0}
  ],
  printed_payment_lines:[
    {label:'Kund.Forderungen',amount:-1906.10},
    {label:'Bank Einlage Bar',amount:-439.15},
    {label:'Kreditk./Bankomatkarten',amount:-1078.96}
  ]
};
const actual=check(report,3424.21);
assert.deepEqual([...actual.errors],[]);
assert.equal(actual.net_total,3108.64);
assert.equal(actual.vat_total,315.57);
assert.equal(actual.cash_total,439.15);
assert.equal(actual.card_total,1078.96);
assert.equal(actual.other_payments_total,1906.10);
assert.deepEqual(Array.from(actual.tax_breakdown,({rate,gross})=>[rate,gross]),[[10,3367.76],[20,56.45]]);
assert.ok(check({...report,category_sales:report.category_sales.slice(1)},3424.21).errors.length);
assert.ok(check({...report,printed_payment_lines:report.printed_payment_lines.slice(1)},3424.21).errors.length);
assert.ok(check({...report,printed_payment_lines:report.printed_payment_lines.map(row=>({...row,amount:row.amount+10}))},3424.21).errors.length);
assert.ok(check({...report,category_sales:[...report.category_sales,{name:'ohne Satz',gross:0}]},3424.21).errors.length);
console.log('PASS Judith daily report: printed groups, discounts, signed counter entries and guarded review');
