import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
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
async function list(table){
 const r=await db.from(table).select('*').eq('business_id',businessId).limit(500);
 if(r.error)throw Error(table+': '+r.error.message);
 return r.data||[];
}
async function refresh(){
 if(!businessId)return;
 try{
 status('Daten werden geladen …');
 const [accounts,flows,costs,people]=await Promise.all(['cash_accounts','cash_flow_entries','expenses','personnel_costs'].map(list));
 for(const id of ['accountList','costList','paymentList','personList'])$(id).replaceChildren();
 const newest=new Map();for(const x of [...accounts].sort((a,b)=>String(b.balance_date||'').localeCompare(String(a.balance_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))){const key=String(x.account_name||'').trim().toLocaleLowerCase('de-AT');if(!newest.has(key))newest.set(key,x)}const latest=[...newest.values()];const good=latest.filter(x=>x.current_balance!==null&&Number.isFinite(Number(x.current_balance)));
 const balance=good.reduce((s,x)=>s+Number(x.current_balance),0);
 for(const x of latest)entry('accountList',x.account_name+' · '+euro(x.current_balance),(x.account_type||'')+' · Stand '+(x.balance_date||'ohne Datum'));
 const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+30);
 const end=d.toISOString().slice(0,10);
 let incoming=0,outgoing=0;
 for(const x of flows){
 const remaining=Math.max(0,Number(x.amount||0)-Number(x.paid_amount||0));
 const open=!['paid','cancelled'].includes(x.payment_status);
 if(open&&x.due_date&&x.due_date<=end){if(x.entry_type==='inflow')incoming+=remaining;else outgoing+=remaining}
 if(open){entry('paymentList',(x.entry_type==='inflow'?'Eingang: ':'Ausgang: ')+(x.description||'Zahlung')+' · '+euro(remaining),'Fällig '+(x.due_date||'unbekannt'));const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Als bezahlt markieren';btn.onclick=async()=>{if(!confirm('Zahlung wirklich als vollständig bezahlt markieren?'))return;const result=await db.from('cash_flow_entries').update({payment_status:'paid',paid_amount:Number(x.amount),paid_at:today()}).eq('id',x.id).eq('business_id',businessId);if(result.error){status('Nicht gespeichert: '+result.error.message);return}await refresh()};$('paymentList').lastElementChild.append(btn)}
 }
 $('balance').textContent=good.length?euro(balance):'–';
 $('inflow').textContent=euro(incoming);$('outflow').textContent=euro(outgoing);
 $('forecast').textContent=good.length?euro(balance+incoming-outgoing):'–';
 $('forecastNote').textContent='Stichtag '+today()+' bis '+end+'. Überfällige offene Zahlungen sind enthalten. Fixkosten und Personal werden nicht automatisch doppelt als Zahlungen gebucht. '+(good.length?'Kontostände bitte aktuell halten.':'Noch keine bestätigten Kontostände.');
 for(const x of costs.filter(x=>x.is_recurring))entry('costList',(x.supplier||x.description||'Fixkosten')+' · '+euro(x.gross_amount),(x.category||'')+' · '+(x.due_date||'ohne Fälligkeit'));
 const month=$('personMonth').value||today().slice(0,7);
 const selected=people.filter(x=>String(x.accounting_month||'').startsWith(month));
 const sum=selected.reduce((s,x)=>s+Number(x.gross_salary||0)+Number(x.employer_costs||0),0);
 entry('personList','Gesamtkosten '+month+' · '+euro(sum),selected.length+' Einträge; keine automatische Zahlungsbuchung');
 for(const x of selected)entry('personList',x.employee_name+' · '+euro(Number(x.gross_salary||0)+Number(x.employer_costs||0)),'Brutto '+euro(x.gross_salary)+' · DG '+euro(x.employer_costs));
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
 $('personMonth').value='2026-09';$('personForm').elements.accounting_month.value='2026-09';
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
(async()=>{const r=await db.auth.getSession();if(r.data.session){try{await enter()}catch(e){$('loginStatus').textContent=e.message}}})();

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
