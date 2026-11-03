import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let playwright;try{playwright=require('playwright')}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
const root=process.cwd();const server=createServer((req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',path.endsWith('.html')?'text/html':'text/javascript');res.end(readFileSync(root+path))}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await playwright.chromium.launch({headless:true});let assertions=0;
try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[],requests=[];await page.clock.setFixedTime(new Date('2026-11-03T12:00:00Z')); page.on('pageerror',e=>errors.push(e.message));
 const customer={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic Calendar Customer',email:'qa@example.invalid',phone:'123'};
 const orders=Array.from({length:9},(_,i)=>({id:'22222222-2222-4222-8222-'+String(i).padStart(12,'0'),customer_id:customer.id,occasion:'Geburtstag '+i,requested_date:'2026-11-06',status:'confirmed',fulfillment_status:null,picked_up_at:null,details:'Synthetic details. Vereinbarter Preis brutto: 250 €',guests:12}));
 await page.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:`export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'synthetic',user:{email:'qa@example.invalid'}}}}),signOut:async()=>{}}}}`}));
 await page.route('https://sjnwfwcpgwsavygewwzb.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.postDataJSON?.();requests.push({path:url.pathname,method:req.method(),body});let data={ok:true};
  if(url.pathname.endsWith('judith-ai-status'))data={ok:true,role:'staff'};
  if(url.pathname.endsWith('judith-ai-inbox')){
   if(req.method()==='PATCH'){const order=orders.find(o=>o.id===body.inquiry_id);if(body.action==='set_status'){Object.assign(order,{status:body.status==='picked_up'?'picked_up':'confirmed',fulfillment_status:['ready','in_progress'].includes(body.status)?body.status:null,picked_up_at:body.status==='picked_up'?new Date().toISOString():null});data={ok:true,inquiry:order}}else if(body.action==='edit'){Object.assign(order,body.changes);data={ok:true,inquiry:order}}else data={ok:true,customer};}
   else data={ok:true,inquiries:orders,customers:[customer],attachments:[]};
  }
  if(url.pathname.endsWith('judith-ai-presence'))data={ok:true,items:[],online:0,total:1};
  await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(data)});
 });
 await page.goto(base+'/judith-ai/postfach.html');await page.locator('#app').waitFor({state:'visible'});
 await page.locator('.jd-cards a[href="#judith-calendar"]').click();await page.locator('#jc-status').filter({hasText:'9 datierte'}).waitFor();
 // Test is independent of the runner date.
 while(!(await page.locator('#jc-month').innerText()).includes('November 2026')){const text=await page.locator('#jc-month').innerText();if(text.includes('2026')&&/Dezember/.test(text))await page.locator('#jc-prev').click();else await page.locator('#jc-next').click();}
 await page.locator('#jc-grid button[aria-label^="06.11.2026,"]').click();assert.equal(await page.locator('.jo-card').count(),9);assert.equal(await page.locator('.jo-body:visible').count(),0);assert.equal(await page.locator('.jo-heading').filter({hasText:'🟡 Beauftragt'}).count(),9);assertions+=3;
 await page.locator('.jo-card').nth(0).getByRole('button',{name:'📋 Auftrag öffnen',exact:true}).click();await page.locator('.jo-card').nth(1).getByRole('button',{name:'📋 Auftrag öffnen',exact:true}).click();assert.equal(await page.locator('.jo-body:visible').count(),1);assert.equal(await page.locator('.jo-price[open]').count(),0);assert.equal(requests.filter(r=>r.path.endsWith('judith-ai-price-advisor')).length,0);assertions+=3;
 const second=page.locator('.jo-card').nth(1);await second.getByRole('button',{name:'✏️ Auftrag bearbeiten',exact:true}).click();assert.equal(await second.locator('input[name=requested_date]').inputValue(),'2026-11-06');await second.locator('button').filter({hasText:'Abbrechen'}).click();await second.getByRole('button',{name:'✏️ Kundendaten',exact:true}).click();assert.equal(await second.locator('input[name=name]').inputValue(),customer.name);await second.locator('button').filter({hasText:'Abbrechen'}).click();assertions+=2;
 async function setStage(stage){const card=page.locator('.jo-card').nth(1);if(!await card.locator('.jo-body').isVisible())await card.getByRole('button',{name:'📋 Auftrag öffnen',exact:true}).click();await card.locator('select').selectOption(stage);await card.getByRole('button',{name:'Status speichern'}).click()}
 await setStage('in_progress');await page.locator('.jo-heading').filter({hasText:'🔵 In Arbeit'}).waitFor();
 await setStage('ready');await page.locator('.jo-heading').filter({hasText:'🟠 Abholbereit'}).waitFor();
 // A cancelled confirmation must produce no write.
 let before=requests.filter(r=>r.method==='PATCH').length;page.once('dialog',d=>d.dismiss());await setStage('picked_up');assert.equal(requests.filter(r=>r.method==='PATCH').length,before);assertions++;
 page.once('dialog',d=>d.accept());await setStage('picked_up');await page.locator('.jo-heading').filter({hasText:'🟢 Abgeholt'}).waitFor();
 await setStage('ready');await page.locator('.jo-heading').filter({hasText:'🟠 Abholbereit'}).waitFor();assert.equal(orders[1].picked_up_at,null);assertions++;
 await page.reload();await page.locator('.jd-cards a[href="#judith-orders"]').click();await page.locator('#load-orders').click();await page.locator('#orders-list summary').filter({hasText:'🟠 Abholbereit'}).waitFor();assertions++;
 // Backstube links to this same orders view, so status is not maintained separately.
 assert.ok((await page.locator('.jd-extra').innerHTML()).includes('href="#judith-orders">👩‍🍳 Backstube'));assertions++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assertions+=2;
 await page.close();console.log(`Calendar browser checks passed: ${width}px`);
}console.log(`${assertions} browser assertions passed`)}finally{await browser.close();server.close()}
