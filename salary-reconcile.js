import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const eur=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-AT');
const status=t=>$('salaryPaymentStatus').textContent=t;
async function owner(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const member=window.GastroPilotBusiness.choose(m.data?.filter(v=>v.role==='owner'));
 if(!member)throw Error('Kein Inhaberzugriff für den gewählten Betrieb.');
 return member.business_id;
}
async function render(){
 try{
 const id=await owner(),month=$('personMonth').value||'2026-09';
 const [a,b]=await Promise.all([db.from('personnel_costs').select('*').eq('business_id',id).eq('accounting_month',month+'-01'),db.from('payroll_bank_payments').select('*').eq('business_id',id).eq('accounting_month',month+'-01')]);
 if(a.error)throw a.error;if(b.error)throw b.error;
 const box=$('salaryReconcileList');box.replaceChildren();
 const employees=a.data||[],payments=b.data||[];
 for(const x of employees){
  const paid=payments.filter(p=>norm(p.employee_name)===norm(x.employee_name)).reduce((v,p)=>v+Number(p.amount||0),0);
  const net=x.net_payable==null?null:Number(x.net_payable);
  const div=document.createElement('div');div.className='entry';
  const strong=document.createElement('strong');strong.textContent=x.employee_name+' · '+(net===null?'Nettoauszahlung fehlt':('Netto '+eur(net)));
  const small=document.createElement('small');small.textContent='Bankzahlungen '+eur(paid)+' · '+(net===null?'Abgleich nicht möglich':paid===0?'Noch keine Zahlung erfasst':paid+0.005<net?'Teilzahlung, offen '+eur(net-paid):paid>net+0.005?'Überzahlung oder Zuordnung prüfen: '+eur(paid-net):'Rechnerisch vollständig bezahlt (Bankbelege prüfen)');
  div.append(strong,small);box.append(div);
 }
 for(const p of payments.filter(p=>!employees.some(x=>norm(x.employee_name)===norm(p.employee_name)))){
  const div=document.createElement('div');div.className='entry';div.textContent='Nicht zugeordnet: '+p.employee_name+' · '+eur(Number(p.amount))+' · '+p.payment_date;box.append(div);
 }
 if(!employees.length)status('Für '+month+' sind noch keine Lohnabrechnungen gespeichert.');
 else status('Abgleich aktualisiert. Namen und Überweisungsbelege müssen übereinstimmen.');
 }catch(e){status('Abgleich nicht geladen: '+e.message)}
}
$('salaryPaymentForm').onsubmit=async ev=>{
 ev.preventDefault();
 try{
 const f=new FormData(ev.currentTarget);if(f.get('verified')!=='on')throw Error('Bitte Bankbeleg prüfen.');
 const id=await owner(),amount=Number(f.get('amount')),month=String(f.get('accounting_month'));
 if(!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}$/.test(month))throw Error('Ungültige Angaben.');
 const row={business_id:id,employee_name:String(f.get('employee_name')).trim(),accounting_month:month+'-01',payment_date:f.get('payment_date'),amount,bank_account:f.get('bank_account'),reference_text:f.get('reference_text')||null};
 if(!row.employee_name||!row.payment_date)throw Error('Bitte alle Pflichtfelder ausfüllen.');
 const dup=await db.from('payroll_bank_payments').select('id').eq('business_id',id).eq('accounting_month',row.accounting_month).eq('employee_name',row.employee_name).eq('payment_date',row.payment_date).eq('amount',row.amount).eq('bank_account',row.bank_account).limit(1);
 if(dup.error)throw dup.error;if(dup.data?.length)throw Error('Mögliche doppelte Überweisung – nicht nochmals gespeichert.');
 const result=await db.from('payroll_bank_payments').insert(row);if(result.error)throw result.error;
 ev.currentTarget.reset();ev.currentTarget.elements.accounting_month.value=month;await render();
 }catch(e){status('Nicht gespeichert: '+e.message)}
};
$('personMonth').addEventListener('change',render);
setTimeout(render,500);
