// Full UI uses synthetic staff/API fixtures only; no production login or writes.
import {chromium} from 'playwright';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900}});await page.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));let owner=true;
 const customer={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic Archivkunde',email:'fixture@example.invalid'},id=n=>'22222222-2222-4222-8222-'+String(n).padStart(12,'0');
 const orders=[1,2].map(n=>({id:id(n),customer_id:customer.id,occasion:'Geburtstag '+n,requested_date:'2026-11-12',status:'confirmed',fulfillment_status:n===1?'ready':null,archived_at:null,picked_up_at:null,details:`Backliste: ${n+1} | 24 cm | Sacher | Keine\nPreis 250 €`}));
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url()),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'};
  if(url.hostname==='esm.sh')return route.fulfill({headers,contentType:'text/javascript',body:"export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture',user:{email:'fixture@example.invalid'}}}}),signOut:async()=>{}}});"});
  if(url.hostname.endsWith('supabase.co')){let data={ok:true,role:owner?'owner':'staff',settings:{},mail_setup:{},items:[],online:0,total:0};
   if(url.pathname.endsWith('judith-ai-inbox')){const view=url.searchParams.get('view');if(req.method()==='PATCH'){const payload=req.postDataJSON();if(!owner)return route.fulfill({headers,status:403,json:{error:'Forbidden'}});writes.push(payload);const order=orders.find(o=>o.id===payload.inquiry_id);order.archived_at=payload.action==='archive_order'?'2026-11-03T12:00:00Z':null;data={ok:true,inquiry:order};}
    else if(view==='archive'&&!owner)return route.fulfill({headers,status:403,json:{error:'Forbidden'}});
    else data={ok:true,can_archive_orders:owner,customers:[customer],inquiries:orders.filter(o=>view==='archive'?o.archived_at:!o.archived_at),attachments:[]};
   }return route.fulfill({headers,json:data});
  }
  if(url.hostname==='fixture.local'){try{return route.fulfill({body:await readFile('.'+url.pathname),contentType:url.pathname.endsWith('.html')?'text/html':'text/javascript'})}catch{return route.fulfill({status:404,body:'Missing fixture'})}}return route.abort();
 });
 async function section(name){await page.locator('.jd-cards a[href="#'+name+'"]').click()}
 async function orderViews(){await section('judith-orders');if((await page.locator('#orders-section').getAttribute('open'))===null)await page.locator('#orders-section>summary').click();await page.locator('#load-orders').click()}
 async function restore(){if((await page.locator('#judith-order-archive').getAttribute('open'))===null)await page.locator('#judith-order-archive>summary').click();else await page.getByRole('button',{name:'Archiv aktualisieren'}).click();await page.locator('#ja-list').getByRole('button',{name:'↩️ Auftrag wiederherstellen'}).waitFor();page.once('dialog',d=>d.accept());await page.locator('#ja-list').getByRole('button',{name:'↩️ Auftrag wiederherstellen'}).click();await page.locator('#orders-status').filter({hasText:'2 von 2'}).waitFor()}
 await page.goto('https://fixture.local/judith-ai/postfach.html');await page.locator('#app').waitFor({state:'visible'});
 // Calendar: cancellation, exact name/date confirmation, only chosen order archived.
 await section('judith-calendar');await page.locator('#jc-grid button[aria-label^="12.11.2026,"]').click();const calendar=page.locator('#jc-day [data-order-id="'+id(1)+'"]');await calendar.getByRole('button',{name:'📋 Auftrag öffnen',exact:true}).click();page.once('dialog',d=>d.dismiss());await calendar.getByRole('button',{name:'🗑️ Auftrag entfernen'}).click();assert.equal(writes.length,0);
 page.once('dialog',async d=>{assert.match(d.message(),/Synthetic Archivkunde/);assert.match(d.message(),/12\.11\.2026/);await d.accept()});await calendar.getByRole('button',{name:'🗑️ Auftrag entfernen'}).click();await calendar.waitFor({state:'detached'});assert.ok(orders[0].archived_at);assert.equal(orders[1].archived_at,null);
 await orderViews();await page.locator('#orders-status').filter({hasText:'1 von 1'}).waitFor();await page.locator('#backlist-section>summary').click();await page.locator('#jb-bases tfoot').filter({hasText:'3'}).waitFor();assert.equal(await page.locator('#orders-list>details').count(),1);assert.equal(await page.locator('.jd-extra a').filter({hasText:'Backstube'}).getAttribute('href'),'#judith-orders');
 // Protected restore preserves readiness and restores backlist counts.
 await restore();await page.locator('#jb-bases tfoot').filter({hasText:'5'}).waitFor();assert.equal(orders[0].fulfillment_status,'ready');assert.equal(orders[0].status,'confirmed');
 // Order management / Backstube expose the same archive action.
 const card=page.locator('#orders-list [data-order-id="'+id(1)+'"]');await card.locator('summary').first().click();page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'🗑️ Auftrag entfernen'}).click();await card.waitFor({state:'detached'});await restore();
 // Customer file exposes an archive action per actual order, customer stays present.
 await section('judith-customers');await page.locator('#load-customers').click();await page.locator('#customers-list>.customer-row>summary').first().click();const customerOrder=page.locator('#customers-list [data-order-id="'+id(1)+'"]');page.once('dialog',d=>d.accept());await customerOrder.getByRole('button',{name:'🗑️ Auftrag entfernen'}).click();await customerOrder.waitFor({state:'detached'});assert.equal(await page.locator('#customers-list>.customer-row').count(),1);
 await orderViews();await restore();await page.reload();await page.locator('#app').waitFor({state:'visible'});
 // Capability from the server controls visibility; real authorization is tested in handler tests.
 owner=false;await page.reload();await page.locator('#app').waitFor({state:'visible'});await orderViews();await page.locator('#orders-status').filter({hasText:'2 von 2'}).waitFor();assert.equal(await page.locator('#judith-order-archive').isVisible(),false);await page.locator('#orders-list>details>summary').first().click();assert.equal(await page.getByRole('button',{name:'🗑️ Auftrag entfernen'}).count(),0);
 assert.equal(writes.filter(w=>w.action==='archive_order').length,3);assert.equal(writes.filter(w=>w.action==='restore_order').length,3);assert.equal(orders.length,2);assert.ok(orders.every(o=>o.details.includes('Preis 250 €')));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log(`Archive browser passed ${width}px: calendar, orders/Backstube, customers, confirm/cancel, restore, backlist exclusion, permissions, no customer loss`);await page.close();
}}finally{await browser.close()}
