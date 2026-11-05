// Component tests only: actual picker markup/handlers, no accounts or production writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium,webkit}=createRequire(import.meta.url)('playwright');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const intake=html.match(/<section class="card" id="intake">[\s\S]*?<\/section>/)[0];
const handlers=html.slice(html.indexOf("for(const [labelId,inputId]"),html.indexOf('async function startDesktopPdf'));
const drawFunction=html.match(/function drawQueue\(\)\{[^\n]+/)[0];
const queueFunction=html.match(/function queueFiles\(files\)\{[^\n]+/)[0];
let passed=0;
for(const engine of (process.env.SKIP_BROWSER==='1'?[]:[chromium,webkit])){
 const browser=await engine.launch({headless:true});
 try{for(const business of ['Judith','Friedrich']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>.hidden{display:none}.gp-file-picker-button{display:block;padding:16px}</style>'+intake);
  await page.addScriptTag({content:`const E=id=>document.getElementById(id);let busy=false,queue=[];const isSpreadsheet=()=>false;function process(){};${drawFunction}\n${queueFunction}\n${handlers}`});
  for(const [label,input,multiple] of [['camera','cameraInput',false],['fileButton','fileInput',true]]){
   const choice=page.waitForEvent('filechooser');await page.locator('#'+label).tap();
   const chooser=await choice;assert.equal(await chooser.element().getAttribute('id'),input);assert.equal(chooser.isMultiple(),multiple);
   await chooser.setFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('synthetic image fixture')});
   assert.match(await page.locator('#fileQueue').textContent(),/^1 von 12/);assert.equal(await page.locator('#'+input).inputValue(),'');
   assert.equal(await page.locator('#confirmUpload').isEnabled(),true);
   await page.locator('#clearUpload').click();assert.match(await page.locator('#fileQueue').textContent(),/^0 von 12/);passed++;
  }
  assert.equal(await page.locator('#cameraInput').getAttribute('capture'),'environment');
  for(const key of ['Enter','Space']){await page.locator('#camera').focus();const choice=page.waitForEvent('filechooser');await page.keyboard.press(key);const chooser=await choice;await chooser.setFiles([]);passed++;}
  console.log(engine.name()+': '+business+' touch camera/gallery + keyboard passed (390px, isolated component)');
  await page.close();
 }}finally{await browser.close();}
}
// Execute the actual hash lookup/upload function against a scoped in-memory DB.
const secure=html.slice(html.indexOf('async function secureOriginal(file)'),html.indexOf('async function recognizePhotoGroup'));
const bids=['87889eaf-f865-4e3a-8f9a-cd01db483e0e','6a5484d1-daf6-4263-897d-24cdf536aa29'];
const rows=[],uploads=[];
const db={from(table){assert.equal(table,'documents');const filters=[];let value;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},contains(k,v){filters.push(r=>Object.entries(v).every(([a,b])=>r[k]?.[a]===b));return q},order(){return q},limit(){return q},insert(v){value=v;return q},single(){const row={...value,id:String(rows.length+1)};rows.push(row);return Promise.resolve({data:row})},then(resolve){resolve({data:rows.filter(r=>filters.every(f=>f(r)))})}};return q},storage:{from(bucket){assert.equal(bucket,'invoice-originals');return {async upload(path){uploads.push(path);return {}},async remove(){throw Error('Unexpected removal')}}}}};
const context=vm.createContext({db,crypto:webcrypto,Uint8Array,Date,BID:bids[0],user:{id:'fixture-user'},isSpreadsheet:()=>false});
vm.runInContext(secure+';this.secureOriginal=secureOriginal;',context);
const file={name:'fixture.png',type:'image/png',arrayBuffer:async()=>new TextEncoder().encode('same image').buffer};
const first=await context.secureOriginal(file);rows[0].document_type='cash_report';rows[0].status='reviewed';
const repeat=await context.secureOriginal(file);assert.equal(repeat.id,first.id);assert.equal(repeat.alreadyRecognized,true);assert.equal(uploads.length,1);passed++;
context.BID=bids[1];const other=await context.secureOriginal(file);assert.notEqual(other.id,first.id);assert.equal(rows[1].business_id,bids[1]);assert.ok(uploads[1].startsWith(bids[1]+'/'));passed++;
console.log('PASS '+passed+' picker/hash-isolation scenarios. No real smartphone, OCR, authentication or live persistence claim.');
