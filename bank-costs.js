import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const eur=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const names={rent:'Miete',energy:'Strom / Energie',telephone:'Telefon',internet:'Internet',insurance:'Versicherung',other:'Sonstiges'};
async function owner(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness.choose(m.data?.filter(v=>v.role==='owner'));
 if(!member)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 return member.business_id;
}
async function fingerprint(s){
 const bytes=new TextEncoder().encode(s);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function refresh(){
 try{
 const id=await owner();
 const r=await db.from('bank_fixed_costs').select('*').eq('business_id',id).order('booking_date',{ascending:false}).limit(500);
 if(r.error)throw r.error;
 const list=$('bankCostSummary');list.replaceChildren();
 const rows=r.data||[];
 const months=[...new Set(rows.map(x=>x.booking_date.slice(0,7)))].sort().reverse();
 for(const month of months){
  const subset=rows.filter(x=>x.booking_date.startsWith(month));
  const total=subset.reduce((a,x)=>a+Number(x.amount),0);
  const h=document.createElement('div');h.className='entry';
  const title=document.createElement('strong');title.textContent=month+' · bestätigte Fixkostenzahlungen '+eur(total);
  h.append(title);
  for(const category of Object.keys(names)){
   const items=subset.filter(x=>x.category===category);if(!items.length)continue;
   const p=document.createElement('small');p.textContent=names[category]+': '+eur(items.reduce((a,x)=>a+Number(x.amount),0))+' ('+items.length+' Buchungen)';
   h.append(p);
  }
  list.append(h);
 }
 if(!rows.length)$('bankCostStatus').textContent='Noch keine geprüften Fixkosten-Bankzahlungen vorhanden.';
 }catch(e){$('bankCostStatus').textContent='Fixkosten nicht geladen: '+e.message}
}
$('bankCostForm').onsubmit=async ev=>{
 ev.preventDefault();
 try{
 const f=new FormData(ev.currentTarget);
 if(f.get('verified')!=='on')throw Error('Bitte den Bankbeleg zuerst bestätigen.');
 const id=await owner(),amount=Number(f.get('amount'));
 if(!Number.isFinite(amount)||amount<=0)throw Error('Ungültiger Betrag.');
 const row={business_id:id,account_name:f.get('account_name'),booking_date:f.get('booking_date'),payee:String(f.get('payee')||'').trim(),amount,category:f.get('category'),reference_text:f.get('reference_text')||null};
 if(!row.payee||!row.booking_date)throw Error('Pflichtfelder fehlen.');
 const normalized=[row.account_name,row.booking_date,row.payee.toLocaleLowerCase('de-AT'),amount.toFixed(2),String(row.reference_text||'').trim().toLocaleLowerCase('de-AT')].join('|');
 row.source_hash=await fingerprint(normalized);
 const r=await db.from('bank_fixed_costs').insert(row);
 if(r.error){if(r.error.code==='23505')throw Error('Mögliche Doppelbuchung: Diese Bankzahlung ist bereits erfasst.');throw r.error}
 ev.currentTarget.reset();$('bankCostStatus').textContent='Bankzahlung gespeichert. Weitere Kosten werden nur nach Prüfung übernommen.';await refresh();
 }catch(e){$('bankCostStatus').textContent='Nicht gespeichert: '+e.message}
};
setTimeout(refresh,500);
