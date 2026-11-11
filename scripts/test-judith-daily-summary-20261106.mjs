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
const day10={
 category_sales:[{name:'SHOP 10%',gross:0},{name:'SHOP 20%',gross:0},{name:'TORTEN 10%',gross:1197.80}],
 printed_payment_lines:[{label:'Kund.Forderungen',amount:-390},{label:'Bank Einlage Bar',amount:-128.90},{label:'Kreditk./Bankomatkarten',amount:-678.90},{label:'Kredit Bezahlt',amount:0},{label:'Aus/Einzahlungen',amount:0}]
};
const sales10=check(day10,1197.80);
assert.deepEqual([...sales10.errors],[]);
assert.equal(sales10.cash_total,128.90);
assert.equal(sales10.card_total,678.90);
assert.equal(sales10.other_payments_total,390);
const day11={
 category_sales:[{name:'SHOP 10%',gross:63},{name:'SHOP 20%',gross:141.75},{name:'TORTEN 10%',gross:1291.40}],
 printed_payment_lines:[{label:'Kund.Forderungen',amount:50},{label:'Kredit Bezahlt',amount:50},{label:'Aus/Einzahlungen',amount:0},{label:'Bank Einlage Bar',amount:-718},{label:'Kreditk./Bankomatkarten',amount:-828.15}]
};
const sales11=check(day11,1496.15);
assert.deepEqual([...sales11.errors],[]);
assert.equal(sales11.cash_total,668);
assert.equal(sales11.card_total,828.15);
assert.equal(sales11.other_payments_total,0);
assert.equal(sales11.prior_receivable_payment,50);
assert.equal(sales11.net_total,1349.40);
assert.equal(sales11.vat_total,146.75);
assert.ok(check({...day11,printed_payment_lines:day11.printed_payment_lines.filter(row=>row.label!=='Kredit Bezahlt')},1496.15).errors.length);
assert.ok(check({...day11,printed_payment_lines:day11.printed_payment_lines.map(row=>row.label==='Aus/Einzahlungen'?{...row,amount:10}:row)},1496.15).errors.length);
console.log('PASS Judith daily report: printed groups, discounts, signed counter entries and guarded review');
