import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const money=s=>{if(!s)return null;let v=String(s).replace(/[^\d,.-]/g,'');if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');else if((v.match(/\./g)||[]).length>1)v=v.replace(/\./g,'');let n=Number(v);return Number.isFinite(n)&&n>=0&&n<1000000?Math.round(n*100)/100:null};
const amountToken='(?:[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2}|[0-9]+\\.[0-9]{2})';
function amountAfter(text,labels){
 const rows=text.split(/\n/);
 for(const label of labels){
  const re=new RegExp(label,'i');
  for(let i=0;i<rows.length;i++){
   if(!re.test(rows[i]))continue;
   const row=rows[i];
   const found=[...row.matchAll(new RegExp(amountToken,'g'))].map(x=>money(x[0])).filter(x=>x!==null);
   if(found.length===1)return found[0];
   const next=(rows[i+1]||'').trim();
   const single=next.match(new RegExp('^'+amountToken+'$'));
   if(single)return money(single[0]);
  }
 }
 return null;
}
function parse(text,filename){
 const monthMatch=text.match(/(?:Abrechnungsmonat|Lohn\s*\/\s*Gehaltsabrechnung|Abrechnung(?:smonat)?)[^\n]{0,35}?(J[aä]nner|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(20\d{2})/i)||text.match(/(?:Abrechnungsmonat|Abrechnung)[^\n]{0,20}?(20\d{2})[-./](0?[1-9]|1[0-2])/i);
 const months={jänner:1,januar:1,februar:2,märz:3,maerz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12};
 let month=null;if(monthMatch){if(months[monthMatch[1]?.toLowerCase()])month=monthMatch[2]+'-'+String(months[monthMatch[1].toLowerCase()]).padStart(2,'0');else if(/^20\d{2}$/.test(monthMatch[1]))month=monthMatch[1]+'-'+monthMatch[2].padStart(2,'0')}
 const nameMatch=text.match(/(?:Dienstnehmer(?:in)?|Mitarbeiter(?:in)?|Arbeitnehmer(?:in)?|Name)\s*[:：]\s*([^\n]{4,65})/i)||text.match(/(?:SV-Nr\.?[^\n]*?Person\s*:\s*[^\n]*?\d+\s+)([^\n]{4,65})/i);
 let name=nameMatch?clean(nameMatch[1]).replace(/\s+(?:SV-Nr|Personalnummer|Eintritt).*$/i,''):null;
 const gross=amountAfter(text,['Gesamtbrutto','Bruttobez[uü]ge','Bruttolohn','Bruttogehalt','Brutto\\s*gesamt','Summe\\s+Brutto']);
 const net=amountAfter(text,['Netto-?Auszahlungsbetrag','Auszahlungsbetrag','Netto-?Bezug','Netto-?Lohn','Netto-?Gehalt','Netto\\s+gesamt']);
 const employer=amountAfter(text,['zus[aä]tzliche\\s+Dienstgeberkosten','Dienstgeberkosten','DG-?Kosten','Lohnnebenkosten','DG-?Anteil','Dienstgeberanteil']);
 return {filename,month,name,gross,net,employer,ready:!!month&&!!name&&gross!==null&&net!==null&&employer!==null,text};
}
async function pdfText(file){const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;if(doc.numPages>20)throw Error('PDF mit mehr als 20 Seiten');let out=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),items=(await page.getTextContent()).items;let lines=[],line='',prev=null;for(const item of items){let y=Math.round(item.transform?.[5]||0);if(prev!==null&&Math.abs(prev-y)>3){lines.push(line);line=''}line+=(line?' ':'')+(item.str||'');prev=y}if(line)lines.push(line);out.push(lines.join('\n'))}return out.join('\n')}
async function imageText(file){const t=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');const worker=await t.createWorker('deu');try{return (await worker.recognize(file)).data.text}finally{await worker.terminate()}}
async function extract(file){if(file.size>15*1024*1024)throw Error('Datei größer als 15 MB');if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){const txt=await pdfText(file);if(txt.trim().length<30)throw Error('Bild-PDF ohne lesbaren Text – bitte als Foto hochladen');return txt}if(file.type.startsWith('image/'))return imageText(file);throw Error('Nur PDF, JPG, PNG oder WebP unterstützt')}

const normalizeName=s=>clean(s).replace(/^(?:Herr|Frau)\\s+/i,'').replace(/\\s*\\([^)]*\\)\\s*$/,'').trim();
function eventFromText(text){
 const header=text.slice(0,1600);
 const kind=/\\bAbmeldung\\b/i.test(header)?'deregistration':/\\bAnmeldung\\b/i.test(header)?'registration':null;
 if(!kind)return null;
 const match=text.match(/(?:Familienname|Nachname|Name\\s+des\\s+Dienstnehmers|Dienstnehmer(?:in)?|Versicherte(?:r)?|Name)\\s*[:：]?\\s*([^\\n]{4,70})/i);
 const given=text.match(/(?:Vorname|Vornamen)\\s*[:：]?\\s*([^\\n]{2,55})/i);
 let name=match?normalizeName(match[1]):null;
 if(given&&name&&!name.toLowerCase().includes(clean(given[1]).toLowerCase()))name=normalizeName(clean(given[1])+' '+name);
 const dateLabel=kind==='registration'?'(?:Beschäftigungsbeginn|Beginn\\s+der\\s+(?:Beschäftigung|Pflichtversicherung)|Eintrittsdatum|Eintritt)':'(?:Beschäftigungsende|Ende\\s+der\\s+(?:Beschäftigung|Pflichtversicherung)|Austrittsdatum|Austritt)';
 const dateMatch=text.match(new RegExp(dateLabel+'[^\\n]{0,45}?(\\\\d{1,2})\\\\.(\\\\d{1,2})\\\\.(20\\\\d{2})','i'));
 const date=dateMatch?dateMatch[3]+'-'+dateMatch[2].padStart(2,'0')+'-'+dateMatch[1].padStart(2,'0'):null;
 return {kind,name,date};
}
async function getMember(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness?.choose(m.data?.filter(v=>v.role==='owner'));
 if(!member)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 return member;
}
async function ensureEmployee(businessId,name){
 name=normalizeName(name);
 const lookup=await db.from('employee_profiles').select('id,full_name').eq('business_id',businessId).ilike('full_name',name).limit(2);
 if(lookup.error)throw lookup.error;
 if(lookup.data.length)return lookup.data[0].id;
 const inserted=await db.from('employee_profiles').insert({business_id:businessId,full_name:name}).select('id').single();
 if(inserted.error){const retry=await db.from('employee_profiles').select('id').eq('business_id',businessId).ilike('full_name',name).maybeSingle();if(retry.data)return retry.data.id;throw inserted.error}
 return inserted.data.id;
}
async function saveEvent(businessId,event,file){
 const id=await ensureEmployee(businessId,event.name);
 const prior=await db.from('employee_documents').select('id').eq('employee_id',id).eq('document_type',event.kind).eq('effective_date',event.date);
 if(prior.error)throw prior.error;
 if(prior.data.length)return false;
 const ins=await db.from('employee_documents').insert({business_id:businessId,employee_id:id,document_type:event.kind,effective_date:event.date,source_filename:file});
 if(ins.error)throw ins.error;
 const history=await db.from('employee_documents').select('document_type,effective_date').eq('employee_id',id).order('effective_date',{ascending:false}).limit(1);
 if(history.error)throw history.error;
 const latest=history.data[0];
 const upd=await db.from('employee_profiles').update({employment_status:latest.document_type==='registration'?'active':'ended',...(latest.document_type==='registration'?{employment_start:latest.effective_date}:{employment_end:latest.effective_date}),updated_at:new Date().toISOString()}).eq('id',id);
 if(upd.error)throw upd.error;
 return true;
}
async function renderEmployees(businessId){
 const target=$('gpEmployeeCards');if(!target)return;
 const [profiles,payroll,documents]=await Promise.all([
 db.from('employee_profiles').select('id,full_name,employment_start,employment_end,employment_status').eq('business_id',businessId).order('full_name'),
 db.from('personnel_costs').select('employee_name,accounting_month,total_costs').eq('business_id',businessId),
 db.from('employee_documents').select('employee_id,document_type,effective_date').eq('business_id',businessId)
 ]);
 if(profiles.error||payroll.error||documents.error){target.textContent='Mitarbeiterkartei konnte nicht geladen werden.';return}
 target.replaceChildren();
 for(const person of profiles.data){
  const tile=document.createElement('div');tile.className='gp-fixed-tile';
  const title=document.createElement('strong');title.textContent=person.full_name;tile.append(title);
  const state=document.createElement('p');state.textContent='Status: '+({active:'Angemeldet',ended:'Abgemeldet',unknown:'Noch nicht belegt'}[person.employment_status]||'Unbekannt');tile.append(state);
  const events=documents.data.filter(d=>d.employee_id===person.id).sort((a,b)=>b.effective_date.localeCompare(a.effective_date));
  const pay=payroll.data.filter(p=>normalizeName(p.employee_name).toLowerCase()===normalizeName(person.full_name).toLowerCase());
  const summary=document.createElement('p');summary.textContent=events.length+' An-/Abmeldungen · '+pay.length+' Lohnmonate';tile.append(summary);
  const detail=document.createElement('details');const head=document.createElement('summary');head.textContent='Personalakte anzeigen';detail.append(head);
  for(const e of events){const p=document.createElement('p');p.textContent=(e.document_type==='registration'?'Anmeldung':'Abmeldung')+' · '+e.effective_date;detail.append(p)}
  for(const p of pay){const x=document.createElement('p');x.textContent='Lohn '+p.accounting_month+' · '+fmt(Number(p.total_costs||0));detail.append(x)}
  tile.append(detail);target.append(tile);
 }
 if(!profiles.data.length)target.textContent='Noch keine Mitarbeiterakte vorhanden.';
}
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
    const extracted=await extract(file);const event=eventFromText(extracted);if(event){if(!event.name||!event.date){blocked++;result.append(line(file.name,'An-/Abmeldung erkannt, aber Name oder Datum nicht eindeutig. Nicht gespeichert.'));continue}const stored=await saveEvent(member.business_id,event,file.name);result.append(line(file.name,(stored?'Gespeichert: ':'Bereits vorhanden: ')+(event.kind==='registration'?'Anmeldung':'Abmeldung')+' · '+event.name+' · '+event.date));if(stored)saved++;else duplicates++;continue}const pages=extracted.split(/\\n--- SEITE ---\\n/);if(pages.length>1){result.append(line(file.name,'Mehrseitige Abrechnung erkannt ('+pages.length+' Seiten). Eine sichere Zuordnung der Summen zu einzelnen Dienstnehmern ist noch nicht möglich. Nicht gespeichert.'));blocked++;continue}const parsed=parse(extracted,file.name);
    if(!parsed.ready){blocked++;let missing=['Monat','Name','Brutto','Netto','Dienstgeberkosten'].filter((_,i)=>[parsed.month,parsed.name,parsed.gross,parsed.net,parsed.employer][i]===null||[parsed.month,parsed.name,parsed.gross,parsed.net,parsed.employer][i]==='');result.append(line(file.name,'Nicht gespeichert: nicht eindeutig erkannt: '+missing.join(', ')+'. Die Datei bleibt lokal; bitte eine einzelne Abrechnung mit klaren Summen verwenden. Keine Beträge werden geschätzt.'));continue}
    const existing=await db.from('personnel_costs').select('id').eq('business_id',member.business_id).eq('accounting_month',parsed.month+'-01').ilike('employee_name',parsed.name);
    if(existing.error)throw existing.error;
    if(existing.data?.length){duplicates++;result.append(line(file.name,'Bereits vorhanden: '+parsed.name+' · '+parsed.month+' – nicht doppelt gespeichert.'));continue}
    const row={business_id:member.business_id,accounting_month:parsed.month+'-01',employee_name:parsed.name,gross_salary:parsed.gross,employer_costs:parsed.employer,total_costs:parsed.gross+parsed.employer,net_payable:parsed.net,payment_status:'open'};
    const ins=await db.from('personnel_costs').insert(row);if(ins.error)throw ins.error;
    await ensureEmployee(member.business_id,parsed.name);saved++;result.append(line(file.name,'Gespeichert: '+parsed.name+' · '+parsed.month+' · Brutto '+fmt(parsed.gross)+' · Netto '+fmt(parsed.net)+' · DG '+fmt(parsed.employer),true));
   }catch(e){blocked++;result.append(line(file.name,'Nicht gespeichert: '+e.message))}
  }
  await renderEmployees(member.business_id);$('payrollStatus').textContent='Fertig: '+saved+' gespeichert, '+duplicates+' bereits vorhanden, '+blocked+' nicht eindeutig verarbeitet. Bei offenen Fällen bitte Original und Erkennungslogik prüfen.';
 }catch(e){$('payrollStatus').textContent='Verarbeitung gestoppt: '+e.message}finally{button.disabled=false}
};

(async()=>{try{const member=await getMember();await renderEmployees(member.business_id)}catch(e){/* Not signed in yet */}})();
