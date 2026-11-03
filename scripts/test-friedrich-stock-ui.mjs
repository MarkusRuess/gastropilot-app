// Local component interaction tests with fixtures; no account and no production writes.
import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const server=createServer((req,res)=>{const urlPath=new URL(req.url,'http://localhost').pathname;if(urlPath==='/cockpit-test'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*src=[^>]*>[\s\S]*?<\/script>/gi,''));return;}const file=path.join(root,urlPath);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(fs.readFileSync(file));}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font:16px system-ui;margin:12px}button{padding:10px}label{display:block}table{border-collapse:collapse}.gp-area-hidden{display:none}</style><div id="app"><nav id="gpCockpitNav"></nav><p id="purchasePeriod"></p><div id="purchaseCards"></div><section id="gpMockupDetail" hidden><strong id="gpMockupDetailTitle"></strong><div id="gpMockupDetailBody"></div></section></div>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true});
try{for(const width of [1200,390]){const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/Vienna'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
await page.evaluate(async()=>{
 const {mountStock,renderStockPlanning}=await import('/friedrich-stock.js');
 const F='6a5484d1-daf6-4263-897d-24cdf536aa29';window.biz=F;window.calls=[];
 const items=[{item_id:'4c1c36d5-f7c2-4298-87ca-24ceecbe80ce',name:'Villacher Fassbier',unit:'l',quantity:45,baseline:50,received:0,consumed:5,loss:0,net_unit_price:3,value_net:135,counted_at:'2026-10-31T22:00Z',count_kind:'gezählt',pack_size:50,pack_label:'Fass à 50 l',reserve_percent:10},{item_id:'e4e19947-6ee2-4671-a8ca-b2fa52cac6d5',name:'Illy Kaffee 1,5 kg Dose',unit:'g',quantity:null,baseline:null,net_unit_price:.04,value_net:null,pack_size:1500,pack_label:'Dose à 1,5 kg',reserve_percent:0},{item_id:'decaf',name:'Entkoffeinierter Kaffee',unit:'g',quantity:null,baseline:null,pack_size:null,reserve_percent:0}];
 for(let n=0;n<11;n++)items.push({item_id:'extra-'+n,name:'Zusatzartikel '+n,unit:'Stück',quantity:null,baseline:null,pack_size:1,reserve_percent:0});
 items.find(x=>x.item_id==='extra-10').pack_label='Flasche à 0,75 l';Object.assign(items.find(x=>x.item_id==='extra-10'),{unit:'l',baseline:7.5,quantity:null,net_unit_price:12,counted_at:'2026-11-01T10:10Z',timing_warning:true});
 const data={gp_inventory_items:[{id:'extra-10',unit:'Flasche'}],gp_f_stock_counts:[{item_id:items[1].item_id,quantity:7500,counted_at:'2026-11-03T10:00Z',created_at:'2026-11-03T10:00Z'}],gp_f_stock_rules:[{article_number:'2000',item_id:items[0].item_id,per_sale:.33,note:'Betreiber'},{article_number:'1400',item_id:items[1].item_id,per_sale:8,note:'Betreiber'}],gp_f_stock_sales:[{business_id:F,article_number:'2000',article_name:'Villacher',closing_date:'2026-10-30',quantity:100,gross_amount:440}],bonit_daily_closings:[{closing_date:'2026-10-30',gross_amount:440}],gp_f_stock_closings:[],gp_inventory_snapshots:[],gp_f_stock_lines:[{id:'line',name:'Lieferung Bier',source_kind:'delivery',supplier:'Lieferant',raw_data:{quantity:1,unit:'Fass'},delivery_date:'2026-11-01',state:'review'}]};
 items.push({item_id:'87dd191f-3ee0-40fb-a72e-600cd57eaa6a',name:'Aperol',unit:'l',quantity:null,baseline:3,pack_size:null,reserve_percent:0});
 data.gp_f_stock_counts.push({item_id:'87dd191f-3ee0-40fb-a72e-600cd57eaa6a',quantity:3,counted_at:'2026-11-02T10:00Z',created_at:'2026-11-02T10:00Z'});
 data.gp_f_stock_lines.push(...[.7,1].map(n=>({name:'Aperol '+n+' l',source_kind:'delivery',state:'review',raw_data:{name:'Aperol '+n+' l'}})));
 const db={rpc:async(name,args)=>{window.calls.push({name,args});if(name==='gp_f_stock_state')return {data:structuredClone(items)};if(name==='gp_f_stock_close'){data.gp_f_stock_closings.push({inventory_month:args.p_month,revision:1,payload:{items},created_at:new Date().toISOString()});return {data:{revision:1}};}return {data:null};},from(table){const q={filters:[],select(){return q},eq(k,v){q.filters.push([k,v]);return q},in(){return q},order(){return q},gte(){return q},lt(){return q},limit(){return q},range(){return q},insert(value){window.calls.push({table,value});if(table==='gp_f_stock_counts'){items[0].quantity=value.quantity;items[0].baseline=value.quantity;}q.write=true;return q},update(value){window.calls.push({table,value});q.write=true;return q},upsert(value){window.calls.push({table,value});q.write=true;return q},then(resolve){resolve({data:q.write?null:structuredClone(data[table]||[])});}};return q;}};
 for(let n=0;n<11;n++)data.gp_f_stock_counts.push({item_id:'extra-'+n,quantity:2,counted_at:'2026-11-01T10:'+String(n).padStart(2,'0')+'Z',created_at:'2026-11-01T10:00Z'});
 window.db=db;window.addEventListener('gp:stock-open',()=>document.getElementById('friedrichStock')?.classList.remove('gp-area-hidden'));
 await mountStock(db,()=>window.biz);window.mount=mountStock;window.plan=()=>renderStockPlanning(db,F,document.getElementById('purchaseCards'));
});
// Reproduce the real cockpit: hidden parent and stale article-only visibility.
await page.evaluate(()=>document.body.classList.add('gp-friedrich-article-view','gp-article-area-active'));
await page.locator('#friedrichStockTile').click();
assert.equal(await page.locator('[data-stock-section]').count(),4);
assert.equal(await page.locator('[data-stock-section-content]').count(),1);
await page.locator('[data-stock-section="stock"]').click();assert.equal(await page.locator('[data-stock-section-content]').count(),0);
await page.locator('[data-stock-section="stock"]').click();
assert.equal(await page.locator('#gpMockupDetail').isVisible(),true);
assert.equal(await page.locator('#friedrichStock').isVisible(),true);
assert.equal(await page.locator('#friedrichStockTile').getAttribute('data-gp-area'),'stock');
assert.equal(await page.locator('#friedrichStockTile').getAttribute('aria-current'),'true');
assert.equal(await page.evaluate(()=>document.body.classList.contains('gp-friedrich-article-view')),false);await page.getByText('Gemeinsamer Supabase-Bestand',{exact:false}).waitFor();
const f=page.locator('#friedrichStock form').first();assert.equal(await f.locator('input[type=number]').inputValue(),'');await f.locator('input[type=number]').fill('0');await f.locator('input[type=datetime-local]').fill('2026-11-01T23:00');await f.locator('input[type=checkbox]').check();await f.getByText('Zählung speichern',{exact:true}).click();await page.waitForFunction(()=>window.calls.some(x=>x.table==='gp_f_stock_counts'));assert.equal(await page.evaluate(()=>window.calls.find(x=>x.table==='gp_f_stock_counts').value.quantity),0);

await page.getByRole('button',{name:'⚡ Schnellzählung',exact:true}).click();
await page.locator('#friedrichQuickCount').waitFor();
assert.equal(await page.locator('[data-quick-item]').count(),10,'Exactly ten recent articles initially');
assert.equal(await page.locator('[data-quick-item]').first().getAttribute('data-quick-item'),'e4e19947-6ee2-4671-a8ca-b2fa52cac6d5','Recently counted coffee first');
await page.getByLabel('Artikel suchen',{exact:true}).fill('illy');
await page.getByLabel('Illy Kaffee 1,5 kg Dose · Menge in g',{exact:true}).fill('7500');
assert.equal(await page.locator('[data-quick-item="4c1c36d5-f7c2-4298-87ca-24ceecbe80ce"]').count(),0);
await page.getByLabel('Artikel suchen',{exact:true}).fill('Villacher');
await page.getByRole('button',{name:'+ Villacher Fassbier',exact:true}).click();
assert.equal(await page.locator('[data-quick-item="4c1c36d5-f7c2-4298-87ca-24ceecbe80ce"]').count(),1);
await page.getByLabel('Villacher Fassbier · Menge in l',{exact:true}).fill('0');
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).scrollIntoViewIfNeeded();
const scrollBefore=await page.evaluate(()=>window.scrollY);
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).click();
await page.getByText('2 Zählungen gespeichert.',{exact:false}).waitFor();
const firstBatch=await page.evaluate(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value);
assert.equal(firstBatch.length,2,'Only filled quantities saved in one batch');
assert.ok(firstBatch.some(x=>x.quantity===0),'Explicit zero preserved');
assert.ok(firstBatch.every(x=>x.business_id==='6a5484d1-daf6-4263-897d-24cdf536aa29'));
assert.equal(await page.getByLabel('Artikel suchen',{exact:true}).inputValue(),'Villacher','Search preserved');
await page.waitForFunction(p=>Math.abs(window.scrollY-p)<5,scrollBefore,{timeout:3000});
assert.ok(Math.abs((await page.evaluate(()=>window.scrollY))-scrollBefore)<5,'Scroll position preserved');
await page.getByLabel('Villacher Fassbier · Menge in l',{exact:true}).fill('50');
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).click();
await page.getByText('1 Zählungen gespeichert.',{exact:false}).waitFor();
const repeatBatch=await page.evaluate(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value);
assert.notEqual(repeatBatch[0].request_id,firstBatch.find(x=>x.item_id===repeatBatch[0].item_id).request_id,'New counting round creates a new history event');

await page.getByLabel('Artikel suchen',{exact:true}).fill('Zusatzartikel 10');
await page.getByLabel('Zusatzartikel 10 · Menge in volle Flaschen',{exact:true}).fill('2');
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).click();
await page.getByText('1 Zählungen gespeichert.',{exact:false}).waitFor();
await page.waitForFunction(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value[0].item_id==='extra-10');
const bottles=await page.evaluate(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value[0]);
assert.equal(bottles.quantity,1.5,'Two full 0.75-l bottles saved as 1.5 l once');assert.match(bottles.note,/Volle Flaschen/);
await page.getByText('Letzte Zählung: 1,5 l',{exact:false}).waitFor();
await page.getByLabel('Aperol · Menge in volle Flaschen',{exact:true}).fill('3');
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).click();
await page.getByText('Flaschengröße laut Rechnung auswählen; keine Größe wird geschätzt.',{exact:true}).waitFor();
await page.getByLabel('Flaschengröße laut Rechnung',{exact:false}).selectOption('0.7');
await page.getByRole('button',{name:'💾 ALLE ZÄHLUNGEN SPEICHERN',exact:true}).click();
await page.waitForFunction(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value[0].item_id==='87dd191f-3ee0-40fb-a72e-600cd57eaa6a');
assert.equal(await page.evaluate(()=>window.calls.filter(x=>x.table==='gp_f_stock_counts'&&Array.isArray(x.value)).at(-1).value[0].quantity),2.1);

await page.getByRole('button',{name:'📦 Lagerbestand',exact:true}).click();
const wineRow=page.locator('tr').filter({has:page.getByText('Zusatzartikel 10',{exact:true})});
await wineRow.waitFor();assert.match(await wineRow.innerText(),/7,5 l.*10 volle Flaschen/);assert.match(await wineRow.innerText(),/90 €/);assert.match(await wineRow.innerText(),/Rechenbestand: unbekannt/);
await page.getByText('Entkoffeinierter Kaffee',{exact:true}).first().waitFor();await page.getByText('Gebinde / Reserve bearbeiten oder Artikel ergänzen',{exact:true}).click();assert.equal(await page.getByLabel('Einkaufsgebinde in Bestandseinheiten').getAttribute('readonly'),'');
await page.evaluate(()=>window.plan());await page.getByText('Bestellmenge offen: Bestand oder Einkaufsgebinde unbekannt',{exact:true}).first().waitFor({state:'visible'});
assert.match(await page.locator('#purchaseCards').innerText(),/Reserve/);
await page.getByRole('button',{name:'📄 Monatsinventur',exact:true}).click();await page.getByRole('button',{name:'Monatsendstand speichern'}).click();await page.getByText(/Version 1/).first().waitFor();
const download=page.waitForEvent('download');await page.getByRole('button',{name:'PDF herunterladen',exact:true}).last().click();assert.match((await download).suggestedFilename(),/Friedrich_Inventur/);
await page.getByRole('button',{name:'🛒 Einkauf & Verbrauch',exact:true}).click();await page.getByLabel('Ansicht',{exact:true}).selectOption('review',{timeout:5000}).catch(async e=>{console.log('STOCK DIAGNOSTIC',await page.locator('#friedrichStock').innerText());throw e;});await page.getByText('Lieferung Bier · Lieferant',{exact:false}).click();const review=page.locator('#friedrichStock details').first();await review.getByLabel('Gelieferte Gesamtmenge (Retouren negativ)').fill('50');await review.getByRole('button',{name:'Zuordnung bestätigen'}).click();await page.waitForFunction(()=>window.calls.some(x=>x.name==='gp_f_stock_confirm'));
assert.equal(await page.evaluate(()=>window.calls.find(x=>x.name==='gp_f_stock_confirm').args.p_quantity),50);
await page.getByLabel('Ansicht',{exact:true}).selectOption('costs');await page.getByText('Tatsächlicher Wareneinsatz netto: unbekannt €',{exact:true}).waitFor();assert.match(await page.locator('#friedrichStock').innerText(),/Vollständigkeit der Einkaufsbelege nicht bestätigt/);
await page.getByLabel('Ansicht',{exact:true}).selectOption('receipts');await page.getByText('Wareneingänge (keine erneuten Ausgaben)',{exact:true}).waitFor();
await page.getByLabel('Ansicht',{exact:true}).selectOption('movements');await page.getByText(/seit letzter Zählung:/).first().waitFor();
await page.screenshot({path:'/tmp/friedrich-stock-ui-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);
await page.evaluate(async()=>{window.biz='87889eaf-f865-4e3a-8f9a-cd01db483e0e';await window.mount(window.db,()=>window.biz);});assert.equal(await page.locator('#friedrichStockTile').isVisible(),false);assert.equal(await page.locator('#friedrichStock').innerText(),'');await page.goto(base+'/cockpit-test');
await page.evaluate(async()=>{
 document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');
 document.body.classList.remove('gp-judith-design');document.body.classList.add('gp-cockpit-active');
 const {mountStock}=await import('/friedrich-stock.js');
 await mountStock({rpc:async()=>({data:[]})},()=> '6a5484d1-daf6-4263-897d-24cdf536aa29');
});
// Actual openBusiness ends with showMobilePanel('monthlyReference').
await page.evaluate(()=>{for(const section of document.querySelectorAll('#app section.card'))section.classList.toggle('mobileHidden',!['monthlyReference','salesSection'].includes(section.id));});
assert.equal(await page.locator('#friedrichStock').isVisible(),false,'Startup mobile filter hides stock before click');
await page.locator('[data-gp-area="articles"]').click();
await page.locator('#friedrichStockTile').click();
await page.locator('#friedrichStock [role=status]').waitFor({state:'visible'});
assert.equal(await page.locator('#gpMockupDetail').isVisible(),true,'Real cockpit parent must open');
assert.equal(await page.locator('#friedrichStock').isVisible(),true,'Real cockpit CSS must show stock');
assert.equal(await page.locator('#friedrichStock').evaluate(e=>e.classList.contains('mobileHidden')),false,'Stock route must remove startup mobileHidden');
await page.locator('#gpMockupBack').click();
await page.locator('#friedrichStockTile').click();
assert.equal(await page.locator('#friedrichStock').isVisible(),true,'Stock reopens from overview');
// Newest request resolves first; an older response must not erase its panel.
await page.evaluate(async()=>{
 const {mountStock}=await import('/friedrich-stock.js');
 window.pendingStock=[];
 await mountStock({rpc:()=>new Promise(resolve=>window.pendingStock.push(resolve))},()=> '6a5484d1-daf6-4263-897d-24cdf536aa29');
});
await page.locator('#friedrichStockTile').click();
await page.locator('#friedrichStockTile').click();
await page.evaluate(()=>window.pendingStock.at(-1)({data:[]}));
await page.getByText('Gemeinsamer Supabase-Bestand',{exact:false}).waitFor();
await page.evaluate(()=>window.pendingStock[0]({data:[]}));
await page.getByText('Gemeinsamer Supabase-Bestand',{exact:false}).waitFor();
assert.equal(await page.locator('#friedrichStockPanel h2').count(),1,'Older response must not clear newest render');
console.log('Out-of-order stock responses preserve panel at '+width+'px');
console.log('Actual cockpit navigation passed at '+width+'px with mocked read-only stock data');
await page.close();console.log('Fixture browser interactions passed at '+width+'px; no production UI session.');}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

