import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {loadBankFixedCosts} from './bank-costs-integration.js';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
let businessId=null,role=null;
const euro=n=>n==null||!Number.isFinite(Number(n))?'–':new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(Number(n));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function status(t){$('status').textContent=t}
function entry(id,title,detail){
 const el=document.createElement('div');el.className='entry';
 const a=document.createElement('strong');a.textContent=title;
 const b=document.createElement('small');b.textContent=detail;
 el.append(a,b);$(id).append(el);
}
function showPage(p){
 document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));
 document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
}
document.querySelectorAll('[data-page]').forEach(x=>x.onclick=()=>showPage(x.dataset.page));
const requestedSection=new URLSearchParams(window.location.search).get('section');
if(['liquidity','payments','personnel','finance','control','costs'].includes(requestedSection)){
 showPage(requestedSection);
 requestAnimationFrame(()=>document.getElementById('page-'+requestedSection)?.scrollIntoView({block:'start'}));
}

async function list(table){
 const r=await db.from(table).select('*').eq('business_id',businessId).limit(500);
 if(r.error)throw Error(table+': '+r.error.message);
 return r.data||[];
}


async function renderAutoMatch(){
 const root=$('gpAutoMatch'),note=$('gpAutoMatchNote');if(!root)return;root.replaceChildren();
 const month=today().slice(0,7);
 const [closings,banks,sepa]=await Promise.all([
 db.from('bonit_daily_closings').select('closing_date,card_amount,cash_amount,gross_amount').eq('business_id',businessId).gte('closing_date',month+'-01').order('closing_date'),
 db.from('bank_transactions').select('id,booking_date,payee,description,amount').eq('business_id',businessId).gte('booking_date',month+'-01').limit(500),
 db.from('bank_sepa_batch_items').select('bank_transaction_id,amount').eq('business_id',businessId).limit(500)
 ]);
 if(closings.error||banks.error||sepa.error){note.textContent='Abgleich noch nicht verfügbar: '+(closings.error||banks.error||sepa.error).message;return;}
 const daily=new Map();for(const x of closings.data||[]){const key=x.closing_date;const v=daily.get(key)||{card:0,cash:0};v.card+=Number(x.card_amount||0);v.cash+=Number(x.cash_amount||0);daily.set(key,v)}
 const bank=banks.data||[],items=sepa.data||[];
 const hobex=bank.filter(x=>Number(x.amount)>0&&/hobex/i.test(x.payee||''));
 const sepaBatches=bank.filter(x=>Number(x.amount)<0&&/sepa-zahlung/i.test(x.payee||''));
 const complete=sepaBatches.filter(x=>Math.abs(items.filter(y=>y.bank_transaction_id===x.id).reduce((a,y)=>a+Number(y.amount),0)-Math.abs(Number(x.amount)))<0.011);
 let matched=0,pending=0,fee=0;
 for(const x of hobex){const d=String(x.description||'').match(/CARDS\s+(\d{6})-(\d{6})/i);if(!d){pending++;continue}
 const iso=v=>'20'+v.slice(0,2)+'-'+v.slice(2,4)+'-'+v.slice(4,6);
 const start=iso(d[1]),end=iso(d[2]);let total=0,count=0;
 for(const [date,v] of daily)if(date>=start&&date<=end){total+=v.card;count++}
 const gross=String(x.description||'').match(/TURNOVER\s+([\d.,]+)/i);const declared=gross?Number(gross[1].replace(/\./g,'').replace(',','.')):NaN;
 if(count&&Number.isFinite(declared)&&Math.abs(total-declared)<0.02){matched++;fee+=declared-Number(x.amount)}else pending++;
 }
 const tiles=[['Bonnie-Z-Berichte',daily.size+' Tage','Oktober · eingegangen'],['HOBEX zugeordnet',matched+' / '+hobex.length,'Exakter Abgleich der Kartenumsätze'],['HOBEX offen',pending+' Eingänge','Fehlende Tage oder Abweichungen prüfen'],['SEPA aufgeschlüsselt',complete.length+' / '+sepaBatches.length,'Einzelpositionen entsprechen Sammelbetrag']];
 for(const [label,value,desc] of tiles){const el=document.createElement('div');el.className='gp-fixed-tile';const a=document.createElement('small');a.textContent=label;const b=document.createElement('strong');b.textContent=value;const c=document.createElement('p');c.textContent=desc;el.append(a,b,c);root.append(el)}
 note.textContent='Automatische Prüfung bei jedem Laden · '+month+'. Nur exakte HOBEX-Bruttosummen werden als zugeordnet angezeigt. Gebühren aus passenden HOBEX-Eingängen: '+euro(fee)+'. Bareinzahlungen sind kein zusätzlicher Umsatz. Ungeklärte Vorgänge werden nicht automatisch als bezahlt markiert.';
}

async function renderFixedTiles(){
 const root=$('gpFixedTiles'),note=$('gpFixedNote');if(!root)return;
 root.replaceChildren();const month=today().slice(0,7),[year,monthNo]=month.split('-').map(Number);
 const end=(monthNo===12?year+1:year)+'-'+String(monthNo===12?1:monthNo+1).padStart(2,'0')+'-01';
 const result=await loadBankFixedCosts(db,businessId,month+'-01',end);
 if(result.error){note.textContent='Bankdaten nicht verfügbar: '+result.error.message;return}
 const cats=[['rent','Miete'],['energy','Strom & Energie'],['telephone','Telefon'],['internet','Internet'],['insurance','Betriebliche Versicherungen'],['other','Weitere Fixkosten']];
 const groups=Object.fromEntries(cats.map(([k])=>[k,[]]));
 for(const x of result.data||[]){const cat=x.category;if(!groups[cat])continue;groups[cat].push({date:x.booking_date,name:x.payee||x.description||'Bankzahlung',amount:Number(x.amount)||0,source:x.source})}
 let total=0;
 for(const [key,label] of cats){
  const items=groups[key],sum=items.reduce((n,x)=>n+x.amount,0);total+=sum;
  const tile=document.createElement('div');tile.className='gp-fixed-tile';
  const small=document.createElement('small');small.textContent=label;
  const strong=document.createElement('strong');strong.textContent=euro(sum);
  const info=document.createElement('p');info.textContent=items.length+' Bankpositionen · '+month;
  tile.append(small,strong,info);
  if(items.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Buchungen ansehen';details.append(summary);for(const x of items){const row=document.createElement('div');row.className='gp-fixed-row';const left=document.createElement('span');left.textContent=x.date+' · '+x.name;const right=document.createElement('b');right.textContent=euro(x.amount);row.append(left,right);details.append(row)}tile.append(details)}
  root.append(tile)
 }
 note.textContent='Fixkosten aus Bankbelegen '+month+': '+euro(total)+' · private Versicherungen, Personal, Steuern, Lieferanteneinkäufe und interne Überweisungen sind ausgeschlossen.';
}

async function refresh(){
 if(!businessId)return;
 try{
 status('Daten werden geladen …');
 const [accounts,flows,costs,people]=await Promise.all(['cash_accounts','cash_flow_entries','expenses','personnel_costs'].map(list));
 for(const id of ['accountList','costList','paymentList','personList'])$(id).replaceChildren();
 const newest=new Map();for(const x of [...accounts].sort((a,b)=>String(b.balance_date||'').localeCompare(String(a.balance_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))){const key=String(x.account_name||'').trim().toLocaleLowerCase('de-AT');if(!newest.has(key))newest.set(key,x)}const latest=[...newest.values()];const good=latest.filter(x=>x.current_balance!==null&&Number.isFinite(Number(x.current_balance)));
 const balance=good.reduce((s,x)=>s+Number(x.current_balance),0);
 for(const x of latest){const el=document.createElement('div');el.className='gp-liq-tile';const name=document.createElement('small');name.textContent=x.account_name;const amount=document.createElement('strong');amount.textContent=euro(x.current_balance);const date=document.createElement('small');date.textContent='Stand '+(x.balance_date||'unbekannt');el.append(name,amount,date);$('accountList').append(el)}
 if(false&&businessId==='6a5484d1-daf6-4263-897d-24cdf536aa29'&&!latest.some(x=>/raika|raiffeisen/i.test(String(x.account_name||'')))){
  entry('accountList','Raika · -3.650,20 EUR','PDF-Auszug: Stand 12.10.2026 · noch nicht als bestaetigter Kontostand erfasst');
 }

 const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+30);
 const end=d.toISOString().slice(0,10);
 let incoming=0,outgoing=0;
 for(const x of flows){
 const remaining=Math.max(0,Number(x.amount||0)-Number(x.paid_amount||0));
 const open=!['paid','cancelled'].includes(x.payment_status);
 if(open&&x.due_date&&x.due_date<=end){if(x.entry_type==='inflow')incoming+=remaining;else outgoing+=remaining}
 if(open){entry('paymentList',(x.entry_type==='inflow'?'Eingang: ':'Ausgang: ')+(x.description||'Zahlung')+' · '+euro(remaining),'Fällig '+(x.due_date||'unbekannt'));const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Als bezahlt markieren';btn.onclick=async()=>{if(!confirm('Zahlung wirklich als vollständig bezahlt markieren?'))return;const result=await db.from('cash_flow_entries').update({payment_status:'paid',paid_amount:Number(x.amount),paid_at:today()}).eq('id',x.id).eq('business_id',businessId);if(result.error){status('Nicht gespeichert: '+result.error.message);return}await refresh()};$('paymentList').lastElementChild.append(btn)}
 }
 const hasRaikaBalance=latest.some(x=>/raika|raiffeisen/i.test(String(x.account_name||'')));
 const provisionalRaika=0;
 const visibleBalance=balance+provisionalRaika;
 $('balance').textContent=good.length?euro(visibleBalance):'–';
 const balanceLabel=$('balance')?.previousElementSibling;
 if(balanceLabel)balanceLabel.textContent=provisionalRaika?'Bank & Kassa (vorläufig)':'Bank & Kassa';
 $('inflow').textContent=euro(incoming);$('outflow').textContent=euro(outgoing);
 $('forecast').textContent=good.length?euro(visibleBalance+incoming-outgoing):'–';
 const forecastLabel=$('forecast')?.previousElementSibling;
 if(forecastLabel)forecastLabel.textContent=provisionalRaika?'Prognose (vorläufig)':'Prognose';
 $('forecastNote').textContent=(provisionalRaika?'VORLÄUFIG: Raika -3.650,20 EUR aus PDF vom 12.10.2026 ist in der Anzeige berücksichtigt, aber noch nicht als bestaetigter Kontostand gespeichert. ':'')+'Stichtag '+today()+' bis '+end+'. Überfällige offene Zahlungen sind enthalten. Fixkosten und Personal werden nicht automatisch doppelt als Zahlungen gebucht. '+(good.length?'Kontostände bitte aktuell halten.':'Noch keine bestätigten Kontostände.');
 await renderFixedTiles();
 await renderAutoMatch();
 for(const x of costs.filter(x=>x.is_recurring))entry('costList',(x.supplier||x.description||'Fixkosten')+' · '+euro(x.gross_amount),(x.category||'')+' · '+(x.due_date||'ohne Fälligkeit'));
 const archiveMonths=[...new Set(people.map(x=>String(x.accounting_month||'').slice(0,7)).filter(x=>/^\\d{4}-\\d{2}$/.test(x)))].sort().reverse();
 const monthButtons=$('gpArchiveMonthButtons');if(monthButtons){monthButtons.replaceChildren();for(const m of archiveMonths){const btn=document.createElement('button');btn.type='button';btn.textContent=new Date(m+'-02T12:00:00').toLocaleDateString('de-AT',{month:'long',year:'numeric'});btn.style.cssText='display:flex;align-items:center;justify-content:center;min-height:76px;padding:14px 18px;border-radius:14px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04);font-size:16px;cursor:pointer;'+($('personMonth').value===m?'font-weight:750;border:2px solid #78664e;background:#faf7f2':'border:1px solid #dedede;font-weight:600');btn.onclick=()=>{$('personMonth').value=m;refresh()};monthButtons.append(btn)}}
 const month=$('personMonth').value||today().slice(0,7);
 const selected=people.filter(x=>String(x.accounting_month||'').startsWith(month));
 const sum=selected.reduce((s,x)=>s+Number(x.gross_salary||0)+Number(x.employer_costs||0),0);
 const root=$('personList');root.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;margin:16px 0';
 const headline=document.createElement('div');headline.style.cssText='grid-column:1/-1;background:#f8f5ef;border:1px solid #e1d9cd;border-radius:16px;padding:18px 20px';
 const heading=document.createElement('div');heading.style.cssText='color:#75664f;font-size:13px;font-weight:700';heading.textContent='PERSONALKOSTEN · '+new Date(month+'-02T12:00:00').toLocaleDateString('de-AT',{month:'long',year:'numeric'}).toUpperCase();
 const total=document.createElement('strong');total.style.cssText='display:block;font-size:clamp(24px,3vw,32px);margin:6px 0';total.textContent=euro(sum);
 const sub=document.createElement('small');sub.textContent=selected.length+' Mitarbeiter-Einträge · keine automatische Zahlungsbuchung';headline.append(heading,total,sub);root.append(headline);
 for(const x of selected){
  const card=document.createElement('div');card.style.cssText='background:#fff;border:1px solid #e1d9cd;border-radius:16px;padding:16px;box-shadow:0 3px 12px #241b1008;min-width:0';
  const name=document.createElement('strong');name.style.cssText='display:block;font-size:16px;margin-bottom:9px;overflow-wrap:anywhere';name.textContent=x.employee_name;
  const cost=document.createElement('strong');cost.style.cssText='display:block;font-size:23px;margin-bottom:10px';cost.textContent=euro(Number(x.gross_salary||0)+Number(x.employer_costs||0));
  const details=document.createElement('small');details.style.cssText='color:#666;line-height:1.7';details.textContent='Brutto '+euro(x.gross_salary)+' · Dienstgeberkosten '+euro(x.employer_costs);
  card.append(name,cost,details);root.append(card);
 }
 status('Daten geladen. Bitte Einträge vor Entscheidungen mit den Originalbelegen abgleichen.');
 }catch(e){status('Datenfehler: '+e.message)}
}
function form(id,table,convert){
 $(id).onsubmit=async ev=>{
 ev.preventDefault();
 if(role!=='owner'){status('Nur Inhaber dürfen Daten ändern.');return}
 try{
 const row={business_id:businessId,...convert(new FormData($(id)))};
 const r=await db.from(table).insert(row);
 if(r.error)throw r.error;
 $(id).reset();await refresh();status('Gespeichert.');
 }catch(e){status('Nicht gespeichert: '+e.message)}
 };
}
$('accountForm').onsubmit=async ev=>{
 ev.preventDefault();if(role!=='owner')return;
 const f=new FormData($('accountForm'));
 const name=String(f.get('account_name')||'').trim();
 const row={business_id:businessId,account_name:name,account_type:f.get('account_type'),current_balance:Number(f.get('current_balance')),balance_date:f.get('balance_date')};
 try{
 const existing=await db.from('cash_accounts').select('id').eq('business_id',businessId).ilike('account_name',name).limit(1);
 if(existing.error)throw existing.error;
 const result=existing.data?.length?await db.from('cash_accounts').update(row).eq('id',existing.data[0].id).eq('business_id',businessId):await db.from('cash_accounts').insert(row);
 if(result.error)throw result.error;
 $('accountForm').reset();await refresh();status('Kontostand gespeichert.');
 }catch(e){status('Nicht gespeichert: '+e.message)}
};
form('costForm','expenses',f=>({supplier:f.get('supplier'),description:f.get('description'),category:f.get('category'),gross_amount:Number(f.get('gross_amount')),due_date:f.get('due_date'),expense_date:f.get('due_date'),accounting_month:String(f.get('due_date')).slice(0,7)+'-01',payment_status:'open',is_recurring:true}));
form('paymentForm','cash_flow_entries',f=>({entry_type:f.get('entry_type'),description:f.get('description'),amount:Number(f.get('amount')),due_date:f.get('due_date'),payment_status:'open',paid_amount:0}));
form('personForm','personnel_costs',f=>({accounting_month:f.get('accounting_month')+'-01',employee_name:f.get('employee_name'),gross_salary:Number(f.get('gross_salary')),employer_costs:Number(f.get('employer_costs')),total_costs:Number(f.get('gross_salary'))+Number(f.get('employer_costs')),payment_status:'open'}));
$('personMonth').onchange=refresh;
async function enter(){
 const r=await db.auth.getUser();
 if(r.error||!r.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',r.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness.choose(m.data);
 if(!member)throw Error('Kein Zugriff auf den gewählten Betrieb.');
 if(member.role!=='owner')throw Error('Die Verwaltung ist derzeit nur für Betriebsinhaber freigeschaltet.');
 businessId=member.business_id;role=member.role;window.GastroPilotBusiness.render(m.data,member.business_id);
 $('business').textContent=(member.businesses?.name||'Das Friedrich')+' · Inhaber';
 $('login').classList.add('hidden');$('app').classList.remove('hidden');
 $('personMonth').value='2026-08';$('personForm').elements.accounting_month.value='2026-08';
 for(const id of ['accountForm','costForm','paymentForm'])$(id).elements[id==='accountForm'?'balance_date':'due_date'].value=today();
 await refresh();
}
$('loginForm').onsubmit=async ev=>{
 ev.preventDefault();$('loginStatus').textContent='Anmeldung läuft …';
 const r=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 if(r.error){$('loginStatus').textContent=r.error.message;return}
 try{await enter()}catch(e){$('loginStatus').textContent=e.message}
};
$('logout').onclick=async()=>{await db.auth.signOut();businessId=null;role=null;$('app').classList.add('hidden');$('login').classList.remove('hidden')};
(async()=>{try{const r=await db.auth.getSession();if(r.error)throw r.error;if(r.data.session){await enter()}else{$('login').classList.remove('hidden')}}catch(e){$('login').classList.remove('hidden');$('loginStatus').textContent='Anmeldung erforderlich: '+e.message}})();

/* Direkter Betriebswechsel ohne Login-Zwischenseite. */
window.addEventListener('gastropilot:business-change',async e=>{
 const next=e.detail?.businessId;
 if(!next||next===businessId)return;
 try{
  const a=await db.auth.getUser();
  if(a.error||!a.data.user)throw Error('Sitzung abgelaufen.');
  const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
  if(m.error)throw m.error;
  const x=m.data.find(v=>v.business_id===next&&v.role==='owner');
  if(!x)throw Error('Kein Inhaberzugriff.');
  businessId=x.business_id;
  role=x.role;$('business').textContent=x.businesses.name+' · Inhaber';
  window.GastroPilotBusiness.render(m.data,businessId);
  await refresh();
 }catch(err){status('Betriebswechsel: '+err.message);}
});
