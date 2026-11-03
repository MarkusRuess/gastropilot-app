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
 const data={gp_f_stock_rules:[{article_number:'2000',item_id:items[0].item_id,per_sale:.33,note:'Betreiber'},{article_number:'1400',item_id:items[1].item_id,per_sale:8,note:'Betreiber'}],gp_f_stock_sales:[{business_id:F,article_number:'2000',article_name:'Villacher',closing_date:'2026-10-30',quantity:100,gross_amount:440}],bonit_daily_closings:[{closing_date:'2026-10-30',gross_amount:440}],gp_f_stock_closings:[],gp_inventory_snapshots:[],gp_f_stock_lines:[{id:'line',name:'Lieferung Bier',source_kind:'delivery',supplier:'Lieferant',raw_data:{quantity:1,unit:'Fass'},delivery_date:'2026-11-01',state:'review'}]};
 const db={rpc:async(name,args)=>{window.calls.push({name,args});if(name==='gp_f_stock_state')return {data:structuredClone(items)};if(name==='gp_f_stock_close'){data.gp_f_stock_closings.push({inventory_month:args.p_month,revision:1,payload:{items},created_at:new Date().toISOString()});return {data:{revision:1}};}return {data:null};},from(table){const q={filters:[],select(){return q},eq(k,v){q.filters.push([k,v]);return q},in(){return q},order(){return q},gte(){return q},lt(){return q},limit(){return q},range(){return q},insert(value){window.calls.push({table,value});if(table==='gp_f_stock_counts'){items[0].quantity=value.quantity;items[0].baseline=value.quantity;}q.write=true;return q},update(value){window.calls.push({table,value});q.write=true;return q},upsert(value){window.calls.push({table,value});q.write=true;return q},then(resolve){resolve({data:q.write?null:structuredClone(data[table]||[])});}};return q;}};
 window.db=db;window.addEventListener('gp:stock-open',()=>document.getElementById('friedrichStock')?.classList.remove('gp-area-hidden'));
 await mountStock(db,()=>window.biz);window.mount=mountStock;window.plan=()=>renderStockPlanning(db,F,document.getElementById('purchaseCards'));
});
// Reproduce the real cockpit: hidden parent and stale article-only visibility.
await page.evaluate(()=>document.body.classList.add('gp-friedrich-article-view','gp-article-area-active'));
await page.locator('#friedrichStockTile').click();
assert.equal(await page.locator('#gpMockupDetail').isVisible(),true);
assert.equal(await page.locator('#friedrichStock').isVisible(),true);
assert.equal(await page.locator('#friedrichStockTile').getAttribute('data-gp-area'),'stock');
assert.equal(await page.locator('#friedrichStockTile').getAttribute('aria-current'),'true');
assert.equal(await page.evaluate(()=>document.body.classList.contains('gp-friedrich-article-view')),false);await page.getByText('Gemeinsamer Supabase-Bestand',{exact:false}).waitFor();
const f=page.locator('#friedrichStock form').first();assert.equal(await f.locator('input[type=number]').inputValue(),'');await f.locator('input[type=number]').fill('0');await f.locator('input[type=datetime-local]').fill('2026-11-01T23:00');await f.locator('input[type=checkbox]').check();await f.getByText('Zählung speichern',{exact:true}).click();await page.waitForFunction(()=>window.calls.some(x=>x.table==='gp_f_stock_counts'));assert.equal(await page.evaluate(()=>window.calls.find(x=>x.table==='gp_f_stock_counts').value.quantity),0);
await page.getByRole('button',{name:'Alle Artikel',exact:true}).click();await page.getByText('Entkoffeinierter Kaffee',{exact:true}).first().waitFor();await page.getByText('Gebinde / Reserve bearbeiten oder Artikel ergänzen',{exact:true}).click();assert.equal(await page.getByLabel('Einkaufsgebinde in Bestandseinheiten').getAttribute('readonly'),'');
await page.evaluate(()=>window.plan());await page.getByText('Bestellmenge offen: Bestand oder Einkaufsgebinde unbekannt',{exact:true}).first().waitFor({state:'visible'});
assert.match(await page.locator('#purchaseCards').innerText(),/Reserve/);
await page.getByRole('button',{name:'Inventur',exact:true}).click();await page.getByRole('button',{name:'Monatsendstand speichern'}).click();await page.getByText(/Version 1/).first().waitFor();
const download=page.waitForEvent('download');await page.getByRole('button',{name:'PDF herunterladen',exact:true}).click();assert.match((await download).suggestedFilename(),/Friedrich_Inventur/);
await page.getByRole('button',{name:'Zuordnungen & Belege',exact:true}).click();await page.getByText('Lieferung Bier · Lieferant',{exact:false}).click();const review=page.locator('#friedrichStock details').first();await review.getByLabel('Gelieferte Gesamtmenge (Retouren negativ)').fill('50');await review.getByRole('button',{name:'Zuordnung bestätigen'}).click();await page.waitForFunction(()=>window.calls.some(x=>x.name==='gp_f_stock_confirm'));
assert.equal(await page.evaluate(()=>window.calls.find(x=>x.name==='gp_f_stock_confirm').args.p_quantity),50);
await page.getByRole('button',{name:'Wareneinsatz',exact:true}).click();await page.getByText('Tatsächlicher Wareneinsatz netto: unbekannt €',{exact:true}).waitFor();assert.match(await page.locator('#friedrichStock').innerText(),/Vollständigkeit der Einkaufsbelege nicht bestätigt/);
await page.getByRole('button',{name:'Wareneingänge',exact:true}).click();await page.getByText('Wareneingänge (keine erneuten Ausgaben)',{exact:true}).waitFor();
await page.getByRole('button',{name:'Lagerbewegungen',exact:true}).click();await page.getByText(/seit letzter Zählung:/).first().waitFor();
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
assert.equal(await page.locator('#friedrichStock h2').count(),1,'Older response must not clear newest render');
console.log('Out-of-order stock responses preserve panel at '+width+'px');
console.log('Actual cockpit navigation passed at '+width+'px with mocked read-only stock data');
await page.close();console.log('Fixture browser interactions passed at '+width+'px; no production UI session.');}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
