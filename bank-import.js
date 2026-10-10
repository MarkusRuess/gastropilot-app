import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const supabase=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
let extracted=false;
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
 if(text.trim().length<35)throw Error('Kein auslesbarer PDF-Text gefunden. Ein gescanntes Bild-PDF benötigt später eine gesicherte Texterkennung.');
 const found=candidates(text);
 $('bankPreview').value=text.slice(0,24000);
 $('bankBalance').value=found.length===1?found[0].amount.toFixed(2):'';
 $('bankDate').value='';
 $('bankAccountName').value='';
 $('bankReview').classList.remove('hidden');extracted=true;
 msg(found.length===1?'Ein möglicher Endsaldo wurde gefunden. Bitte unbedingt mit dem PDF vergleichen und das Datum selbst eintragen.':'PDF gelesen. Kein eindeutiger Endsaldo erkannt – bitte Kontostand und Datum anhand des Dokuments eintragen.');
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
