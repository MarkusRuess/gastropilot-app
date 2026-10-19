// Shared bank-payment classifier for every GastroPilot cost screen.
export const BANK_FIXED_COST_LABELS={rent:'Miete',energy:'Strom & Energie',telephone:'Telefon',internet:'Internet',insurance:'Betriebliche Versicherungen',other:'Weitere Fixkosten'};
const norm=s=>String(s||'').toLocaleLowerCase('de-AT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
function classifyBankPayment(x){
 const payee=norm(x.payee),desc=norm(x.description),cat=norm(x.category);
 if(cat==='rent'||/immobilien baden|miete/.test(payee+' '+desc))return 'rent';
 if(cat==='energy'||/wien energie|evn|stadtwerke/.test(payee))return 'energy';
 if(cat==='internet'||/easyname|internet/.test(payee))return 'internet';
 if(['telephone','telecom'].includes(cat)||/hutchison|t.mobile|magenta telekom/.test(payee))return 'telephone';
 const businessInsurance=/betriebshaft|betriebsve|rechtsschutz.*brot wasser|haftpflich?t.*brot wasser/.test(desc);
 const personalInsurance=/\bleben\b|unfall.*(markus|ruess)|ruess.*markus/.test(desc);
 if(!personalInsurance&&businessInsurance)return 'insurance';
 if(cat==='insurance'&&!personalInsurance&&businessInsurance)return 'insurance';
 if(cat==='accounting'||/steuerberatung|steuerberater|lmg steuer/.test(payee))return 'other';
 if(cat==='payment_processing'||/hobex/.test(payee))return 'other';
 if(/^(kontofuehrung|buchungsentgelt|rahmenprovision|umsatzprovision|sollzinsen)$/.test(payee))return 'other';
 return null;
}
function normalizeCostCategory(value){
 const c=norm(value);
 if(['rent','energy','telephone','internet','insurance','other'].includes(c))return c;
 if(['telecom'].includes(c))return 'telephone';
 if(['accounting','payment_processing'].includes(c))return 'other';
 return null;
}
function costKey(x){
 const amount=Math.abs(Number(x.amount)||0).toFixed(2),date=String(x.booking_date||'').slice(0,10),payee=norm(x.payee),account=norm(x.account_name);
 return [date,account,payee,amount].join('|');
}
export async function loadBankFixedCosts(db,businessId,start,end){
 const [tx,fixed]=await Promise.all([
  db.from('bank_transactions').select('business_id,account_name,booking_date,payee,description,amount,category,source_hash').eq('business_id',businessId).gte('booking_date',start).lt('booking_date',end).lt('amount',0).limit(5000),
  db.from('bank_fixed_costs').select('business_id,account_name,booking_date,payee,amount,category,reference_text,source_hash').eq('business_id',businessId).gte('booking_date',start).lt('booking_date',end).limit(2000)
 ]);
 if(tx.error)return {data:null,error:tx.error};
 if(fixed.error)return {data:null,error:fixed.error};
 const rows=[],seenHashes=new Set(),seenKeys=new Set();
 const add=row=>{
  const hash=String(row.source_hash||'');
  const key=costKey(row);
  if((hash&&seenHashes.has(hash))||seenKeys.has(key))return;
  if(hash)seenHashes.add(hash);seenKeys.add(key);
  rows.push({...row,amount:Math.abs(Number(row.amount)||0),source:row.source||'Bankbeleg'});
 };
 for(const x of tx.data||[]){
  const category=classifyBankPayment(x);if(!category)continue;
  add({...x,category,source:'Bankbeleg'});
 }
 for(const x of fixed.data||[]){
  const category=normalizeCostCategory(x.category)||'other';
  add({...x,category,description:x.reference_text||'',source:'Bestätigte Fixkosten'});
 }
 return {data:rows,error:null};
}
