import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id),euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
let businessId=null,pdfRead=false,photoCount=0;
const status=t=>$('status').textContent=t;
function line(target,title,detail){const div=document.createElement('div');div.className='entry';const a=document.createElement('strong');a.textContent=title;const b=document.createElement('small');b.textContent=' '+detail;div.append(a,b);target.append(div)}
async function enter(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)return;
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const x=m.data?.find(v=>v.role==='owner'&&v.businesses?.name?.includes('Friedrich'));
 if(!x)throw Error('Kein Inhaberzugriff für Das Friedrich.');
 businessId=x.business_id;$('login').classList.add('hidden');$('app').classList.remove('hidden');await refresh();
}
async function refresh(){
 if(!businessId)return;
 try{
 const month=$('month').value,start=month+'-01',end=month+'-31';
 const [days,summ,items,hours]=await Promise.all([
 db.from('cash_reports').select('id,report_date,gross_revenue').eq('business_id',businessId).gte('report_date',start).lte('report_date',end).order('report_date'),
 db.from('monthly_cash_summaries').select('*').eq('business_id',businessId).eq('month',start).maybeSingle(),
 db.from('sales_items').select('item_name,quantity,gross_amount,cash_report_id').eq('business_id',businessId).limit(10000),
 db.from('monthly_hourly_sales').select('*').eq('business_id',businessId).eq('month',start).order('hour_of_day')
 ]);
 for(const r of [days,summ,items,hours])if(r.error)throw r.error;
 const daily=days.data||[],ids=new Set(daily.map(x=>x.id)),gross=daily.reduce((s,x)=>s+Number(x.gross_revenue||0),0);
 const summary=summ.data;
 $('dailyTotal').textContent=daily.length?euro(gross):'–';$('monthlyTotal').textContent=summary?euro(Number(summary.gross_revenue)):'–';
 $('difference').textContent=summary&&daily.length?euro(Number(summary.gross_revenue)-gross):'–';
 $('dayCount').textContent=String(new Set(daily.map(x=>x.report_date)).size);
 const unique=new Set(daily.map(x=>x.report_date));
 const duplicates=daily.length-unique.size;
 $('completeness').textContent=(duplicates?'Achtung: '+duplicates+' doppelte Tagesberichte. ':'')+(summary?'Monatsbericht gespeichert. ':'Monatsbericht fehlt. ')+(daily.length?'Prüfe fehlende Öffnungstage und Differenzen.':'Noch keine Tagesberichte für diesen Monat.')+(summary&&summary.cash_total!=null&&summary.card_total!=null?' Bar + Karte: '+euro(Number(summary.cash_total)+Number(summary.card_total))+'.':'');
 if(summary){const f=$('summaryForm').elements;for(const k of ['gross_revenue','cash_total','card_total','receipt_count','notes'])f[k].value=summary[k]??''}
 const grouped=new Map();for(const x of items.data||[]){if(!ids.has(x.cash_report_id))continue;const key=x.item_name||'Unbenannt',g=grouped.get(key)||{qty:0,gross:0};g.qty+=Number(x.quantity||0);g.gross+=Number(x.gross_amount||0);grouped.set(key,g)}
 $('products').replaceChildren();for(const [name,g] of [...grouped].sort((a,b)=>b[1].qty-a[1].qty))line($('products'),name,g.qty+' Stück · '+euro(g.gross));
 if(!grouped.size)line($('products'),'Keine Produktmengen','Für diesen Monat erfasst');
 $('hours').replaceChildren();
 const hourRows=[...(hours.data||[])].sort((a,b)=>Number(b.gross_revenue)-Number(a.gross_revenue));
 for(const [i,x] of hourRows.entries())line($('hours'),String(x.hour_of_day).padStart(2,'0')+':00–'+String(x.hour_of_day).padStart(2,'0')+':59',euro(Number(x.gross_revenue))+(i===0?' · Umsatzspitze':'')+(x.receipt_count==null?'':' · '+x.receipt_count+' Belege'));
 if(!hourRows.length)line($('hours'),'Noch keine Stundenwerte','Stundenbericht erforderlich');
 status('Monatskontrolle aktualisiert.');
 }catch(e){status('Fehler: '+e.message)}
}
$('loginForm').onsubmit=async e=>{e.preventDefault();const r=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(r.error)return status(r.error.message);await enter()};
$('month').onchange=refresh;
$('readPdf').onclick=async()=>{
 pdfRead=false;const file=$('pdf').files?.[0];
 if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>15e6)return status('Bitte PDF bis 15 MB auswählen.');
 try{
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;if(pdf.numPages>60)throw Error('Maximal 60 Seiten.');
 const pages=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);pages.push((await p.getTextContent()).items.map(x=>x.str||'').join(' '))}
 const t=pages.join('\n--- SEITE ---\n');if(t.trim().length<30)throw Error('Kein lesbarer Text im PDF.');
 $('preview').value=t.slice(0,60000);pdfRead=true;status('PDF gelesen. Bitte Monatswerte mit Original prüfen und eingeben.');
 }catch(e){status('PDF nicht lesbar: '+e.message)}
};
let photoUrls=[];
function updatePhotos(files,append){
 if(!append){for(const u of photoUrls)URL.revokeObjectURL(u);photoUrls=[];$('photoGallery').replaceChildren();photoCount=0;}
 for(const file of files){
  if(photoCount>=12){$('photoStatus').textContent='Maximal 12 Fotos pro Monatsabrechnung.';break}
  if(!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)&&!/\\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))continue;
  if(file.size>15e6){$('photoStatus').textContent='Foto zu groß: maximal 15 MB pro Bild.';continue}
  const url=URL.createObjectURL(file);photoUrls.push(url);photoCount++;
  const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  const img=document.createElement('img');img.src=url;img.alt='Monatsabrechnung Seite '+photoCount;img.style.cssText='width:100%;height:210px;object-fit:contain;border:1px solid #ddd;border-radius:10px;background:#fafafa';
  const label=document.createElement('small');label.textContent='Seite '+photoCount+' · Vergrößern';a.append(img,label);$('photoGallery').append(a);
 }
 if(photoCount)$('photoStatus').textContent=photoCount+' Foto(s) lokal geladen. Werte aus den Fotos bitte manuell übertragen und kontrollieren. Fotos werden nicht hochgeladen.';
}
$('monthlyPhotos').addEventListener('change',e=>updatePhotos(e.target.files,false));
$('monthlyCamera').addEventListener('change',e=>updatePhotos(e.target.files,true));
$('summaryForm').onsubmit=async e=>{
 e.preventDefault();try{
 if(!pdfRead&&photoCount===0)throw Error('Bitte zuerst Fotos auswählen oder das Monats-PDF auslesen.');
 const f=new FormData(e.currentTarget);if(f.get('verified')!=='on')throw Error('Prüfung fehlt.');
 const row={business_id:businessId,month:$('month').value+'-01',notes:String(f.get('notes')||'')};
 for(const k of ['gross_revenue','cash_total','card_total','receipt_count']){const v=f.get(k);row[k]=v===''?null:Number(v);if(row[k]!=null&&!Number.isFinite(row[k]))throw Error('Ungültige Zahl.')}
 if(row.gross_revenue==null)throw Error('Bruttoumsatz fehlt.');
 const r=await db.from('monthly_cash_summaries').upsert(row,{onConflict:'business_id,month'});if(r.error)throw r.error;
 status('Monatsabschluss gespeichert.');await refresh();
 }catch(err){status('Nicht gespeichert: '+err.message)}
};
$('hourForm').onsubmit=async e=>{
 e.preventDefault();try{
 const f=new FormData(e.currentTarget);if(f.get('verified')!=='on')throw Error('Prüfung fehlt.');
 const h=Number(f.get('hour_of_day')),amount=Number(f.get('gross_revenue')),count=f.get('receipt_count');
 if(!Number.isInteger(h)||h<0||h>23||!Number.isFinite(amount)||amount<0)throw Error('Ungültiger Stundenwert.');
 const row={business_id:businessId,month:$('month').value+'-01',hour_of_day:h,gross_revenue:amount,receipt_count:count===''?null:Number(count)};
 const r=await db.from('monthly_hourly_sales').upsert(row,{onConflict:'business_id,month,hour_of_day'});if(r.error)throw r.error;
 e.currentTarget.reset();status('Stundenwert gespeichert.');await refresh();
 }catch(err){status('Nicht gespeichert: '+err.message)}
};
try{await enter()}catch(e){status(e.message)}
