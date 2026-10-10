import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const dateISO=d=>d.toISOString().slice(0,10);
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return dateISO(x)};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const status=t=>$('ctlStatus').textContent=t;
async function owner(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const x=m.data?.find(z=>z.role==='owner'&&z.businesses?.name?.includes('Friedrich'));
 if(!x)throw Error('Kein Inhaberzugriff für Das Friedrich.');
 return x.business_id;
}
async function hash(text){const bytes=new TextEncoder().encode(text);const d=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function note(container,title,detail){const x=document.createElement('div');x.className='entry';const a=document.createElement('strong');a.textContent=title;const b=document.createElement('small');b.textContent=detail;x.append(a,b);container.append(x)}
async function refresh(){
 try{
 const id=await owner();
 const tables=['cash_accounts','cash_flow_entries','bank_transactions','expenses','personnel_costs','financial_statements'];
 const result=await Promise.all(tables.map(t=>db.from(t).select('*').eq('business_id',id).limit(1000)));
 result.forEach((r,i)=>{if(r.error)throw Error(tables[i]+': '+r.error.message)});
 const [accounts,flows,bank,expenses,people,financial]=result.map(r=>r.data||[]);
 const latest=new Map();
 for(const x of [...accounts].sort((a,b)=>String(b.balance_date||'').localeCompare(String(a.balance_date||'')))){const k=String(x.account_name).toLowerCase().trim();if(!latest.has(k))latest.set(k,x)}
 const balances=[...latest.values()].filter(x=>x.current_balance!=null);
 const current=balances.reduce((s,x)=>s+Number(x.current_balance),0);
 $('ctlBalance').textContent=balances.length?euro(current):'–';
 const month=today().slice(0,7),monthBank=bank.filter(x=>x.booking_date.startsWith(month)&&x.category!=='transfer');
 const cashflow=monthBank.reduce((s,x)=>s+Number(x.amount),0);
 $('ctlCashflow').textContent=monthBank.length?euro(cashflow):'–';
 const open=flows.filter(x=>!['paid','cancelled'].includes(x.payment_status)&&x.entry_type==='outflow');
 const remaining=x=>Math.max(0,Number(x.amount||0)-Number(x.paid_amount||0));
 $('ctlOpen').textContent=euro(open.reduce((s,x)=>s+remaining(x),0));
 const alert=$('ctlAlerts'),weeks=$('ctlWeeks'),list=$('ctlBankList');
 alert.replaceChildren();weeks.replaceChildren();list.replaceChildren();
 if(!balances.length)note(alert,'Kontostände fehlen','Bitte Bank- und Kassastände mit Stichtag erfassen.');
 if(!bank.length)note(alert,'Bankbewegungen fehlen','Cashflow und automatische Zahlungszuordnung sind noch unvollständig.');
 const overdue=open.filter(x=>x.due_date&&x.due_date<today());
 if(overdue.length)note(alert,'Überfällige Auszahlungen',overdue.length+' Positionen · '+euro(overdue.reduce((s,x)=>s+remaining(x),0)));
 const unknown=bank.filter(x=>x.category==='unassigned');
 if(unknown.length)note(alert,'Ungeklärte Bankbuchungen',unknown.length+' Buchungen müssen zugeordnet werden.');
 if(!financial.length)note(alert,'Keine Finanzberichte','Bitte Saldenliste und Jahresabschluss einspielen.');
 if(!people.length)note(alert,'Personalkosten fehlen','Noch keine Lohnabrechnungen gespeichert.');
 const future=flows.filter(x=>!['paid','cancelled'].includes(x.payment_status)&&x.due_date);
 let projected=current;
 for(let w=0;w<13;w++){
  const start=w===0?today():addDays(today(),w*7);
  const end=addDays(today(),w*7+6);
  const selected=future.filter(x=>x.due_date>=start&&x.due_date<=end);
  const income=selected.filter(x=>x.entry_type==='inflow').reduce((s,x)=>s+remaining(x),0);
  const outgoing=selected.filter(x=>x.entry_type==='outflow').reduce((s,x)=>s+remaining(x),0);
  projected+=income-outgoing;
  note(weeks,'Woche '+(w+1)+' · '+start+' bis '+end,'Eingänge '+euro(income)+' · Ausgänge '+euro(outgoing)+' · rechnerischer Stand '+(balances.length?euro(projected):'–'));
  if(balances.length&&projected<0)note(alert,'Liquiditätsrisiko in Woche '+(w+1),'Rechnerischer Stand '+euro(projected)+'; nur bereits erfasste Fälligkeiten berücksichtigt.');
 }
 $('ctlForecast').textContent=balances.length?euro(projected):'–';
 if(!future.length)note(alert,'Keine geplanten Zahlungstermine','13-Wochen-Vorschau enthält keine zukünftigen Zahlungsbewegungen.');
 if(!alert.children.length)note(alert,'Keine erkannten Warnungen','Dies bedeutet nicht, dass alle Daten vollständig sind.');
 for(const x of [...bank].sort((a,b)=>b.booking_date.localeCompare(a.booking_date)).slice(0,25))note(list,x.booking_date+' · '+euro(Number(x.amount))+' · '+x.category,(x.payee||'Unbekannt')+' · '+(x.description||''));
 }catch(e){status('Dashboard konnte nicht geladen werden: '+e.message)}
}
$('ctlRead').onclick=async()=>{
 const file=$('ctlPdf').files?.[0];
 if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>15e6)return status('Bitte PDF bis 15 MB auswählen.');
 try{
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>50)throw Error('Maximal 50 Seiten.');
 const pages=[];
 for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);pages.push((await p.getTextContent()).items.map(x=>x.str||'').join(' '))}
 const t=pages.join('\n--- SEITE ---\n');if(t.trim().length<30)throw Error('Bild-PDF ohne auslesbaren Text.');
 $('ctlText').value=t.slice(0,60000);status('PDF lokal gelesen. Einzelbuchungen bitte mit Datum, Betrag und Empfänger kontrollieren und speichern.');
 }catch(e){status('PDF nicht lesbar: '+e.message)}
};
$('ctlBankForm').onsubmit=async ev=>{
 ev.preventDefault();
 try{
 const f=new FormData(ev.currentTarget);if(f.get('verified')!=='on')throw Error('Bankbuchung zuerst prüfen.');
 const id=await owner(),amount=Number(f.get('amount'));
 if(!Number.isFinite(amount)||amount===0)throw Error('Ungültiger Betrag.');
 const row={business_id:id,account_name:f.get('account_name'),booking_date:f.get('booking_date'),payee:String(f.get('payee')||'').trim(),description:String(f.get('description')||'').trim(),amount,category:f.get('category'),match_status:'reviewed'};
 if(!row.booking_date)throw Error('Buchungsdatum fehlt.');
 row.source_hash=await hash([row.account_name,row.booking_date,row.payee.toLowerCase(),row.description.toLowerCase(),amount.toFixed(2)].join('|'));
 const r=await db.from('bank_transactions').insert(row);
 if(r.error){if(r.error.code==='23505')throw Error('Mögliche doppelte Bankbuchung; nicht gespeichert.');throw r.error}
 ev.currentTarget.reset();status('Geprüfte Bankbuchung gespeichert.');await refresh();
 }catch(e){status('Nicht gespeichert: '+e.message)}
};
setTimeout(refresh,500);
