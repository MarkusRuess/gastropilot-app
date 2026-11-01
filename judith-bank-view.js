import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const JUDITH='87889eaf-f865-4e3a-8f9a-cd01db483e0e';
const $=id=>document.getElementById(id);
const eur=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
let rows=[],shown=15;
function render(){
 const host=$('gpJudithBankView');if(!host)return;
 const selected=$('month')?.value||'';
 const months=[...new Set(rows.map(x=>String(x.booking_date).slice(0,7)))].sort().reverse();
 const month=months.includes(selected)?selected:months[0];
 const monthRows=rows.filter(x=>String(x.booking_date).startsWith(month||''));
 const incoming=monthRows.filter(x=>Number(x.amount)>0).reduce((a,x)=>a+Number(x.amount),0);
 const outgoing=monthRows.filter(x=>Number(x.amount)<0).reduce((a,x)=>a+Number(x.amount),0);
 host.replaceChildren();
 const heading=document.createElement('p');heading.textContent=month?('Bankmonat '+month+(selected!==month?' · ausgewählter Dashboard-Monat '+selected+' ohne Bankbewegungen':'')):'Keine Bankbewegungen für Judith vorhanden.';host.append(heading);
 if(!month)return;
 const summary=document.createElement('p');summary.textContent=monthRows.length+' Buchungen · Eingänge '+eur(incoming)+' · Ausgänge '+eur(outgoing)+' · Netto '+eur(incoming+outgoing);host.append(summary);
 const balance=document.createElement('p');balance.textContent='Kontostand: offen · Aus Buchungen allein nicht ableitbar.';host.append(balance);
 const select=document.createElement('select');select.setAttribute('aria-label','Bankmonat');for(const value of months)select.add(new Option(value,value));select.value=month;select.onchange=()=>{const field=$('month');if(field&&field.value!==select.value){field.value=select.value;field.dispatchEvent(new Event('change',{bubbles:true}));}else render();};host.append(select);
 const list=document.createElement('div');list.style.cssText='max-height:500px;overflow:auto;margin-top:12px';for(const x of monthRows.slice(0,shown)){const item=document.createElement('div');item.style.cssText='display:flex;justify-content:space-between;gap:14px;border-top:1px solid #efd6e4;padding:9px 0';const name=document.createElement('span');name.textContent=x.booking_date+' · '+(x.payee||'Ohne Bezeichnung');const amount=document.createElement('strong');amount.textContent=eur(Number(x.amount));item.append(name,amount);list.append(item);}host.append(list);
 if(shown<monthRows.length){const more=document.createElement('button');more.type='button';more.textContent='Weitere Buchungen anzeigen';more.onclick=()=>{shown+=30;render()};host.append(more);}
}
async function load(){
 const host=$('gpJudithBankView');if(!host)return;host.textContent='Bankbewegungen werden geladen …';
 const auth=await db.auth.getUser();if(auth.error||!auth.data.user){host.textContent='Bitte anmelden.';return}
 const member=await db.from('business_members').select('business_id').eq('user_id',auth.data.user.id).eq('business_id',JUDITH).limit(1);
 if(member.error||!member.data?.length){host.textContent='Kein Zugriff auf Judiths Bankdaten.';return}
 let all=[];for(let offset=0;;offset+=1000){const result=await db.from('bank_transactions').select('booking_date,payee,amount').eq('business_id',JUDITH).order('booking_date',{ascending:false}).range(offset,offset+999);if(result.error){host.textContent='Bankdaten konnten nicht geladen werden: '+result.error.message;return}all.push(...result.data);if(result.data.length<1000)break}
 rows=all;shown=15;render();
}
function init(){const body=$('gpMockupDetailBody');if(!body)return;const section=document.createElement('section');section.id='gpJudithBankView';section.className='gp-area-hidden';body.append(section);
 $('gpCockpitQuick')?.addEventListener('click',e=>{if(document.body.classList.contains('gp-judith-design')&&e.target.closest('[data-gp-quick="bank"]'))setTimeout(load,0)});
 $('month')?.addEventListener('change',()=>{if(rows.length)render()});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'&&document.body.classList.contains('gp-judith-design'))load()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
