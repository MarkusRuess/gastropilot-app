import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {orderQuantity,csv,coffeeDisplay,exportRows,lastWeek,inventoryPdf,countingInfo,countedQuantity,countedValue,litresInLabel} from '../friedrich-stock-engine.mjs';
test('Beer rounds to 50 litre barrels',()=>assert.equal(orderQuantity(120,10,45,50),2));
test('Coffee rounds to individual 1500 g cans',()=>assert.equal(orderQuantity(7500,0,1000,1500),5));
test('Unknown stock is not zero',()=>assert.equal(orderQuantity(100,0,null,50),null));
test('Unknown package cannot be ordered',()=>assert.equal(orderQuantity(100,0,0,null),null));
test('Confirmed zero can be ordered',()=>assert.equal(orderQuantity(100,0,0,50),2));
test('Covered need is zero',()=>assert.equal(orderQuantity(100,0,200,50),0));
test('Reserve separate from stock',()=>assert.equal(orderQuantity(100,20,100,50),1));
test('Float boundary does not add package',()=>assert.equal(orderQuantity(.3,0,.1,.2),1));
test('Negative calculated stock increases order',()=>assert.equal(orderQuantity(50,0,-10,50),2));
test('Coffee display cans plus remaining grams',()=>assert.equal(coffeeDisplay(7608),'5 Dosen + 108 g'));
test('Coffee unknown stays unknown',()=>assert.equal(coffeeDisplay(null),'unbekannt'));
test('CSV actual BOM, CRLF, quoting and formula protection',()=>assert.equal(csv([['Artikel','A;B','"C"'],['=1+1',null,'ä']]),'\uFEFF"Artikel";"A;B";"""C"""\r\n"\'=1+1";"";"ä"'));
test('Exports distinguish unknown from confirmed zero',()=>{const rows=exportRows([{name:'A',unit:'l',quantity:null},{name:'B',unit:'l',quantity:0}]);assert.equal(rows[1][2],null);assert.equal(rows[2][2],0);});
test('Last completed calendar week also on Sunday',()=>assert.deepEqual(lastWeek(new Date('2026-11-01T12:00Z')),{from:'2026-10-19',until:'2026-10-26'}));
test('Monday starts next full comparison',()=>assert.deepEqual(lastWeek(new Date('2026-11-02T12:00Z')),{from:'2026-10-26',until:'2026-11-02'}));
test('PDF is binary with valid xref offsets',()=>{const pdf=inventoryPdf([{name:'Kaffee ÄÖÜ',unit:'g',quantity:1500,net_unit_price:.04,value_net:60,counted_at:'2026-10-31',count_kind:'gezählt'}],'2026-10 v1');const s=Buffer.from(pdf).toString('latin1');const start=Number(s.match(/startxref\n(\d+)/)[1]);assert.equal(s.slice(start,start+4),'xref');for(const m of s.matchAll(/(\d{10}) 00000 n /g)){assert.match(s.slice(Number(m[1])),/^\d+ 0 obj/);}fs.writeFileSync('/tmp/friedrich-stock-test.pdf',pdf);});
const edge=fs.readFileSync(new URL('../supabase/functions/analyze-receipt/index.ts',import.meta.url),'utf8');
const functions=edge.slice(edge.indexOf('function amount('),edge.indexOf('// NEU: Artikelgruppenstatistik'));
const normalize=new Function(stripTypeScriptTypes(functions)+';return normalizePurchaseItems;')();
const invoice=[{name:'Bier',article_number:'007',quantity:-2,unit:'Fass',unit_price_net:150,line_net:-300,pack_size:50,pack_unit:'l',package_count:2,total_base_quantity:-100,quantity_basis:'barrels',delivery_date:'2026-11-01',line_kind:'goods'}];
test('Friedrich invoice preserves signed returns and packaging',()=>{const x=normalize(invoice,true)[0];assert.equal(x.quantity,-2);assert.equal(x.line_net,-300);assert.equal(x.total_base_quantity,-100);assert.equal(x.article_number,'007');assert.equal(x.unit_price_net,150);assert.equal(x.pack_size,50);});
test('Judith normalization retains previous shape and behavior',()=>{const x=normalize(invoice,false)[0];assert.equal(x.quantity,null);assert.equal(x.line_net,-300);assert.equal(x.article_number,'007');assert.equal(x.pack_size,undefined);assert.equal(Object.keys(x).length,10);});
test('No invented package defaults',()=>assert.equal(normalize([{name:'Unknown'}],true)[0].pack_size,null));
test('Shared upload retains Friedrich item evidence',()=>{const s=fs.readFileSync(new URL('../upload.html',import.meta.url),'utf8');assert.match(s,/line.gpOriginalItem=\{\.\.\.item\}/);assert.match(s,/out.push\(\{\.\.\.original,name,quantity/);});


test('Full bottles convert once, stored litres and original event remain unchanged',()=>{
 const old={item_id:'wine',unit:'l',pack_label:'Flasche à 0,75 l',baseline:7.5,quantity:null,net_unit_price:12};
 const x=countingInfo(old);assert.equal(x.baseline,7.5);assert.equal(old.baseline,7.5);assert.equal(countedQuantity(x,10),7.5);assert.equal(countedValue(x),90);
 assert.equal(countedQuantity(x,0),0);assert.throws(()=>countedQuantity(x,1.5));
});
test('Unknown count or price never becomes zero',()=>{
 assert.equal(countedValue({baseline:null,net_unit_price:12}),null);assert.equal(countedValue({baseline:7.5,net_unit_price:null}),null);assert.equal(countedValue({baseline:0,net_unit_price:12}),0);
});
test('Explicit HOFER packaging and unconverted unit quantities',()=>{
 const x=countingInfo({item_id:'829bea07-8d63-42ba-9c9c-be0503e166c7',unit:'l',pack_label:'Flasche à 1 l'});assert.equal(countedQuantity(x,4),4);
 const piece=countingInfo({unit:'Stück'}, {unit:'Flasche'});assert.equal(countedQuantity(piece,3),3);
 const coffee=countingInfo({unit:'g',pack_label:'Dose à 1,5 kg'});assert.equal(countedQuantity(coffee,7500),7500);
});
test('Aperol invoice volumes require explicit choice when ambiguous, no default',()=>{
 const raw={item_id:'87dd191f-3ee0-40fb-a72e-600cd57eaa6a',unit:'l'};
 const invoice=n=>({source_kind:'delivery',state:'review',name:'Aperol '+n+' l',raw_data:{name:'Aperol '+n+' l'}});
 const x=countingInfo(raw,{},[invoice('0,7'),invoice('1'),invoice('1')]);assert.deepEqual(x.bottle_sizes,[.7,1]);assert.equal(x.count_factor,null);
 assert.throws(()=>countedQuantity(x,3));assert.equal(countedQuantity(x,3,'.7'),2.1);assert.equal(countedQuantity(x,3,'1'),3);assert.throws(()=>countedQuantity(x,3,'0.75'));
 assert.throws(()=>countedQuantity(countingInfo(raw),1));assert.equal(litresInLabel('Flasche à 700 ml'),.7);
});
