import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(Number(v));
let businessId=null;
async function context(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const b=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(b.error)throw b.error;
 const member=window.GastroPilotBusiness.choose((b.data||[]).filter(x=>x.role==='owner'));
 if(!member)throw Error('Nur für Betriebsinhaber freigegeben.');
 businessId=member.business_id;return a.data.user;
}
function msg(t){$('gpWorkStatus').textContent=t}
function item(parent,title,detail){
 const d=document.createElement('div');d.className='entry';
 const strong=document.createElement('strong');strong.textContent=title;
 const small=document.createElement('small');small.textContent=detail;d.append(strong,small);parent.append(d);return d;
}
async function archive(){
 const user=await context();
 const r=await db.from('management_originals').select('*').eq('business_id',businessId).order('uploaded_at',{ascending:false}).limit(100);
 if(r.error)throw r.error;
 const root=$('gpOriginalList');root.replaceChildren();
 for(const x of r.data){
  const row=item(root,x.file_name,x.kind+' · '+new Date(x.uploaded_at).toLocaleDateString('de-AT'));
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Original sicher öffnen';
  btn.onclick=async()=>{
   const u=await db.storage.from('management-originals').createSignedUrl(x.storage_path,60);
   if(u.error)return msg(u.error.message);
   window.open(u.data.signedUrl,'_blank','noopener,noreferrer');
  };row.append(btn);
 }
 if(!r.data.length)item(root,'Noch keine Originale','Hier werden künftig hochgeladene Unterlagen dauerhaft privat archiviert.');
}
$('gpOriginalUpload').onclick=async()=>{
 const btn=$('gpOriginalUpload');btn.disabled=true;
 let path=null;
 try{
  const user=await context(),file=$('gpOriginalFile').files?.[0],kind=$('gpOriginalKind').value;
  if(!file)throw Error('Bitte zuerst eine Datei auswählen.');
  if(file.size>20*1024*1024||file.size===0)throw Error('Maximal 20 MB je Datei.');
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Nur PDF, JPG, PNG oder WebP erlaubt.');
  const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  path=businessId+'/'+crypto.randomUUID()+'.'+ext;
  const up=await db.storage.from('management-originals').upload(path,file,{contentType:file.type,upsert:false});
  if(up.error)throw up.error;
  const ins=await db.from('management_originals').insert({business_id:businessId,uploaded_by:user.id,kind,file_name:file.name,storage_path:path,file_size:file.size});
  if(ins.error)throw ins.error;
  $('gpOriginalFile').value='';msg('Original sicher gespeichert.');await archive();
 }catch(e){
  if(path)await db.storage.from('management-originals').remove([path]);
  msg('Archivierung fehlgeschlagen: '+e.message);
 }finally{btn.disabled=false}
};
async function reconcile(){
 await context();
 const [b,e,m]=await Promise.all([
  db.from('bank_transactions').select('*').eq('business_id',businessId).order('booking_date',{ascending:false}).limit(1000),
  db.from('expenses').select('*').eq('business_id',businessId).limit(1000),
  db.from('bank_invoice_matches').select('*').eq('business_id',businessId).limit(1000)
 ]);
 for(const [name,r] of [['Bankbuchungen',b],['Rechnungen',e],['Zuordnungen',m]])if(r.error)throw Error(name+': '+r.error.message);
 const used=new Map(),matchedExpenses=new Set();
 for(const x of m.data){used.set(x.bank_transaction_id,(used.get(x.bank_transaction_id)||0)+Number(x.matched_amount));matchedExpenses.add(x.expense_id)}
 const root=$('gpMatchList');root.replaceChildren();
 let suggested=0;
 for(const tx of b.data.filter(x=>Number(x.amount)<0)){
  const remaining=Math.round((-Number(tx.amount)-(used.get(tx.id)||0))*100)/100;
  if(remaining<=0.009)continue;
  const candidates=e.data.filter(x=>!matchedExpenses.has(x.id)&&Math.abs(Number(x.gross_amount)-remaining)<0.01);
  const row=item(root,tx.booking_date+' · '+eur(-Number(tx.amount))+' · '+(tx.payee||'Ohne Empfänger'),candidates.length?'Mögliche Rechnungen mit gleichem Bruttobetrag – bitte anhand der Originale prüfen.':'Keine eindeutige Betragsübereinstimmung. Bitte manuell prüfen.');
  if(candidates.length){suggested++;
   const sel=document.createElement('select');
   const empty=document.createElement('option');empty.value='';empty.textContent='Rechnung auswählen';sel.append(empty);
   for(const x of candidates){const opt=document.createElement('option');opt.value=x.id;opt.textContent=(x.supplier||x.description||'Rechnung')+' · '+eur(x.gross_amount)+' · '+(x.expense_date||'');sel.append(opt)}
   const button=document.createElement('button');button.type='button';button.textContent='Nach Prüfung zuordnen';
   button.onclick=async()=>{
    if(!sel.value)return msg('Bitte eine Rechnung auswählen.');
    if(!window.confirm('Bankbuchung und Originalrechnung auf Empfänger, Betrag und Verwendungszweck geprüft?'))return;
    button.disabled=true;
    try{
     const user=await context();
     const ins=await db.from('bank_invoice_matches').insert({business_id:businessId,bank_transaction_id:tx.id,expense_id:sel.value,matched_amount:remaining,verified_by:user.id});
     if(ins.error)throw ins.error;
     msg('Prüfzuordnung gespeichert. Zahlungsstatus wird nicht automatisch geändert.');await reconcile();
    }catch(err){msg(err.message);button.disabled=false}
   };
   row.append(sel,button);
  }
 }
 $('gpMatchSummary').textContent=b.data.length+' Bankbuchungen · '+e.data.length+' Rechnungen · '+m.data.length+' geprüfte Zuordnungen · '+suggested+' Buchungen mit Betragsvorschlag.';
 if(!b.data.length)item(root,'Noch keine Bankbuchungen','Bitte Bankbuchungen zuerst im Chef-Dashboard erfassen.');
}
$('gpMatchRefresh').onclick=()=>reconcile().catch(e=>msg(e.message));
$('gpOriginalRefresh').onclick=()=>archive().catch(e=>msg(e.message));
function parseMoney(v){const clean=v.replace(/\s/g,'').replace(/\./g,'').replace(',','.');const n=Number(clean);return Number.isFinite(n)?n:null}
$('gpBankDetect').onclick=()=>{
 const text=$('ctlText').value||'',rows=text.split(/\n/),root=$('gpDetected');root.replaceChildren();
 let count=0;
 for(const line of rows){
  const date=line.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  const amounts=[...line.matchAll(/(?<!\d)([-+]?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\d+,\d{2})(?!\d)/g)];
  if(!date||amounts.length!==1)continue;
  const amount=parseMoney(amounts[0][1]);if(amount===null)continue;
  const iso=date[3]+'-'+date[2]+'-'+date[1];
  const description=line.replace(date[0],'').replace(amounts[0][0],'').trim();
  const d=item(root,iso+' · '+eur(amount),description||'Beschreibung fehlt');
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='In Prüfformular übernehmen';
  button.onclick=()=>{
   const form=$('ctlBankForm');form.elements.booking_date.value=iso;
   form.elements.amount.value=amount;
   form.elements.description.value=description.slice(0,500);
   form.elements.payee.value='';
   form.elements.category.value='unassigned';
   form.elements.verified.checked=false;
   form.scrollIntoView({behavior:'auto',block:'start'});
  };d.append(button);count++;
 }
 if(!count)item(root,'Keine eindeutig erkennbaren Zeilen','Nur Textzeilen mit genau einem Datum (TT.MM.JJJJ) und einem Betrag werden vorgeschlagen. Andere Banklayouts und Scans müssen manuell geprüft werden.');
 msg(count+' mögliche Bankbuchungen erkannt. Keine automatische Speicherung; jede Buchung einzeln prüfen.');
};
document.addEventListener('click',e=>{
 if(e.target.closest('[data-page="control"]'))setTimeout(()=>reconcile().catch(err=>msg(err.message)),200);
 if(e.target.closest('[data-page="finance"]'))setTimeout(()=>archive().catch(err=>msg(err.message)),200);
});
setTimeout(()=>{archive().catch(()=>{});reconcile().catch(()=>{})},1100);
