import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {prepareJudithFiles,mountJudithPickers,JUDITH_ID} from './judith-photo-upload.mjs';
const file=(name,type='')=>new File(['photo'],name,{type});
test('JPEG camera image stays unchanged',async()=>{const f=file('foto.jpg','image/jpeg');assert.equal((await prepareJudithFiles([f]))[0],f)});
test('missing JPEG MIME type is normalized',async()=>assert.equal((await prepareJudithFiles([file('IMG.JPEG')]))[0].type,'image/jpeg'));
test('PDF extension is normalized',async()=>assert.equal((await prepareJudithFiles([file('Abschluss.PDF')]))[0].type,'application/pdf'));
test('HEIC is converted once before the central upload',async()=>{let calls=0;const [f]=await prepareJudithFiles([file('IMG.heic','image/heic')],async()=>{calls++;return new Blob(['jpg'])});assert.equal(calls,1);assert.equal(f.type,'image/jpeg');assert.equal(f.name,'IMG.jpg')});
test('unreadable HEIC produces actionable error',async()=>await assert.rejects(prepareJudithFiles([file('IMG.heic','image/heic')],async()=>{throw Error('decode')}),/als JPG/));
test('unsupported files are not silently discarded',async()=>await assert.rejects(prepareJudithFiles([file('test.txt','text/plain')]),/Foto, PDF/));
test('oversized photos are rejected before recognition',async()=>await assert.rejects(prepareJudithFiles([{name:'big.jpg',type:'image/jpeg',size:21*1024*1024}]),/20 MB/));
class Node{
 constructor(id=''){this.id=id;this.children=[];this.attrs={};this.style={cssText:''};this.textContent=id;this.classList={remove:k=>{this.attrs.class=(this.attrs.class||'').replace(k,'')}}}
 get parentNode(){return this.parent}get nextSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]||null}
 setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}
 append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n)}}
 insertBefore(n,next){n.remove();n.parent=this;const i=this.children.indexOf(next);this.children.splice(i<0?this.children.length:i,0,n)}
 before(n){this.parent.insertBefore(n,this)}remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null}}
}
function dom(){const ids=['camera','fileButton','cameraInput','fileInput'];const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));const parent=new Node();parent.append(...Object.values(nodes));for(const id of ['cameraInput','fileInput'])nodes[id].attrs={class:'hidden',accept:id==='cameraInput'?'image/*':'image/jpeg'};return {nodes,parent,getElementById:id=>nodes[id],createElement:()=>new Node()}}
test('native tap target covers the camera and photo buttons',()=>{const d=dom();mountJudithPickers(d,true);for(const id of ['cameraInput','fileInput']){assert.match(d.nodes[id].style.cssText,/opacity:0/);assert.notEqual(d.nodes[id].parent,d.parent);assert.ok(!d.nodes[id].getAttribute('class').includes('hidden'))}});
test('Friedrich DOM is untouched and restored after Judith',()=>{const d=dom(),before=d.parent.children.map(x=>x.id);mountJudithPickers(d,false);assert.deepEqual(d.parent.children.map(x=>x.id),before);mountJudithPickers(d,true);mountJudithPickers(d,true);mountJudithPickers(d,false);assert.deepEqual(d.parent.children.map(x=>x.id),before);assert.equal(d.nodes.fileInput.getAttribute('accept'),'image/jpeg');assert.equal(d.nodes.cameraInput.getAttribute('class'),'hidden')});
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const handler=html.match(/for\(const id of \['cameraInput','fileInput'\]\)E\(id\).onchange=async e=>\{([\s\S]*?)\n\};/)[1];
function runHandler(bid,files){let processed=0,queued=[];const elements={uploadStatus:{textContent:''}};const context={BID:bid,JUDITH_ID,busy:false,image:async()=>{},File,E:id=>elements[id],drawQueue(){},queueFiles:files=>queued.push(...files),prepareJudithFiles,process:async()=>{processed++}};vm.createContext(context);return vm.runInContext('(async e=>{'+handler+'})',context)({target:{files,value:'x'}}).then(()=>({processed,queued,context}))}
test('Judith camera selection automatically invokes central processing',async()=>{const r=await runHandler(JUDITH_ID,[file('foto.jpg','image/jpeg')]);assert.equal(r.processed,1);assert.equal(r.queued.length,1);assert.equal(r.context.busy,false)});
test('Friedrich selection retains manual processing',async()=>{const r=await runHandler('friedrich',[file('foto.jpg','image/jpeg')]);assert.equal(r.processed,0);assert.equal(r.queued.length,1)});
test('cancelled picker does not start an upload',async()=>{const r=await runHandler(JUDITH_ID,[]);assert.equal(r.processed,0)});
test('business switch guard covers both directions involving Judith',()=>assert.match(html,/\(BID===JUDITH_ID\|\|member.business_id===JUDITH_ID\)&&queue.length&&member.business_id!==BID/));
test('existing archive filter uses business and business date',()=>{assert.match(html,/eq\('business_id',BID\)\.eq\('document_type','cash_report'\)\.eq\('document_date',x.date\)/);assert.match(html,/document_date:x.date/);assert.match(html,/lock=>\{if\(!lock\)/)});
