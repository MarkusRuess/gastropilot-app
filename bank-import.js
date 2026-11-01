import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const supabase=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
let extracted=false,fullText='',statementRows=[];
function msg(t){$('bankImportStatus').textContent=t}
function parseEuro(t){const n=t.replace(/\s/g,'').replace(/\./g,'').replace(',','.');return /^-?\d+(?:\.\d{1,2})?$/.test(n)?Number(n):null}
function candidates(text){
 const rows=text.split('\n').map(x=>x.trim()).filter(Boolean);
 const matches=[];
 for(let i=0;i<rows.length;i++){
  if(!/(?:end(?:saldo|bestand)|kontostand|neuer saldo|saldo per|schlusssaldo)/i.test(rows[i]))continue;
  const context=rows.slice(i,Math.min(i+2,rows.length)).join(' ');
  const nums=[...context.matchAll(/(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})(?:\s*EUR)?/g)].map(m=>parseEuro(m[1])).filter(x=>x!==null);
  if(nums.length===1)matches.push({amount:nums[0],line:context});
 }
 return matches;
}
$('bankRead').onclick=async()=>{
 const file=$('bankPdf').files?.[0];extracted=false;$('bankReview').classList.add('hidden');$('bankConfirmed').checked=false;
 if(!file){msg('Bitte zuerst eine PDF-Datei auswählen.');return}
 if(file.size>12*1024*1024){msg('PDF ist größer als 12 MB. Bitte eine kleinere Datei auswählen.');return}
 if(!file.name.toLowerCase().endsWith('.pdf')||file.type&&file.type!=='application/pdf'){msg('Bitte eine PDF-Datei auswählen.');return}
 try{
 msg('PDF wird ausschließlich auf deinem Gerät gelesen …');
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>40)throw Error('Maximal 40 Seiten pro Import.');
 let pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i);const items=(await page.getTextContent()).items;
  let lines=[],line='',prevY=null;
  for(const item of items){const y=Math.round(item.transform?.[5]||0);if(prevY!==null&&Math.abs(y-prevY)>3){lines.push(line);line=''}line+=(line?' ':'')+(item.str||'');prevY=y}
  if(line)lines.push(line);pages.push(lines.join('\n'));
 }
 const text=pages.join('\n--- SEITE ---\n');
 fullText=text;
 statementRows=parseStatement(text);
 if(text.trim().length<35)throw Error('Kein auslesbarer PDF-Text gefunden. Ein gescanntes Bild-PDF benötigt später eine gesicherte Texterkennung.');
 const found=candidates(text);
 $('bankPreview').value=text.slice(0,24000);
 $('bankBalance').value=found.length===1?found[0].amount.toFixed(2):'';
 $('bankDate').value='';
 $('bankAccountName').value='';
 $('bankReview').classList.remove('hidden');extracted=true;
 msg('PDF lokal gelesen: '+statementRows.length+' mögliche Einzelbuchungen. Bitte Anzahl, Konto und Summen mit dem Auszug prüfen. Der Kontostand kann separat gespeichert werden.');
 $('bankRowPreview').textContent=statementRows.length+' Buchungen · Eingänge '+money(statementRows.filter(x=>x.amount>0).reduce((a,x)=>a+x.amount,0))+' · Ausgänge '+money(statementRows.filter(x=>x.amount<0).reduce((a,x)=>a+x.amount,0));
 }catch(e){msg('PDF konnte nicht ausgewertet werden: '+e.message)}
};
$('bankSave').onclick=async()=>{
 if(!extracted)return msg('Bitte zuerst eine PDF-Datei auslesen.');
 if(!$('bankConfirmed').checked)return msg('Bitte die Kontrolle ausdrücklich bestätigen.');
 const account=$('bankAccountName').value,amount=Number($('bankBalance').value),date=$('bankDate').value;
 if(!account||!$('bankBalance').value||!Number.isFinite(amount)||!date)return msg('Konto, Betrag und Datum vollständig angeben.');
 try{
 const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw Error('Bitte anmelden.');
 const m=await supabase.from('business_members').select('business_id,role,businesses(name)').eq('user_id',auth.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness.choose(m.data?.filter(v=>v.role==='owner'));
 if(!member)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 const existing=await supabase.from('cash_accounts').select('id,balance_date').eq('business_id',member.business_id).ilike('account_name',account).order('balance_date',{ascending:false}).limit(1);
 if(existing.error)throw existing.error;
 if(existing.data?.length&&existing.data[0].balance_date>date)throw Error('Ein neuerer Kontostand ist bereits gespeichert. Bitte zuerst den Zeitraum prüfen.');
 const row={business_id:member.business_id,account_name:account,account_type:account==='Kassa'?'cash':'bank',current_balance:amount,balance_date:date,currency:'EUR'};
 const res=existing.data?.length?await supabase.from('cash_accounts').update(row).eq('id',existing.data[0].id).eq('business_id',member.business_id):await supabase.from('cash_accounts').insert(row);
 if(res.error)throw res.error;
 extracted=false;$('bankConfirmed').checked=false;
 msg('Kontostand gespeichert. Bitte die Verwaltungsseite neu laden, um die Liquiditätsübersicht zu aktualisieren.');
 }catch(e){msg('Nicht gespeichert: '+e.message)}
};

const money=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
function parseStatement(text){
 const rows=[];
 for(const line of text.split('\n')){
  // Volksbank Umsatzübersicht: Buchungscode, Buchungstag, Gegenpartei, Valuta, Betrag.
  const m=line.match(/^\s*(?:\d{1,3}\s+)?(\d{2})\.(\d{2})\.(\d{4})\s+(.+?)\s+\d{2}\.\d{2}\.\d{4}\s+(-?[\d.]+,\d{2})\s*EUR\s*$/);
  if(!m)continue;
  const amount=parseEuro(m[5]),payee=m[4].trim();
  if(amount===null||!payee||/^(?:SB|Saldo|Buchungstext)$/i.test(payee))continue;
  rows.push({booking_date:m[3]+'-'+m[2]+'-'+m[1],payee,amount});
 }
 return rows;
}
const review=$('bankReview');
const summary=document.createElement('p');summary.id='bankRowPreview';summary.setAttribute('role','status');review.append(summary);
const rowConfirm=document.createElement('label');
rowConfirm.innerHTML='<input id="bankRowsConfirmed" type="checkbox" style="display:inline;width:auto"> Buchungsanzahl, Eingänge, Ausgänge und richtiges Unternehmen mit PDF geprüft';
const rowButton=document.createElement('button');rowButton.type='button';rowButton.textContent='Geprüfte Einzelbuchungen übernehmen';
review.append(rowConfirm,rowButton);
rowButton.onclick=async()=>{
 if(!extracted||!statementRows.length)return msg('Keine erkannten Einzelbuchungen. Nichts gespeichert.');
 if(!$('bankRowsConfirmed').checked)return msg('Bitte Summen und Betrieb zuerst mit dem PDF prüfen.');
 const iban=fullText.match(/\bAT\d{18}\b/)?.[0];
 const businesses={'AT154300042398868010':'87889eaf-f865-4e3a-8f9a-cd01db483e0e','AT394300042300580000':'6a5484d1-daf6-4263-897d-24cdf536aa29'};
 if(!iban||!businesses[iban])return msg('Konto unbekannt. Kein Import.');
 const account='Volksbank';
 try{
  const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw Error('Bitte anmelden.');
  const m=await supabase.from('business_members').select('business_id,role,businesses(name)').eq('user_id',auth.data.user.id).eq('business_id',businesses[iban]).eq('role','owner').limit(1);
  if(m.error||!m.data?.length)throw Error('Kein Inhaberzugriff auf das Konto dieses Betriebs.');
  const selected=window.GastroPilotBusiness.choose(m.data);
  if(!selected||selected.business_id!==businesses[iban])throw Error('Aktiver Betrieb passt nicht zum Konto. Bitte Betrieb wechseln.');
  const min=statementRows.map(x=>x.booking_date).sort()[0],max=statementRows.map(x=>x.booking_date).sort().at(-1);
  const existing=[];for(let offset=0;;offset+=1000){
   const res=await supabase.from('bank_transactions').select('booking_date,payee,amount').eq('business_id',selected.business_id).gte('booking_date',min).lte('booking_date',max).range(offset,offset+999);
   if(res.error)throw res.error;existing.push(...(res.data||[]));if((res.data||[]).length<1000)break;
  }
  const key=x=>[x.booking_date,String(x.payee).toLocaleLowerCase('de-AT').replace(/\s+/g,' ').trim(),Number(x.amount).toFixed(2)].join('|');
  const counts=new Map();for(const x of existing)counts.set(key(x),(counts.get(key(x))||0)+1);
  const incoming=new Map(),fresh=[];let duplicates=0;
  for(const x of statementRows){
   const k=key(x),n=(incoming.get(k)||0)+1;incoming.set(k,n);
   if(n<=(counts.get(k)||0)){duplicates++;continue}
   fresh.push(x);
  }
  const rows=[],freshCounts=new Map();for(const x of fresh){
   const occurrence=(freshCounts.get(key(x))||0)+1;freshCounts.set(key(x),occurrence); // distinct import hash, PDF itself is never stored
   const bytes=new TextEncoder().encode(iban+'|'+key(x)+'|'+occurrence);
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
   rows.push({business_id:selected.business_id,account_name:account,...x,description:'',category:'unassigned',match_status:'unmatched',source_hash:hash});
  }
  let inserted=0;for(let i=0;i<rows.length;i+=100){
   const result=await supabase.from('bank_transactions').insert(rows.slice(i,i+100)).select('id');
   if(result.error)throw result.error;inserted+=(result.data||[]).length;
  }
  msg('Bankimport: '+inserted+' neue Buchungen, '+duplicates+' bereits vorhanden. Keine PDF gespeichert; alle neuen Fälle bleiben ungeprüft.');
  $('bankRowsConfirmed').checked=false;
 }catch(e){msg('Import gestoppt: '+e.message)}
};
