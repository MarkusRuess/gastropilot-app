import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const iso=(y,m,d=1)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
const pct=(current,prior,node)=>{node.style.color='';if(prior===0){node.textContent='–';return}const change=(current/prior-1)*100;node.textContent=(change>0?'▲ +':change<0?'▼ ':'● ')+change.toLocaleString('de-AT',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';node.style.color=change>0?'#188038':change<0?'#c62828':'#555'};
const reset=()=>{for(const x of ['chiefMonthYoY','chiefYearYoY','chiefResult','chiefResultYoY'])$(x).textContent='–';for(const x of ['chiefMonthDetail','chiefYearDetail','chiefResultDetail','chiefResultYoYDetail'])$(x).textContent='Noch keine vollständigen Vergleichsdaten';};
let seq=0;
async function refresh(){
 const call=++seq;reset();
 const auth=await db.auth.getUser();if(auth.error||!auth.data.user)return;
 const m=await db.from('business_members').select('business_id,role').eq('user_id',auth.data.user.id);
 if(m.error)return;
 const owners=(m.data||[]).filter(x=>x.role==='owner');
 const selected=window.GastroPilotBusiness?.choose(owners);
 if(!selected)return;
 const id=selected.business_id;
 const [fiscal,months,statements]=await Promise.all([
  db.from('business_fiscal_years').select('start_month,start_day,confirmed').eq('business_id',id).maybeSingle(),
  db.from('monthly_cost_ratio_inputs').select('month,net_revenue').eq('business_id',id).order('month',{ascending:false}).limit(80),
  db.from('financial_statements').select('statement_type,period_end,period_result,revenue,created_at').eq('business_id',id).eq('statement_type','annual_accounts').order('period_end',{ascending:false}).limit(10)
 ]);
 if(call!==seq||[fiscal,months,statements].some(x=>x.error))return;
 const fy=fiscal.data;if(!fy)return;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=k=>Number(parts.find(x=>x.type===k).value);
 const year=part('year'),month=part('month'),day=part('day');
 const fyYear=month>fy.start_month||(month===fy.start_month&&day>=fy.start_day)?year:year-1;
 const begin=iso(fyYear,fy.start_month,fy.start_day);
 const next=iso(fyYear+1,fy.start_month,fy.start_day);
 const end=new Date(next+'T12:00:00Z');end.setUTCDate(end.getUTCDate()-1);
 const endText=new Intl.DateTimeFormat('de-AT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(end);
 $('chiefFiscal').textContent='Geschäftsjahr '+begin.split('-').reverse().join('.')+' – '+endText+(fy.confirmed?'':' · noch nicht bestätigt');
 const rows=new Map((months.data||[]).filter(x=>x.net_revenue!=null).map(x=>[x.month.slice(0,7),Number(x.net_revenue)]));
 // The ongoing month is not used: monthly bookkeeping may still be incomplete.
 const last=new Date(Date.UTC(year,month-1,1));last.setUTCMonth(last.getUTCMonth()-1);
 const lastKey=iso(last.getUTCFullYear(),last.getUTCMonth()+1).slice(0,7);
 const oldKey=iso(last.getUTCFullYear()-1,last.getUTCMonth()+1).slice(0,7);
 if(rows.has(lastKey)&&rows.has(oldKey)){
  pct(rows.get(lastKey),rows.get(oldKey),$('chiefMonthYoY'));
  $('chiefMonthDetail').textContent=lastKey+' '+money(rows.get(lastKey))+' / '+oldKey+' '+money(rows.get(oldKey));
 }
 const firstMonth=fy.start_month;
 const startKey=iso(fyYear,firstMonth).slice(0,7);
 const keys=[];let cur=new Date(Date.UTC(fyYear,firstMonth-1,1));
 while(cur<=last&&keys.length<12){keys.push(iso(cur.getUTCFullYear(),cur.getUTCMonth()+1).slice(0,7));cur.setUTCMonth(cur.getUTCMonth()+1)}
 const oldKeys=keys.map(k=>iso(Number(k.slice(0,4))-1,Number(k.slice(5,7))).slice(0,7));
 if(keys.length&&keys.every(k=>rows.has(k))&&oldKeys.every(k=>rows.has(k))){
  const a=keys.reduce((n,k)=>n+rows.get(k),0),b=oldKeys.reduce((n,k)=>n+rows.get(k),0);
  pct(a,b,$('chiefYearYoY'));
  $('chiefYearDetail').textContent=keys.length+' abgeschlossene Monate · '+money(a)+' / '+money(b);
 }
 const dedup=new Map();for(const x of statements.data||[]){if(!dedup.has(x.period_end))dedup.set(x.period_end,x)}
 const list=[...dedup.values()].filter(x=>x.period_result!=null);
 if(list.length){$('chiefResult').textContent=money(Number(list[0].period_result));$('chiefResultDetail').textContent='Jahresabschluss zum '+list[0].period_end}
 if(list.length>1){
  const a=Number(list[0].period_result),b=Number(list[1].period_result),delta=a-b;
  $('chiefResultYoY').textContent=(delta>0?'▲ +':delta<0?'▼ ':'● ')+money(delta);
  $('chiefResultYoY').style.color=delta>0?'#188038':delta<0?'#c62828':'#555';
  $('chiefResultYoYDetail').textContent=list[0].period_end+' gegenüber '+list[1].period_end;
 }
}
document.querySelector('[data-page="control"]')?.addEventListener('click',()=>setTimeout(refresh,0));
window.addEventListener('gastropilot:business-change',()=>setTimeout(refresh,100));
document.getElementById('ratioMonth')?.addEventListener('change',()=>setTimeout(refresh,0));
document.getElementById('loginForm')?.addEventListener('submit',()=>setTimeout(refresh,1400));
(async()=>{const s=await db.auth.getSession();if(s.data.session)refresh()})();
