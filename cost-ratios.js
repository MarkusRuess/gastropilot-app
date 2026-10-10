import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const pct=n=>new Intl.NumberFormat('de-AT',{maximumFractionDigits:1,minimumFractionDigits:1}).format(n)+' %';
async function owner(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const x=window.GastroPilotBusiness.choose(m.data?.filter(v=>v.role==='owner'));
 if(!x)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 return x.business_id;
}
async function refresh(){
 for(const id of ['ratioRevenue','ratioGoods','ratioStaff','ratioTotal'])$(id).textContent='–';
 try{
 const id=await owner(),month=$('ratioMonth').value,start=month+'-01';
 const [r,e,p]=await Promise.all([
 db.from('monthly_cost_ratio_inputs').select('*').eq('business_id',id).eq('month',start).maybeSingle(),
 db.from('expenses').select('category,net_amount,gross_amount,accounting_month,expense_date').eq('business_id',id).in('category',['food','drinks']),
 db.from('personnel_costs').select('total_costs,accounting_month').eq('business_id',id).eq('accounting_month',start)
 ]);
 for(const x of [r,e,p])if(x.error)throw x.error;
 const v=r.data,rev=v?.net_revenue==null?null:Number(v.net_revenue);
 const purchases=e.data.filter(x=>String(x.accounting_month||x.expense_date||'').startsWith(month));
 const missingNet=purchases.some(x=>x.net_amount==null);
 const purchaseNet=missingNet?null:purchases.reduce((sum,x)=>sum+Number(x.net_amount),0);
 const inventory=v?.inventory_change==null?null:Number(v.inventory_change);
 const goods=purchaseNet===null||inventory===null?null:purchaseNet+inventory;
 const staff=p.data.length?p.data.reduce((sum,x)=>sum+Number(x.total_costs||0),0):null;
 $('ratioRevenue').textContent=rev===null?'–':euro(rev);
 $('ratioGoods').textContent=rev>0&&goods!==null?pct(goods/rev*100):'–';
 $('ratioStaff').textContent=rev>0&&staff!==null?pct(staff/rev*100):'–';
 $('ratioTotal').textContent=rev>0&&goods!==null&&staff!==null?pct((goods+staff)/rev*100):'–';
 const reasons=[];
 if(rev===null)reasons.push('geprüfter Nettoumsatz fehlt');
 if(rev===0)reasons.push('Nettoumsatz ist null');
 if(!purchases.length)reasons.push('keine Wareneinkäufe erfasst');
 if(missingNet)reasons.push('Netto-Beträge bei Wareneinkäufen fehlen');
 if(inventory===null)reasons.push('Lagerveränderung fehlt');
 if(staff===null)reasons.push('Personalkosten fehlen');
 $('ratioExplanation').textContent=(reasons.length?'Noch unvollständig: '+reasons.join('; ')+'. ':'')+'Wareneinsatz: Netto-Wareneinkäufe plus Lagerveränderung. Personalkosten: Bruttolohn plus Dienstgeberkosten. Keine Schätzwerte; fehlende Rechnungen oder Lohnzettel können die Quoten verfälschen.';
 if(v){const form=$('ratioForm').elements;form.net_revenue.value=v.net_revenue??'';form.inventory_change.value=v.inventory_change??'';form.notes.value=v.notes??''}
 }catch(err){$('ratioExplanation').textContent='Kennzahlen konnten nicht geladen werden: '+err.message}
}
$('ratioForm').onsubmit=async ev=>{
 ev.preventDefault();
 try{
 const f=new FormData(ev.currentTarget);if(f.get('verified')!=='on')throw Error('Bitte Werte kontrollieren.');
 const id=await owner(),month=$('ratioMonth').value;
 if(!/^\d{4}-\d{2}$/.test(month))throw Error('Monat fehlt.');
 const revenue=Number(f.get('net_revenue'));if(!Number.isFinite(revenue)||revenue<0)throw Error('Nettoumsatz ungültig.');
 const inventory=f.get('inventory_change')===''?null:Number(f.get('inventory_change'));
 if(inventory!==null&&!Number.isFinite(inventory))throw Error('Lagerveränderung ungültig.');
 const row={business_id:id,month:month+'-01',net_revenue:revenue,inventory_change:inventory,notes:String(f.get('notes')||'')};
 const r=await db.from('monthly_cost_ratio_inputs').upsert(row,{onConflict:'business_id,month'});
 if(r.error)throw r.error;
 $('ratioStatus').textContent='Geprüfte Monatswerte gespeichert.';await refresh();
 }catch(err){$('ratioStatus').textContent='Nicht gespeichert: '+err.message}
};
$('ratioMonth').addEventListener('change',refresh);
setTimeout(refresh,500);
