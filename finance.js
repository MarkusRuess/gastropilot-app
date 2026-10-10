import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://sjnwfwcpgwsavygewwzb.supabase.co','sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ');
const $=id=>document.getElementById(id);
const money=n=>n==null?'nicht vorhanden':new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(Number(n));
let read=false;
const fields={equity:'fsEquity',total_assets:'fsAssets',current_assets:'fsCurrentAssets',current_liabilities:'fsCurrentLiabilities',revenue:'fsRevenue',expenses:'fsExpenses',period_result:'fsResult'};
async function owner(){
 const a=await db.auth.getUser();if(a.error||!a.data.user)throw Error('Bitte anmelden.');
 const m=await db.from('business_members').select('business_id,role,businesses(name)').eq('user_id',a.data.user.id);
 if(m.error)throw m.error;
 const x=m.data?.find(z=>z.role==='owner'&&z.businesses?.name?.includes('Friedrich'));
 if(!x)throw Error('Kein Inhaberzugriff für Das Friedrich.');
 return x.business_id;
}
$('fsRead').onclick=async()=>{
 read=false;$('fsVerified').checked=false;
 const file=$('fsPdf').files?.[0];if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>15e6)return $('fsStatus').textContent='Bitte PDF bis 15 MB auswählen.';
 try{
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>80)throw Error('Maximal 80 Seiten.');
 const pages=[];
 for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const content=await p.getTextContent();pages.push(content.items.map(x=>x.str||'').join(' '))}
 const t=pages.join('\n--- SEITE ---\n');if(t.trim().length<30)throw Error('Kein lesbarer Text: gescannte PDFs werden noch nicht erkannt.');
 $('fsPreview').value=t.slice(0,60000);read=true;
 $('fsStatus').textContent='PDF lokal gelesen. Finanzwerte bitte anhand des Originals prüfen und eintragen; keine automatische Kontenzuordnung.';
 }catch(e){$('fsStatus').textContent='PDF nicht ausgelesen: '+e.message}
};
$('fsSave').onclick=async()=>{
 try{
 if(!read||!$('fsVerified').checked)throw Error('Bitte zuerst PDF auslesen und die Prüfung bestätigen.');
 const id=await owner(),date=$('fsDate').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Stichtag fehlt.');
 const row={business_id:id,statement_type:$('fsType').value,period_end:date};
 let count=0;
 for(const [column,el] of Object.entries(fields)){const val=$(el).value;row[column]=val===''?null:Number(val);if(val!==''){if(!Number.isFinite(row[column]))throw Error('Ungültige Zahl.');count++}}
 if(!count)throw Error('Bitte mindestens einen geprüften Wert eingeben.');
 const existing=await db.from('financial_statements').select('id').eq('business_id',id).eq('statement_type',row.statement_type).eq('period_end',date);
 if(existing.error)throw existing.error;
 if(existing.data?.length)throw Error('Dieser Dokumenttyp und Stichtag ist bereits gespeichert. Keine automatische Überschreibung.');
 const r=await db.from('financial_statements').insert(row);if(r.error)throw r.error;
 read=false;$('fsVerified').checked=false;
 $('fsStatus').textContent='Geprüfte Finanzwerte gespeichert.';await refresh();
 }catch(e){$('fsStatus').textContent='Nicht gespeichert: '+e.message}
};
async function refresh(){
 try{
 const id=await owner();const r=await db.from('financial_statements').select('*').eq('business_id',id).order('period_end',{ascending:false}).limit(30);
 if(r.error)throw r.error;
 const out=$('fsOverview');out.replaceChildren();
 for(const x of r.data||[]){
  const el=document.createElement('div');el.className='entry';
  const h=document.createElement('strong');h.textContent=(x.statement_type==='trial_balance'?'Saldenliste':'Jahresabschluss')+' · '+x.period_end;el.append(h);
  const q=x.total_assets!=null&&Number(x.total_assets)!==0&&x.equity!=null?(Number(x.equity)/Number(x.total_assets)*100).toFixed(1)+' %':'nicht berechenbar';
  const w=x.current_assets!=null&&x.current_liabilities!=null?money(Number(x.current_assets)-Number(x.current_liabilities)):'nicht berechenbar';
  const p=document.createElement('small');p.textContent='Eigenkapital '+money(x.equity)+' · Eigenkapitalquote '+q+' · Working Capital '+w+' · Ergebnis '+money(x.period_result);el.append(p);out.append(el);
 }
 }catch(e){$('fsStatus').textContent='Übersicht nicht geladen: '+e.message}
}
setTimeout(refresh,500);
