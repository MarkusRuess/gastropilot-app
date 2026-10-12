import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const fmtDate=s=>s?String(s).slice(8,10)+'.'+String(s).slice(5,7)+'.'+String(s).slice(0,4):'–';
let bankEntries=[];
let latestLoad=0;
const fid='6a5484d1-daf6-4263-897d-24cdf536aa29';
function render(){
 const target=$('gpBankPayments');target.replaceChildren();
 const filter=$('gpBankFilter').value;
 const items=bankEntries.filter(x=>!filter||x.account_name===filter);
 const title=document.createElement('p');title.textContent=items.length+' gespeicherte Buchungen'+(filter?' · '+filter:'');target.append(title);
 for(const x of items){
  const row=document.createElement('div');row.className='entry';row.style.display='flex';row.style.justifyContent='space-between';row.style.gap='12px';row.style.alignItems='start';
  const left=document.createElement('div');left.style.minWidth='0';left.style.overflowWrap='anywhere';
  const name=document.createElement('strong');name.textContent=x.payee||'Ohne Empfänger';
  const details=document.createElement('small');details.style.display='block';details.textContent=fmtDate(x.booking_date)+' · '+x.account_name+' · '+(x.description||'');
  left.append(name,details);
  const amt=document.createElement('strong');amt.textContent=euro(x.amount);amt.style.whiteSpace='nowrap';row.append(left,amt);target.append(row);
 }
}
async function load(){
 const request=++latestLoad;
 const status=$('gpBankStatus'),tiles=$('gpBankAccounts');status.textContent='Lade Bankdaten …';tiles.replaceChildren();
 const auth=await db.auth.getUser();
 if(auth.error||!auth.data.user){status.textContent='Bitte anmelden, um Bankbewegungen zu sehen.';return}
 const membership=await db.from('business_members').select('business_id').eq('user_id',auth.data.user.id).eq('business_id',fid).limit(1);
 if(membership.error||!membership.data?.length){status.textContent='Keine Berechtigung für die Bankdaten dieses Betriebs.';return}
 const [movements,balances]=await Promise.all([
  db.from('bank_transactions').select('account_name,booking_date,payee,description,amount,category').eq('business_id',fid).order('booking_date',{ascending:false}).limit(1000),
  db.from('cash_accounts').select('account_name,current_balance,balance_date,created_at').eq('business_id',fid).limit(200)
 ]);
 if(movements.error){status.textContent='Fehler beim Laden der Bankbewegungen: '+movements.error.message;return}
 if(request!==latestLoad)return;
 bankEntries=movements.data||[];
 for(const bank of ['Raika','Volksbank']){
  const entries=bankEntries.filter(x=>x.account_name===bank);
  const dates=entries.map(x=>x.booking_date).sort();
  const balance=(balances.data||[]).filter(x=>bank==='Raika'?/raika|raiffeisen/i.test(x.account_name):/volksbank/i.test(x.account_name)).sort((a,b)=>String(b.balance_date).localeCompare(String(a.balance_date))||String(b.created_at).localeCompare(String(a.created_at)))[0];
  const tile=document.createElement('div');tile.className='metric';
  const h=document.createElement('strong');h.textContent=bank+' · '+entries.length+' Buchungen';
  const range=document.createElement('small');range.style.display='block';range.textContent=dates.length?'Importierter Buchungszeitraum: '+fmtDate(dates[0])+' – '+fmtDate(dates[dates.length-1]):'Keine Buchungen importiert';
  const bal=document.createElement('small');bal.style.display='block';bal.textContent=balance?'Erfasster Kontostand: '+euro(balance.current_balance)+' · Stand '+fmtDate(balance.balance_date):'Kein bestätigter Kontostand hinterlegt';
  tile.append(h,range,bal);tiles.append(tile);
 }
 status.textContent='Datenbankabfrage abgeschlossen: '+bankEntries.length+' Bankbewegungen. Letzter Abruf: '+new Intl.DateTimeFormat('de-AT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Vienna'}).format(new Date())+'.';
 render();
}
$('gpBankRefresh')?.addEventListener('click',load);
$('gpBankFilter')?.addEventListener('change',render);
db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN')setTimeout(load,0)});
load().catch(e=>{$('gpBankStatus').textContent='Fehler: '+e.message});
