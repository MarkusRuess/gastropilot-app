import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const clean=s=>String(s||'').replace(/\\s+/g,' ').trim();
const money=s=>{if(!s)return null;let v=String(s).replace(/[^\\d,.-]/g,'');if(v.includes(','))v=v.replace(/\\./g,'').replace(',','.');else if((v.match(/\\./g)||[]).length>1)v=v.replace(/\\./g,'');let n=Number(v);return Number.isFinite(n)&&n>=0&&n<1000000?Math.round(n*100)/100:null};
const numberPattern='([0-9]{1,3}(?:\\\\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2}|[0-9]+\\\\.[0-9]{2})';
function amountAfter(text,labels){for(const label of labels){const re=new RegExp('(?:^|\\\\n)[^\\\\n]{0,30}'+label+'[^\\\\n]{0,45}?\\\\s*[:=]?\\\\s*'+numberPattern+'(?:\\\\s|$)','im');const m=text.match(re);if(m){const n=money(m[1]);if(n!==null)return n}}return null}
function parse(text,filename){
 const monthMatch=text.match(/(?:Abrechnungsmonat|Lohn\\s*\\/\\s*Gehaltsabrechnung|Abrechnung(?:smonat)?)[^\\n]{0,35}?(J[aä]nner|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\s*(20\\d{2})/i)||text.match(/(?:Abrechnungsmonat|Abrechnung)[^\\n]{0,20}?(20\\d{2})[-./](0?[1-9]|1[0-2])/i);
 const months={jänner:1,januar:1,februar:2,märz:3,maerz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12};
 let month=null;if(monthMatch){if(months[monthMatch[1]?.toLowerCase()])month=monthMatch[2]+'-'+String(months[monthMatch[1].toLowerCase()]).padStart(2,'0');else if(/^20\\d{2}$/.test(monthMatch[1]))month=monthMatch[1]+'-'+monthMatch[2].padStart(2,'0')}
 const nameMatch=text.match(/(?:Dienstnehmer(?:in)?|Mitarbeiter(?:in)?|Arbeitnehmer(?:in)?|Name)\\s*[:：]\\s*([^\\n]{4,65})/i)||text.match(/(?:SV-Nr\\.?[^\\n]*?Person\\s*:\\s*[^\\n]*?\\d+\\s+)([^\\n]{4,65})/i);
 let name=nameMatch?clean(nameMatch[1]).replace(/\\s+(?:SV-Nr|Personalnummer|Eintritt).*$/i,''):null;
 const gross=amountAfter(text,['Bruttobez[uü]ge','Bruttolohn','Bruttogehalt','Gesamtbrutto','Brutto\\s*gesamt']);
 const net=amountAfter(text,['Netto-?Auszahlungsbetrag','Auszahlungsbetrag','Netto-?Bezug','Netto-?Lohn','Netto-?Gehalt']);
 const employer=amountAfter(text,['zus[aä]tzliche\\s+Dienstgeberkosten','Dienstgeberkosten','DG-?Kosten','Lohnnebenkosten']);
 return {filename,month,name,gross,net,employer,ready:!!month&&!!name&&gross!==null&&net!==null&&employer!==null,text};
}
async function pdfText(file){const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;if(doc.numPages>20)throw Error('PDF mit mehr als 20 Seiten');let out=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),items=(await page.getTextContent()).items;let lines=[],line='',prev=null;for(const item of items){let y=Math.round(item.transform?.[5]||0);if(prev!==null&&Math.abs(prev-y)>3){lines.push(line);line=''}line+=(line?' ':'')+(item.str||'');prev=y}if(line)lines.push(line);out.push(lines.join('\\n'))}return out.join('\\n')}
async function imageText(file){const t=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');const worker=await t.createWorker('deu');try{return (await worker.recognize(file)).data.text}finally{await worker.terminate()}}
async function extract(file){if(file.size>15*1024*1024)throw Error('Datei größer als 15 MB');if(file.type==='application/pdf'||/\\.pdf$/i.test(file.name)){const txt=await pdfText(file);if(txt.trim().length<30)throw Error('Bild-PDF ohne lesbaren Text – bitte als Foto hochladen');return txt}if(file.type.startsWith('image/'))return imageText(file);throw Error('Nur PDF, JPG, PNG oder WebP unterstützt')}
const line=(title,description,ok)=>{const e=document.createElement('div');e.style='padding:12px;margin:9px 0;border:1px solid #ddd;border-radius:10px';const strong=document.createElement('strong');strong.textContent=title;e.append(strong);const p=document.createElement('p');p.textContent=description;p.style.margin='6px 0 0';e.append(p);return e};
$('payrollRead').onclick=async()=>{
 const files=[...($('payrollPdf').files||[])];if(!files.length){$('payrollStatus').textContent='Bitte PDFs oder Fotos auswählen.';return}
 if(files.length>20){$('payrollStatus').textContent='Bitte maximal 20 Dateien auf einmal auswählen.';return}
 const button=$('payrollRead');button.disabled=true;const result=$('payrollResults');result.replaceChildren();$('payrollReview').classList.remove('hidden');
 try{
  const auth=await db.auth.getUser();if(auth.error||!auth.data.user)throw Error('Bitte zuerst anmelden.');
  const members=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',auth.data.user.id);
  if(members.error)throw members.error;
  const member=window.GastroPilotBusiness?.choose(members.data?.filter(v=>v.role==='owner'));
  if(!member)throw Error('Bitte den Betrieb auswählen. Nur Inhaber dürfen Lohndaten speichern.');
  let saved=0,blocked=0,duplicates=0;
  for(let i=0;i<files.length;i++){
   const file=files[i];$('payrollStatus').textContent='Datei '+(i+1)+' von '+files.length+' wird verarbeitet: '+file.name;
   try{
    const parsed=parse(await extract(file),file.name);
    if(!parsed.ready){blocked++;let missing=['Monat','Name','Brutto','Netto','Dienstgeberkosten'].filter((_,i)=>[parsed.month,parsed.name,parsed.gross,parsed.net,parsed.employer][i]===null||[parsed.month,parsed.name,parsed.gross,parsed.net,parsed.employer][i]==='');result.append(line(file.name,'Nicht gespeichert: nicht eindeutig erkannt: '+missing.join(', ')+'. Keine Beträge werden geschätzt.'));continue}
    const existing=await db.from('personnel_costs').select('id').eq('business_id',member.business_id).eq('accounting_month',parsed.month+'-01').ilike('employee_name',parsed.name);
    if(existing.error)throw existing.error;
    if(existing.data?.length){duplicates++;result.append(line(file.name,'Bereits vorhanden: '+parsed.name+' · '+parsed.month+' – nicht doppelt gespeichert.'));continue}
    const row={business_id:member.business_id,accounting_month:parsed.month+'-01',employee_name:parsed.name,gross_salary:parsed.gross,employer_costs:parsed.employer,total_costs:parsed.gross+parsed.employer,net_payable:parsed.net,payment_status:'open'};
    const ins=await db.from('personnel_costs').insert(row);if(ins.error)throw ins.error;
    saved++;result.append(line(file.name,'Gespeichert: '+parsed.name+' · '+parsed.month+' · Brutto '+fmt(parsed.gross)+' · Netto '+fmt(parsed.net)+' · DG '+fmt(parsed.employer),true));
   }catch(e){blocked++;result.append(line(file.name,'Nicht gespeichert: '+e.message))}
  }
  $('payrollStatus').textContent='Fertig: '+saved+' gespeichert, '+duplicates+' bereits vorhanden, '+blocked+' nicht eindeutig verarbeitet. Bei offenen Fällen bitte Original und Erkennungslogik prüfen.';
 }catch(e){$('payrollStatus').textContent='Verarbeitung gestoppt: '+e.message}finally{button.disabled=false}
};
