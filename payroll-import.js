import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
let loaded=false;
const msg=t=>$('payrollStatus').textContent=t;
$('payrollRead').onclick=async()=>{
 loaded=false;$('payrollReview').classList.add('hidden');$('payrollConfirm').checked=false;
 const file=$('payrollPdf').files?.[0];
 if(!file)return msg('Bitte einen Lohnzettel als PDF auswählen.');
 if(file.size>12*1024*1024||!file.name.toLowerCase().endsWith('.pdf'))return msg('Bitte eine PDF-Datei bis 12 MB auswählen.');
 try{
 msg('Lohnzettel wird lokal auf diesem Gerät gelesen …');
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>20)throw Error('Maximal 20 Seiten.');
 const pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i);
  const items=(await page.getTextContent()).items;
  let lines=[],line='',last=null;
  for(const x of items){const y=Math.round(x.transform?.[5]||0);if(last!==null&&Math.abs(y-last)>3){lines.push(line);line=''}line+=(line?' ':'')+(x.str||'');last=y}
  if(line)lines.push(line);pages.push(lines.join('\n'));
 }
 const text=pages.join('\n--- SEITE ---\n');
 if(text.trim().length<30)throw Error('Kein PDF-Text gefunden. Bild-PDFs benötigen eine separate gesicherte Texterkennung.');
 $('payrollPreview').value=text.slice(0,20000);
 $('payrollMonth').value='2026-09';$('payrollEmployee').value='';$('payrollGross').value='';$('payrollEmployer').value='';$('payrollNet').value='';
 $('payrollReview').classList.remove('hidden');loaded=true;
 msg('PDF gelesen. Bitte Mitarbeitername, Bruttolohn und zusätzliche Dienstgeberkosten anhand des Originals eintragen. Keine Werte werden geschätzt.');
 }catch(e){msg('Auslesen fehlgeschlagen: '+e.message)}
};
$('payrollSave').onclick=async()=>{
 if(!loaded)return msg('Bitte zuerst einen Lohnzettel auslesen.');
 if(!$('payrollConfirm').checked)return msg('Bitte die Angaben erst kontrollieren und bestätigen.');
 const month=$('payrollMonth').value,name=$('payrollEmployee').value.trim(),g=$('payrollGross').value,e=$('payrollEmployer').value,net=$('payrollNet').value;
 if(!/^\d{4}-\d{2}$/.test(month)||!name||g===''||e==='')return msg('Monat, Name und beide Beträge vollständig eintragen.');
 const gross=Number(g),employer=Number(e),netAmount=net===''?null:Number(net);
 if(!Number.isFinite(gross)||!Number.isFinite(employer)||gross<0||employer<0||(netAmount!==null&&(!Number.isFinite(netAmount)||netAmount<0)))return msg('Bitte gültige Beträge eintragen.');
 try{
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness.choose(m.data?.filter(v=>v.role==='owner'));
 if(!member)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 const row={business_id:member.business_id,accounting_month:month+'-01',employee_name:name,gross_salary:gross,employer_costs:employer,total_costs:gross+employer,net_payable:netAmount,payment_status:'open'};
 const previous=await db.from('personnel_costs').select('id').eq('business_id',member.business_id).eq('accounting_month',month+'-01').ilike('employee_name',name);
 if(previous.error)throw previous.error;
 if(previous.data?.length)return msg('Für diesen Namen und Monat existiert bereits ein Eintrag. Bitte zuerst prüfen – keine doppelte Speicherung.');
 const result=await db.from('personnel_costs').insert(row);
 if(result.error)throw result.error;
 loaded=false;$('payrollConfirm').checked=false;
 msg('Personalkosten für '+month+' gespeichert. Verwaltungsseite neu laden und den Archivmonat auswählen.');
 }catch(err){msg('Nicht gespeichert: '+err.message)}
};
