import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const eur=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const euroNumber=s=>{if(!s)return null;const v=s.replace(/\./g,'').replace(',','.');const n=Number(v);return Number.isFinite(n)&&n>=0&&n<1000000?Math.round(n*100)/100:null};
const amount=/\b\d{1,3}(?:\.\d{3})*,\d{2}\b|\b\d+,\d{2}\b/g;
let selectedFiles=[];
let member=null;
let archived=[];
const selectedHashes=new WeakMap();
$('gpAddPayrollFiles')?.addEventListener('click',()=>$('payrollPdf').click());
const msg=t=>{$('payrollStatus').textContent=t};
const el=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
function amountOnLine(lines,pattern){
 const matches=lines.filter(x=>pattern.test(x)).map(x=>{pattern.lastIndex=0;return [...x.matchAll(amount)].map(m=>euroNumber(m[0]))}).filter(x=>x.length);
 return matches.length===1?matches[0][0]:null;
}
function parseSalary(text){
 const header=text.match(/Lohn\s*\/\s*Gehaltsabrechnung\s+(Jänner|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d{2})/i);
 const months={jänner:1,januar:1,februar:2,märz:3,maerz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12};
 const month=header?header[2]+'-'+String(months[header[1].toLowerCase()]).padStart(2,'0'):null;
 const person=text.match(/Person\s*:\s*\d+\s*\(\s*\d+\s*\)\s*([^\n]+?)(?:\s{3,}SV-Nr\.|$)/im);
 let name=person?clean(person[1]):null;
 if(name&&name.includes(',')){const parts=name.split(',');name=clean(parts.slice(1).join(',')+' '+parts[0])}
 const lines=text.split(/\n/);
 const gross=amountOnLine(lines,/^\s*Brutto\s+/i);
 const net=amountOnLine(lines,/^\s*Auszahlung\s+/i);
 const total=amountOnLine(lines,/Der Gesamtaufwand Ihrer Lohn\/Gehaltskosten beträgt somit/i);
 const employer=gross!==null&&total!==null&&total>=gross?Math.round((total-gross)*100)/100:null;
 const start=text.match(/\bEintritt\s*:\s*(\d{1,2}\.\d{1,2}\.20\d{2})/i)?.[1];
 const end=text.match(/\bAustritt\s*:\s*(\d{1,2}\.\d{1,2}\.20\d{2})/i)?.[1];
 return {type:'salary',name,month,gross,net,employer,total,start,end,ready:!!name&&!!month&&gross!==null&&net!==null&&employer!==null};
}
function isoDate(s){if(!s)return null;const m=s.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):null}
function parseEvent(text){
 const kind=/\bABMELDUNG\b/i.test(text)?'deregistration':/\bANMELDUNG\b/i.test(text)?'registration':null;
 if(!kind)return null;
 let name=null;
 const vs=text.match(/VSNR\s*:\s*[\d\s]+\n\s*([^\n]+)\n\s*([^\n]+)/i);
 if(vs)name=clean(vs[2]+' '+vs[1]);
 if(!name){const family=text.match(/(?:Familienname|Nachname)\s*:\s*([^\n]+)/i),given=text.match(/Vorname\s*:\s*([^\n]+)/i);if(family&&given)name=clean(given[1]+' '+family[1])}
 const label=kind==='deregistration'?/Ende\s+Besch[aä]ftigung\s*:\s*(\d{1,2}\.\d{1,2}\.20\d{2})/i:/(?:Beginn\s+Besch[aä]ftigung|Besch[aä]ftigungsbeginn)\s*:\s*(\d{1,2}\.\d{1,2}\.20\d{2})/i;
 const date=isoDate(text.match(label)?.[1]);
 const protocol=text.match(/Protokollnr\.?\s*:\s*(\d+)/i)?.[1]||null;
 return {type:kind,name,date,protocol,ready:!!name&&!!date};
}
async function pdfPages(file){
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>60)throw Error('Mehr als 60 PDF-Seiten');
 const out=[];
 for(let i=1;i<=pdf.numPages;i++){
  const items=(await(await pdf.getPage(i)).getTextContent()).items;
  const lines=[];let line='',last=null;
  for(const x of items){const y=Math.round(x.transform?.[5]||0);if(last!==null&&Math.abs(y-last)>3){lines.push(line);line=''}line+=(line?' ':'')+(x.str||'');last=y}
  if(line)lines.push(line);out.push(lines.join('\n'));
 }
 return out;
}
async function extract(file){
 if(file.size>15*1024*1024)throw Error('Datei größer als 15 MB');
 if(/\.pdf$/i.test(file.name)||file.type==='application/pdf')return pdfPages(file);
 if(file.type.startsWith('image/')){const t=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');const worker=await t.createWorker('deu');try{return [(await worker.recognize(file)).data.text]}finally{await worker.terminate()}}
 throw Error('Nur PDF und Bilder erlaubt');
}
async function hash(file){const buf=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authMember(){
 const user=await db.auth.getUser();if(user.error||!user.data.user)throw Error('Bitte anmelden');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',user.data.user.id);
 if(m.error)throw m.error;
 const chosen=window.GastroPilotBusiness?.choose(m.data?.filter(x=>x.role==='owner'));
 if(!chosen)throw Error('Bitte einen Betrieb als Inhaber auswählen');
 return chosen;
}
async function ensureEmployee(name,start=null,end=null){
 name=clean(name);if(!name||name.length>90)throw Error('Mitarbeitername ungültig');
 let query=await db.from('employee_profiles').select('id,full_name').eq('business_id',member.business_id).ilike('full_name',name).limit(2);
 if(query.error)throw query.error;
 let id=query.data[0]?.id;
 if(!id){const ins=await db.from('employee_profiles').insert({business_id:member.business_id,full_name:name}).select('id').single();if(ins.error)throw ins.error;id=ins.data.id}
 const patch={};
 if(start)patch.employment_start=isoDate(start);
 if(end){patch.employment_end=isoDate(end);patch.employment_status='ended'}
 if(Object.keys(patch).length){const u=await db.from('employee_profiles').update(patch).eq('id',id);if(u.error)throw u.error}
 return id;
}
async function saveSalary(p){
 const previous=await db.from('personnel_costs').select('id').eq('business_id',member.business_id).eq('accounting_month',p.month+'-01').ilike('employee_name',p.name);
 if(previous.error)throw previous.error;
 if(previous.data.length)return 'bereits vorhanden';
 const row={business_id:member.business_id,accounting_month:p.month+'-01',employee_name:p.name,gross_salary:p.gross,employer_costs:p.employer,total_costs:p.total,net_payable:p.net,payment_status:'open'};
 const ins=await db.from('personnel_costs').insert(row);if(ins.error)throw ins.error;
 await ensureEmployee(p.name,p.start,p.end);
 return 'gespeichert';
}
async function saveEvent(p){
 const id=await ensureEmployee(p.name);
 const prior=await db.from('employee_documents').select('id').eq('employee_id',id).eq('document_type',p.type).eq('effective_date',p.date);
 if(prior.error)throw prior.error;
 if(prior.data.length)return {id,status:'bereits vorhanden'};
 const ins=await db.from('employee_documents').insert({business_id:member.business_id,employee_id:id,document_type:p.type,effective_date:p.date}).select('id').single();
 if(ins.error)throw ins.error;
 const hist=await db.from('employee_documents').select('document_type,effective_date').eq('employee_id',id).order('effective_date',{ascending:false}).limit(1);
 if(hist.error)throw hist.error;
 const latest=hist.data[0];const upd=await db.from('employee_profiles').update({employment_status:latest.document_type==='registration'?'active':'ended',...(latest.document_type==='registration'?{employment_start:latest.effective_date}:{employment_end:latest.effective_date})}).eq('id',id);
 if(upd.error)throw upd.error;
 return {id,status:'gespeichert'};
}
async function getArchive(){
 const q=await db.from('employee_archive_files').select('id,sha256,original_name,storage_path,document_type,employee_id,accounting_month,processing_status,created_at').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(200);
 if(q.error)throw q.error;archived=q.data;renderArchive();
}
async function archiveFile(file,digest,kind,employeeId=null,month=null,status='archived'){
 const path=member.business_id+'/'+digest+'.'+(file.name.toLowerCase().endsWith('.pdf')?'pdf':(file.name.split('.').pop()||'bin').toLowerCase());
 const upload=await db.storage.from('employee-archive').upload(path,file,{upsert:false,contentType:file.type||'application/pdf'});
 if(upload.error&&upload.error.statusCode!=='409'&&!/already exists/i.test(upload.error.message))throw upload.error;
 const record=await db.from('employee_archive_files').insert({business_id:member.business_id,sha256:digest,original_name:file.name,storage_path:path,mime_type:file.type||'application/pdf',byte_size:file.size,document_type:kind,employee_id:employeeId,accounting_month:month?month+'-01':null,processing_status:status});
 if(record.error&&record.error.code!=='23505')throw record.error;
}
function renderSelection(){
 const count=$('gpFileCount');if(count)count.textContent=selectedFiles.length+' Datei'+(selectedFiles.length===1?'':'en')+' vorgemerkt – weitere jederzeit hinzufügen';
 const box=$('gpSelectedFiles');box.replaceChildren();
 for(const file of selectedFiles){
  const tile=el('div');tile.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #ddd;border-radius:9px';
  const digest=selectedHashes.get(file);const already=digest&&archived.some(x=>x.sha256===digest);const queued=digest&&selectedFiles.some(x=>x!==file&&selectedHashes.get(x)===digest&&selectedFiles.indexOf(x)<selectedFiles.indexOf(file));tile.append(el('span','📄 '+file.name+' · '+Math.round(file.size/1024)+' KB'+(already?' · BEREITS IM ARCHIV':queued?' · DOPPELT AUSGEWÄHLT':'')));
  const del=el('button','Entfernen');del.type='button';del.style='padding:4px 9px';del.onclick=()=>{selectedFiles=selectedFiles.filter(x=>x!==file);renderSelection()};tile.append(del);box.append(tile);
 }
 if(!selectedFiles.length)box.append(el('p','Noch keine Dateien ausgewählt.'));
}
function renderArchive(){
 const box=$('gpArchiveFiles');if(!box)return;box.replaceChildren();
 box.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;margin:14px 0';
 const grouped=new Map();
 for(const f of archived){
  const key=String(f.accounting_month||'').slice(0,7);
  const month=/^\d{4}-\d{2}$/.test(key)?key:'Ohne Monatszuordnung';
  if(!grouped.has(month))grouped.set(month,[]);grouped.get(month).push(f);
 }
 const kinds={salary:'Lohnset',payment_journal:'Auszahlungsjournal',registration:'Anmeldung',deregistration:'Abmeldung',other:'Sonstiges'};
 for(const [month,files] of [...grouped.entries()].sort((a,b)=>b[0].localeCompare(a[0]))){
  const tile=el('section');tile.style='border:1px solid #e1d9cd;border-radius:16px;background:#fff;padding:16px;box-shadow:0 3px 12px #241b1008;min-width:0';
  const title=el('strong',/^\d{4}-\d{2}$/.test(month)?gpMonths[Number(month.slice(5))-1]+' '+month.slice(0,4):month);title.style='display:block;font-size:19px;margin-bottom:4px';tile.append(title);
  const count=el('small',files.length+' Originaldokument'+(files.length===1?'':'e'));count.style='display:block;color:#777;margin-bottom:12px';tile.append(count);
  for(const f of files){
   const line=el('div');line.style='border-top:1px solid #eee;padding:11px 0;min-width:0';
   const label=el('strong',kinds[f.document_type]||f.document_type||'Dokument');label.style='display:block;font-size:13px;color:#7c6548;margin-bottom:4px';line.append(label);
   const name=el('div',f.original_name);name.style='font-size:13px;overflow-wrap:anywhere;line-height:1.45';line.append(name);
   const status=el('small',f.processing_status==='archived'?'Archiviert':f.processing_status==='needs_review'?'Prüfung offen':f.processing_status||'');status.style='display:block;color:#777;margin-top:3px';line.append(status);
   const btn=el('button','Original öffnen');btn.type='button';btn.style='padding:6px 11px;margin-top:8px;font-size:12px;border-radius:9px';
   btn.onclick=async()=>{const x=await db.storage.from('employee-archive').createSignedUrl(f.storage_path,60);if(x.error)msg('Archivfehler: '+x.error.message);else window.open(x.data.signedUrl,'_blank','noopener')};
   line.append(btn);tile.append(line);
  }
  box.append(tile);
 }
 if(!archived.length)box.append(el('p','Noch keine Dokumente archiviert.'));
}

let selectedPersonnelYear=2026,selectedPersonnelMonth=null;
const gpMonths=['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
async function renderPersonnelMonths(payRows,events,profiles){
 const yearsBox=$('gpPersonnelYears'),monthsBox=$('gpPersonnelMonths'),detail=$('gpPersonnelMonthDetail');
 if(!yearsBox||!monthsBox||!detail)return;
 const availableYears=new Set([2026]);
 for(const p of payRows){const y=Number(String(p.accounting_month).slice(0,4));if(y>=2026)availableYears.add(y)}
 const years=[...availableYears].sort((a,b)=>b-a);
 if(!years.includes(selectedPersonnelYear))selectedPersonnelYear=years[0];
 yearsBox.replaceChildren();
 for(const y of years){
  const btn=el('button',String(y));btn.type='button';btn.style='padding:9px 20px;border-radius:10px;'+(selectedPersonnelYear===y?'border:2px solid currentColor;font-weight:800':'');
  btn.onclick=()=>{selectedPersonnelYear=y;selectedPersonnelMonth=null;renderPersonnelMonths(payRows,events,profiles)};
  yearsBox.append(btn);
 }
 monthsBox.replaceChildren();
 for(let i=0;i<12;i++){
  const key=selectedPersonnelYear+'-'+String(i+1).padStart(2,'0');
  const rows=payRows.filter(p=>String(p.accounting_month).startsWith(key));
  const total=rows.reduce((a,p)=>a+Number(p.total_costs||0),0);
  const btn=el('button');btn.type='button';btn.style='text-align:left;padding:12px;border-radius:11px;min-height:80px;display:flex;flex-direction:column;gap:4px;'+(selectedPersonnelMonth===key?'border:2px solid currentColor':'');
  const name=el('strong',gpMonths[i]);const count=el('small',rows.length?rows.length+' Mitarbeiter':'Noch keine Löhne');
  btn.append(name,count);
  if(rows.length)btn.append(el('strong',eur(total)));
  btn.onclick=()=>{selectedPersonnelMonth=selectedPersonnelMonth===key?null:key;renderPersonnelMonths(payRows,events,profiles)};
  monthsBox.append(btn);
 }
 detail.replaceChildren();
 if(!selectedPersonnelMonth){detail.append(el('p','Monat auswählen, um Mitarbeiter, Gehälter und vorhandene Dokumente zu sehen.'));return}
 const key=selectedPersonnelMonth,rows=payRows.filter(p=>String(p.accounting_month).startsWith(key));
 const heading=el('h3',gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);detail.append(heading);
 if(!rows.length){
  detail.append(el('p','Für diesen Monat sind noch keine Lohnabrechnungen gespeichert. Du kannst die Dokumente unten hochladen.'));
  const h=el('h3','Auszahlungsjournal & Abgaben · '+gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);detail.append(h);
  const t=el('table');t.style='width:100%;border-collapse:collapse';const b=el('tbody');
  for(const label of ['Auszahlungen an Mitarbeiter','ÖGK Niederösterreich','Finanzamt Österreich','Kommunalsteuer Baden','Abgaben an Körperschaften','Gesamt laut Auszahlungsjournal']){
   const tr=el('tr');tr.style='border-bottom:1px solid #ddd';const l=el('td',label),v=el('td','–');l.style='padding:10px 6px';v.style='padding:10px 6px;text-align:right;font-weight:700;color:#777';tr.append(l,v);b.append(tr);
  }
  t.append(b);detail.append(t);detail.append(el('p','Noch kein geprüftes Auszahlungsjournal für diesen Monat erfasst. Keine Beträge geschätzt.'));return;
 }
 const totals=rows.reduce((a,p)=>({gross:a.gross+Number(p.gross_salary||0),net:a.net+Number(p.net_payable||0),dg:a.dg+Number(p.employer_costs||0),total:a.total+Number(p.total_costs||0)}),{gross:0,net:0,dg:0,total:0});

 const journal=key==='2026-07'?{employee:9026.41,ogk:3343.92,tax:700.16,communal:319.70,total:13390.19,source:'Auszahlungsjournal Juli 2026 vom 05.08.2026 · Brot & Wasser RA GmbH · Zahlungsstatus nicht bankbestätigt'}:key==='2026-08'?{employee:11141.73,ogk:4004.88,tax:1232.25,communal:408.11,total:16786.97,source:'Referenz aus dem Auszahlungsjournal August 2026 vom 08.09.2026 · Zahlungsstatus nicht bankbestätigt'}:key==='2026-09'?{employee:11993.68,ogk:4984.79,tax:890.82,communal:417.61,total:18286.90,source:'Referenz aus dem Auszahlungsjournal September 2026 (bisher nicht als Einzelzahlungen in der Datenbank bestätigt)'}:null;
 const summary=el('div');summary.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px;margin:12px 0 18px';
 for(const [label,value] of [['Bruttogehälter',totals.gross],['Netto laut Lohnabrechnungen',totals.net],['Zusätzliche Dienstgeberkosten',totals.dg],['Gesamtpersonalaufwand',totals.total]]){
  const tile=el('div');tile.style='border:1px solid #ddd;border-radius:12px;padding:14px';
  const caption=el('div',label);caption.style='font-size:12px;color:#666';
  const number=el('strong',eur(value));number.style='display:block;font-size:20px;margin-top:6px';
  tile.append(caption,number);summary.append(tile);
 }
 detail.append(summary);
 const jTitle=el('h3','Auszahlungsjournal & Abgaben · '+gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);detail.append(jTitle);
 if(journal){
  const note=el('p',journal.source);note.style='font-size:12px;color:#666';detail.append(note);
  const table=el('table');table.style='width:100%;border-collapse:collapse';
  const tbody=el('tbody');
  for(const [label,value] of [['Auszahlungen an Mitarbeiter',journal.employee],['ÖGK Niederösterreich',journal.ogk],['Finanzamt Österreich',journal.tax],['Kommunalsteuer Baden',journal.communal],['Abgaben an Körperschaften',journal.ogk+journal.tax+journal.communal],['Gesamt laut Auszahlungsjournal',journal.total]]){
   const tr=el('tr');tr.style='border-bottom:1px solid #ddd';
   const th=el('td',label),td=el('td',eur(value));th.style='padding:10px 6px';td.style='padding:10px 6px;text-align:right;font-weight:700';
   tr.append(th,td);tbody.append(tr);
  }
  table.append(tbody);detail.append(table);
  const caution=el('p','Die Journalzahlungen dienen der Zahlungsübersicht. Sie werden nicht nochmals zum Gesamtpersonalaufwand addiert.');caution.style='font-size:12px;color:#666';detail.append(caution);
 }else{
  const note=el('p','Für diesen Monat liegt noch keine geprüfte Aufschlüsselung aus dem Auszahlungsjournal vor. Fehlende Beträge bleiben offen.');note.style='color:#666;font-size:12px';detail.append(note);
  const table=el('table');table.style='width:100%;border-collapse:collapse';const tbody=el('tbody');
  for(const label of ['Auszahlungen an Mitarbeiter','ÖGK Niederösterreich','Finanzamt Österreich','Kommunalsteuer Baden','Abgaben an Körperschaften','Gesamt laut Auszahlungsjournal']){
   const tr=el('tr');tr.style='border-bottom:1px solid #ddd';const th=el('td',label),td=el('td','–');th.style='padding:10px 6px';td.style='padding:10px 6px;text-align:right;font-weight:700;color:#777';tr.append(th,td);tbody.append(tr);
  }
  table.append(tbody);detail.append(table);
 }
 const staffTitle=el('h3','Mitarbeiter · Einzelansicht · '+gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);staffTitle.style='margin-top:20px';detail.append(staffTitle);
 const staffGrid=el('div');staffGrid.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin:12px 0 18px';detail.append(staffGrid);
 for(const p of rows){
  const d=el('details');d.style='border:1px solid #e4e0da;border-radius:14px;padding:0;background:#fff;min-width:0;overflow:hidden';
  const head=el('summary');head.style='display:flex;align-items:center;gap:12px;padding:15px;cursor:pointer;list-style:none;font-weight:700;min-height:72px';
  const initials=clean(p.employee_name).split(' ').map(x=>x[0]||'').slice(0,2).join('').toUpperCase();
  const avatar=el('span',initials);avatar.style='display:inline-flex;align-items:center;justify-content:center;flex:0 0 42px;width:42px;height:42px;border-radius:50%;background:#f5ede0;color:#805e30;font-size:13px';
  const label=el('span');label.style='display:flex;flex-direction:column;gap:4px;min-width:0';
  const name=el('span',p.employee_name);name.style='overflow-wrap:anywhere';
  const month=el('small',gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);month.style='color:#777;font-weight:400';
  label.append(name,month);
  const arrow=el('span','›');arrow.style='margin-left:auto;font-size:23px;color:#777';
  head.append(avatar,label,arrow);
  const body=el('div');body.style='padding:0 15px 15px;font-size:13px;line-height:1.8';
  for(const [k,v] of [['Brutto',eur(p.gross_salary)],['Netto',p.net_payable==null?'Nicht erfasst':eur(p.net_payable)],['Zusätzliche DG-Kosten',eur(p.employer_costs)],['Gesamtaufwand',eur(p.total_costs)]]){
   const row=el('div');row.style='display:flex;justify-content:space-between;gap:10px;border-top:1px solid #eee;padding:5px 0';
   row.append(el('span',k),el('strong',v));body.append(row);
  }
  d.append(head,body);staffGrid.append(d);
 }
 const docs=archived.filter(f=>String(f.accounting_month||'').startsWith(key));
 if(docs.length){
  const title=el('h3','Originaldokumente · '+gpMonths[Number(key.slice(5))-1]+' '+selectedPersonnelYear);title.style='margin-top:22px';detail.append(title);
  const grid=el('div');grid.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:10px 0 20px';
  for(const f of docs){
   const tile=el('div');tile.style='border:1px solid #dedede;border-radius:12px;padding:14px;background:#fff;display:flex;flex-direction:column;gap:8px;min-width:0';
   const name=el('strong',f.original_name);name.style='overflow-wrap:anywhere';tile.append(name);
   const type=el('small',f.document_type==='salary'?'Lohnset':f.document_type==='payment_journal'?'Auszahlungsjournal':f.document_type==='other'?'Weiteres Dokument':f.document_type);type.style='color:#777';tile.append(type);
   const button=el('button','Original öffnen');button.type='button';button.style='align-self:flex-start;padding:8px 12px;border-radius:9px';
   button.onclick=async()=>{const x=await db.storage.from('employee-archive').createSignedUrl(f.storage_path,60);if(x.error)msg('Archivfehler: '+x.error.message);else window.open(x.data.signedUrl,'_blank','noopener')};
   tile.append(button);grid.append(tile);
  }
  detail.append(grid);
}
}
async function renderEmployees(){
 const box=$('gpEmployeeCards');if(!box||!member)return;
 const [profiles,pay,events]=await Promise.all([
 db.from('employee_profiles').select('id,full_name,employment_status,employment_start,employment_end').eq('business_id',member.business_id).order('full_name'),
 db.from('personnel_costs').select('employee_name,accounting_month,total_costs,gross_salary,employer_costs,net_payable').eq('business_id',member.business_id).order('accounting_month',{ascending:false}),
 db.from('employee_documents').select('employee_id,document_type,effective_date').eq('business_id',member.business_id)
 ]);
 if(profiles.error||pay.error||events.error)throw Error('Mitarbeiterkartei nicht lesbar');
 const byName=new Map();
 for(const p of profiles.data)byName.set(norm(p.full_name),{...p,lohn:[]});
 for(const p of pay.data){
  const key=norm(p.employee_name);
  if(!byName.has(key))byName.set(key,{id:null,full_name:p.employee_name,employment_status:'unknown',lohn:[]});
  byName.get(key).lohn.push(p);
 }
 const employees=[...byName.values()].sort((a,b)=>a.full_name.localeCompare(b.full_name,'de'));
 box.replaceChildren();
 for(const p of employees){
  const tile=el('div');tile.style='border:1px solid #ddd;border-radius:12px;padding:12px;min-width:0;background:#fff';
  tile.append(el('strong',p.full_name));
  const state=el('p',p.employment_status==='ended'?'Abgemeldet':p.employment_status==='active'?'Angemeldet':'Status noch nicht durch An-/Abmeldung bestätigt');state.style='font-size:12px;color:#666;margin:7px 0';tile.append(state);
  const ds=el('details');ds.style='margin-top:10px';
  const summary=el('summary');summary.style='cursor:pointer;font-weight:700;padding:9px 0;list-style-position:inside';
  const head=el('span','Personalakte · '+p.lohn.length+' Lohnmonate');summary.append(head);
  const currentYear=String(new Date().getFullYear());
  const thisYear=p.lohn.filter(x=>String(x.accounting_month).slice(0,4)===currentYear);
  if(thisYear.length){
   const totals=thisYear.reduce((acc,x)=>{
    acc.gross+=Number(x.gross_salary)||0;
    acc.cost+=Number(x.total_costs)||0;
    if(x.net_payable!=null&&x.net_payable!==''){acc.net+=Number(x.net_payable)||0;acc.netCount++}
    return acc;
   },{gross:0,net:0,cost:0,netCount:0});
   const figures=el('span');figures.style='display:inline-flex;gap:8px;flex-wrap:wrap;margin-left:12px;vertical-align:middle;font-size:12px;font-weight:500';
   for(const [k,v] of [['Jahr '+currentYear,''],['Brutto gesamt',eur(totals.gross)],['Netto gesamt',totals.netCount===thisYear.length?eur(totals.net):'unvollständig ('+totals.netCount+'/'+thisYear.length+' Monate)'],['Betriebsaufwand gesamt',eur(totals.cost)]]){
    const chip=el('span',v?k+': '+v:k);chip.style='display:inline-block;padding:6px 9px;border:1px solid #e4dbcf;border-radius:9px;background:#faf8f4;white-space:normal';figures.append(chip);
   }
   summary.append(figures);
  }else{
   const note=el('span',' · '+currentYear+': noch keine Jahreswerte');note.style='font-size:12px;font-weight:400;color:#777';summary.append(note);
  }
  ds.append(summary);
  const relevantEvents=events.data.filter(x=>x.employee_id===p.id).sort((a,b)=>b.effective_date.localeCompare(a.effective_date));
  if(relevantEvents.length){
   const eventsGrid=el('div');eventsGrid.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px;margin:10px 0';
   for(const e of relevantEvents){
    const card=el('div');card.style='border:1px solid #e1d9cd;border-radius:12px;padding:10px;background:#faf8f4';
    card.append(el('strong',e.document_type==='registration'?'Anmeldung':'Abmeldung'),el('div',e.effective_date));eventsGrid.append(card);
   }
   ds.append(eventsGrid);
  }
  const monthsGrid=el('div');monthsGrid.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px;margin:12px 0';
  for(const x of p.lohn){
   const monthKey=String(x.accounting_month).slice(0,7);
   const monthNumber=Number(monthKey.slice(5));
   const label=monthNumber>=1&&monthNumber<=12?gpMonths[monthNumber-1]+' '+monthKey.slice(0,4):monthKey;
   const card=el('div');card.style='border:1px solid #ded8cf;border-radius:14px;background:#fff;padding:13px;min-width:0;box-shadow:0 2px 9px #241b1008';
   const title=el('strong',label);title.style='display:block;font-size:14px;margin-bottom:8px';card.append(title);
   for(const [caption,value] of [['Gesamtaufwand',eur(x.total_costs)],['Brutto',eur(x.gross_salary)],['DG-Kosten',eur(x.employer_costs)],['Netto',x.net_payable==null?'Nicht erfasst':eur(x.net_payable)]]){
    const line=el('div');line.style='display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid #eee;font-size:12px;flex-wrap:wrap';
    const key=el('span',caption);key.style='color:#777';const val=el('strong',value);line.append(key,val);card.append(line);
   }
   monthsGrid.append(card);
  }
  ds.append(monthsGrid);
  const originals=archived.filter(x=>x.employee_id===p.id);
  if(originals.length){
   const filesGrid=el('div');filesGrid.style='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px;margin:10px 0';
   for(const f of originals){const card=el('div',f.original_name);card.style='overflow-wrap:anywhere;border:1px solid #eee;border-radius:10px;padding:10px;font-size:12px';filesGrid.append(card)}
   ds.append(filesGrid);
  }
  tile.append(ds);box.append(tile);
 }
 if(!employees.length)box.append(el('p','Noch keine Mitarbeiter vorhanden. Lade Lohnzettel oder An-/Abmeldungen hoch.'));
 const last=pay.data[0]?.accounting_month;
 const lastRows=pay.data.filter(x=>x.accounting_month===last);
 const sum=lastRows.reduce((acc,x)=>acc+Number(x.total_costs||0),0);
 const set=(id,value)=>{if($(id))$(id).textContent=value};
 set('gpStaffCount',String(employees.length));set('gpStaffMonth',last?String(last).slice(0,7):'–');
 set('gpStaffCosts',last?eur(sum):'–');set('gpStaffDocs',String(archived.length));
 await renderPersonnelMonths(pay.data,events.data,profiles.data);
}
async function queuePayrollFiles(incoming){
 let added=0,duplicates=0,tooLarge=0;
 for(const f of incoming){
  if(!(/\.pdf$/i.test(f.name)||/^image\/(jpeg|png|webp)$/i.test(f.type))){msg('Nicht unterstützt: '+f.name+' (PDF, JPG, PNG oder WEBP verwenden)');continue}
  if(f.size>15*1024*1024){tooLarge++;continue}
  if(selectedFiles.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified)){duplicates++;continue}
  selectedFiles.push(f);added++;
 }
 renderSelection();
 msg(added+' Datei(en) hinzugefügt · '+selectedFiles.length+' insgesamt vorgemerkt'+(duplicates?' · '+duplicates+' bereits ausgewählt':'')+(tooLarge?' · '+tooLarge+' über 15 MB (bitte verkleinern)':''));
 for(const f of incoming){if(!selectedFiles.includes(f))continue;try{selectedHashes.set(f,await hash(f));renderSelection()}catch(e){}}
}
$('payrollPdf').addEventListener('change',async()=>{
 const incoming=[...$('payrollPdf').files];$('payrollPdf').value='';
 await queuePayrollFiles(incoming);
});
const dropZone=$('gpPayrollDropZone');
if(dropZone){
 for(const name of ['dragenter','dragover'])dropZone.addEventListener(name,e=>{e.preventDefault();dropZone.style.background='#f0e8d9';dropZone.style.borderColor='#806747'});
 for(const name of ['dragleave','drop'])dropZone.addEventListener(name,e=>{e.preventDefault();dropZone.style.background='#fbf9f5';dropZone.style.borderColor='#b7a78c'});
 dropZone.addEventListener('drop',async e=>{const files=[...e.dataTransfer.files];if(files.length)await queuePayrollFiles(files)});
}
$('payrollRead').onclick=async()=>{
 if(!selectedFiles.length)return msg('Bitte zuerst Dateien auswählen.');
 const button=$('payrollRead');button.disabled=true;const output=$('payrollResults');output.replaceChildren();
 try{
  member=await authMember();await getArchive();
  let saved=0,dupes=0,unresolved=0;
  let lastImportedMonth=null;
  for(const file of [...selectedFiles]){
   msg('Verarbeite '+file.name);
   try{
    const digest=await hash(file);
    if(archived.some(x=>x.sha256===digest)){dupes++;output.append(el('p','DOPPELT: '+file.name+' ist bereits archiviert.'));continue}
    const pages=await extract(file),full=pages.join('\n');
    const company=clean(member.businesses?.name||'');
    if(/Brot\s*&\s*Wasser/i.test(full)&&company&&!/Brot\s*&\s*Wasser|Friedrich/i.test(company))throw Error('Dokument gehört zu Brot & Wasser, aber anderer Betrieb ausgewählt');
    const salaries=pages.filter(p=>/Lohn\s*\/\s*Gehaltsabrechnung/i.test(p)).map(parseSalary);
    const ev=parseEvent(full);
    const journal=/Auszahlungsjournal/i.test(full);
    let kind='other',status='archived',employeeId=null,month=null;
    if(salaries.length){
     kind='salary';month=salaries[0].month;if(month)lastImportedMonth=month;
     if(salaries.length!==pages.length||salaries.some(p=>!p.ready)){status='needs_review';unresolved++;output.append(el('p',file.name+': Lohnset enthält '+salaries.length+' Abrechnungen, davon nicht alle eindeutig erkannt. Original archiviert, keine unvollständigen Löhne gespeichert.'))}
     else{
      let rows=[];
      for(const p of salaries){const result=await saveSalary(p);rows.push(p.name+' ('+result+')')}
      saved+=rows.filter(x=>x.includes('(gespeichert)')).length;
      output.append(el('p',file.name+': '+rows.join(' · ')));
      if(salaries.length===1){const q=await db.from('employee_profiles').select('id').eq('business_id',member.business_id).ilike('full_name',salaries[0].name).maybeSingle();employeeId=q.data?.id||null}
     }
    }else if(ev){
     kind=ev.type;
     if(!ev.ready){status='needs_review';unresolved++;output.append(el('p',file.name+': An-/Abmeldung ohne eindeutigen Namen oder Beschäftigungsdatum; nur archiviert.'))}
     else{const res=await saveEvent(ev);employeeId=res.id;output.append(el('p',file.name+': '+ev.name+' · '+(ev.type==='registration'?'Anmeldung':'Abmeldung')+' '+ev.date+' ('+res.status+')'));if(res.status==='gespeichert')saved++}
    }else if(journal){kind='payment_journal';const m=full.match(/Auszahlungsjournal\s+(Jänner|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d{2})/i);if(m){const names=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'];month=m[2]+'-'+String(names.indexOf(norm(m[1]))+1).padStart(2,'0');if(month)lastImportedMonth=month}output.append(el('p',file.name+': Auszahlungsjournal im Archiv (keine doppelte Lohnbuchung).'))}
    else{status='needs_review';unresolved++;output.append(el('p',file.name+': Dokumenttyp nicht eindeutig; Original archiviert.'))}
    await archiveFile(file,digest,kind,employeeId,month,status);
    archived.push({sha256:digest});
   }catch(err){unresolved++;output.append(el('p',file.name+': NICHT ARCHIVIERT – '+err.message))}
  }
  selectedFiles=[];renderSelection();await getArchive();if(lastImportedMonth){selectedPersonnelYear=Number(lastImportedMonth.slice(0,4));selectedPersonnelMonth=lastImportedMonth;const archiveMonth=$('personMonth');if(archiveMonth){archiveMonth.value=lastImportedMonth;archiveMonth.dispatchEvent(new Event('change'))}}await renderEmployees();
  msg('Fertig: '+saved+' Datensätze gespeichert · '+dupes+' doppelte Dateien übersprungen · '+unresolved+' zur Prüfung/fehlgeschlagen. Archiv unten kontrollieren.');
 }catch(err){msg('Fehler: '+err.message)}finally{button.disabled=false}
};
(async()=>{try{member=await authMember();await getArchive();await renderEmployees();renderSelection()}catch(err){msg('Bitte anmelden und Betrieb auswählen: '+err.message)}})();

window.addEventListener('gastropilot:business-change',async()=>{try{member=await authMember();await getArchive();await renderEmployees();selectedFiles=[];renderSelection()}catch(e){msg('Betriebswechsel: '+e.message)}});
