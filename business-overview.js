/* Startübersicht: ausschließlich Daten aus den freigegebenen Betrieben lesen. */
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const total=(rows,key)=>rows.length&&rows.every(row=>number(row[key])!==null)?rows.reduce((sum,row)=>sum+number(row[key]),0):null;
const euro=value=>value===null?'–':new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(value);
const percent=value=>value===null?'–':new Intl.NumberFormat('de-AT',{maximumFractionDigits:1,minimumFractionDigits:1}).format(value)+' %';
// Vorläufige Referenz aus der Judith-Gesamtanalyse Jan–Jul 2026; bisher nicht erneut anhand der BWA geprüft.
export const JUDITH_PERSONNEL_REFERENCE={ratio:100*149196/298214,period:'Jan–Jul 2026'};
const paidCount=raw=>{
 if(!raw||typeof raw!=='object')return null;
 for(const key of ['paid_receipt_count','paid_receipts','paidReceiptCount','paidReceipts','receipts_paid','paid_bons']){
  const value=number(raw[key]);if(Number.isInteger(value)&&value>=0)return value;
 }
 const parts=raw.payment_methods||raw.payments||raw.payment_breakdown;
 if(parts&&typeof parts==='object'){
  const cash=number(parts.cash?.count??parts.cash?.receipts??parts.bar?.count);
  const card=number(parts.card?.count??parts.card?.receipts??parts.karte?.count);
  if(cash!==null&&card!==null)return cash+card;
 }
 return null;
};
const monthEnd=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
const result=(value,context)=>{if(value.error)throw new Error(context+': '+value.error.message);return value.data||[];};

export async function loadBusinessMetrics(db,businessId,month,isJudith=false){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Ungültiger Monat.');
 const start=month+'-01',end=monthEnd(month);
 const previousMonthStart=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-2,1)).toISOString().slice(0,10);
 const [salesResult,documentsResult,staffResult,costResult,ratioResult,summaryResult,planStaffResult]=await Promise.all([
  db.from('bonit_daily_closings').select('closing_date,gross_amount,net_amount,receipt_count,raw_data').eq('business_id',businessId).gte('closing_date',start).lt('closing_date',end),
  db.from('documents').select('document_date,document_type,status,created_at,extracted_data').eq('business_id',businessId).gte('document_date',start).lt('document_date',end).in('document_type',['cash_report']),
  db.from('personnel_costs').select('total_costs').eq('business_id',businessId).eq('accounting_month',start),
  db.from('expenses').select('category,net_amount').eq('business_id',businessId).gte('expense_date',start).lt('expense_date',end).in('category',['food','drinks','beverages']),
  db.from('monthly_cost_ratio_inputs').select('net_revenue,inventory_change').eq('business_id',businessId).eq('month',start).maybeSingle(),
  ['2026-08','2026-09'].includes(month)?db.from('monthly_bonit_summaries').select('summary').eq('business_id',businessId).eq('month_start',start).maybeSingle():Promise.resolve({data:null,error:null}),
  isJudith?db.from('personnel_costs').select('total_costs').eq('business_id',businessId).eq('accounting_month',previousMonthStart):Promise.resolve({data:[],error:null})
 ]);
 const sales=result(salesResult,'Umsätze'),documents=result(documentsResult,'Tagesabschlüsse');
 const staff=result(staffResult,'Personal'),costs=result(costResult,'Einkäufe'),planStaff=result(planStaffResult,'Personal Vormonat');
 if(ratioResult.error)throw new Error('Monatswerte: '+ratioResult.error.message);
 if(summaryResult.error)throw new Error('Monatsabschluss: '+summaryResult.error.message);
 const days=new Map();
 for(const row of documents){
  if(!['reviewed','auto_imported'].includes(row.status))continue;
  const previous=days.get(row.document_date);
  if(previous&&previous.created_at>=row.created_at)continue;
  const raw=row.extracted_data||{};
  days.set(row.document_date,{gross:number(raw.gross_total),net:number(raw.net_total),receipts:number(raw.receipt_count),paid:isJudith?number(raw.receipt_count):paidCount(raw),created_at:row.created_at});
 }
 for(const row of sales)days.set(row.closing_date,{gross:number(row.gross_amount),net:number(row.net_amount),receipts:number(row.receipt_count),paid:isJudith?number(row.receipt_count):paidCount(row.raw_data)??days.get(row.closing_date)?.paid??null});
 const daily=[...days.values()],summary=summaryResult.data?.summary;
 const gross=number(summary?.gross)??total(daily,'gross');
 const net=number(ratioResult.data?.net_revenue)??number(summary?.net)??total(daily,'net');
 const receipts=total(daily,'receipts');
 const personnelPlan=planStaff.length?total(planStaff,'total_costs'):null;
 const paidDays=daily.filter(row=>row.paid!==null&&row.gross!==null);
 const paid=total(paidDays,'paid'),coveredGross=total(paidDays,'gross');
 const average=paid>0&&coveredGross!==null?coveredGross/paid:null;
 const staffAmount=total(staff,'total_costs');
 const personnel=net>0&&staffAmount!==null?100*staffAmount/net:null;
 const purchases=total(costs,'net_amount'),inventory=number(ratioResult.data?.inventory_change);
 const goods=net>0&&purchases!==null&&inventory!==null?100*(purchases+inventory)/net:null;
 return {gross,net,receipts,average,personnel,personnelPlan,goods,days:daily.length,paidDays:paidDays.length,hasSummary:gross!==null&&!!summary};
}

// Jahresdurchschnitt nur aus abgeschlossenen Monaten mit Nettoumsatz und Personalkosten.
export async function loadPersonnelAverage(db,businessId,month){
 const todayMonth=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Vienna'}).slice(0,7);
 const through=month<todayMonth?month:new Date(Date.UTC(Number(todayMonth.slice(0,4)),Number(todayMonth.slice(5,7))-1,1)).toISOString().slice(0,7);
 const start=month.slice(0,4)+'-01-01',end=monthEnd(through);
 if(through<month.slice(0,4)+'-01')return {average:null,count:0,exact:null};
 const [staffResult,ratioResult,summaryResult]=await Promise.all([
  db.from('personnel_costs').select('accounting_month,total_costs').eq('business_id',businessId).gte('accounting_month',start).lt('accounting_month',end),
  db.from('monthly_cost_ratio_inputs').select('month,net_revenue').eq('business_id',businessId).gte('month',start).lt('month',end),
  db.from('monthly_bonit_summaries').select('month_start,summary').eq('business_id',businessId).gte('month_start',start).lt('month_start',end)
 ]);
 const staff=result(staffResult,'Personalkosten im Jahresverlauf');
 const inputs=result(ratioResult,'Nettoumsatz im Jahresverlauf');
 const summaries=result(summaryResult,'Monatsabschlüsse im Jahresverlauf');
 const payroll=new Map(),revenues=new Map(),incomplete=new Set();
 for(const row of staff){const key=String(row.accounting_month).slice(0,7),cost=number(row.total_costs);if(cost===null)incomplete.add(key);else payroll.set(key,(payroll.get(key)||0)+cost)}
 for(const row of summaries){const net=number(row.summary?.net);if(net>0)revenues.set(String(row.month_start).slice(0,7),net)}
 for(const row of inputs){const net=number(row.net_revenue);if(net>0)revenues.set(String(row.month).slice(0,7),net)}
 const ratios=[...payroll].filter(([key])=>revenues.has(key)&&!incomplete.has(key)).map(([key,cost])=>({month:key,ratio:100*cost/revenues.get(key)}));
 return {average:ratios.length?ratios.reduce((sum,row)=>sum+row.ratio,0)/ratios.length:null,count:ratios.length,exact:ratios.find(row=>row.month===month)?.ratio??null};
}

export async function renderBusinessOverview(db,members,month,host,onSelect){
 host.replaceChildren();
 const allowed=(members||[]).filter(member=>member.business_id&&member.businesses?.name);
 const cards=allowed.map(member=>{
  const name=member.businesses.name.includes('Friedrich')?'Das Friedrich':member.businesses.name.includes('Judith')?'Judith und die Torten':member.businesses.name;
  const card=document.createElement('button');card.type='button';card.className='homeBusiness';
  const heading=document.createElement('h2');heading.textContent=name;
  const hint=document.createElement('span');hint.className='homeHint';hint.textContent='Monatsdaten werden geladen …';
  const metrics=document.createElement('div');metrics.className='homeMetrics';
  const isJudith=name==='Judith und die Torten';
  const labels=['Umsatz brutto','Ø bezahlter Bon','Personalquote','Wareneinsatzquote','Ø Personalquote im Jahr',...(isJudith?['Nettoumsatz','Belege','Personal · Vormonat (Plan)']:[])];
  for(const label of labels){
   const box=document.createElement('div');box.className='homeMetric';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent='–';box.append(small,strong);metrics.append(box);
  }
  const action=document.createElement('span');action.className='homeOpen';action.textContent='Betrieb öffnen →';
  card.append(heading,hint,metrics,action);card.addEventListener('click',()=>onSelect(member));host.append(card);
  return {member,hint,values:[...metrics.querySelectorAll('strong')]};
 });
 await Promise.all(cards.map(async({member,hint,values})=>{
  try{
   const isJudith=member.businesses.name.includes('Judith');
   const [data,history]=await Promise.all([loadBusinessMetrics(db,member.business_id,month,isJudith),loadPersonnelAverage(db,member.business_id,month)]);
   if(!host.isConnected||document.getElementById('homeMonth')?.value!==month)return;
   values[0].textContent=euro(data.gross);values[1].textContent=euro(data.average);
   const planRatio=isJudith&&history.exact===null&&data.personnelPlan!==null&&data.net>0?100*data.personnelPlan/data.net:null;
   const historicalReference=isJudith&&history.exact===null&&planRatio===null&&history.average===null;
   values[2].textContent=percent(history.exact??planRatio??history.average??(historicalReference?JUDITH_PERSONNEL_REFERENCE.ratio:null));values[3].textContent=percent(data.goods);
   values[4].textContent=percent(planRatio??history.average);
   if(isJudith){values[5].textContent=euro(data.net);values[6].textContent=data.receipts===null?'–':new Intl.NumberFormat('de-AT').format(data.receipts);values[7].textContent=euro(data.personnelPlan);values[7].title='Personalkosten des Vormonats als Planwert; Oktober-Ist-Kosten folgen mit der Abrechnung.';}
   hint.textContent=data.gross===null?'Noch keine Umsätze erfasst':data.hasSummary?'Geprüfter Monatsabschluss':data.days+' Tag(e) erfasst · bisheriger Stand';
   values[1].previousElementSibling.textContent=isJudith?'Ø Bon · Belege':'Ø bezahlter Bon';
   values[1].title=data.average===null?(isJudith?'Beleganzahl oder Umsatz fehlen.':'Bezahlte Bons und zugehöriger Umsatz fehlen.'):(isJudith?'Umsatz / Belege aus ':'Umsatz / bezahlte Bons aus ')+data.paidDays+' Tag(en).';
   values[2].previousElementSibling.textContent=planRatio!==null?'Personalquote · vorläufig (Plan)':historicalReference?'Personalquote · vorläufig (Jan–Jul)':history.exact===null?'Personalquote · vorläufig':'Personalquote · exakt';
   values[2].title=planRatio!==null?'Personalkosten des Vormonats / bisher erfasster Nettoumsatz dieses Monats. Vorläufig, keine Oktober-Ist-Kosten.':historicalReference?'Vorläufige Referenz '+JUDITH_PERSONNEL_REFERENCE.period+': 149.196 € Personal / 298.214 € Nettoumsatz. Früherer Analysewert, nicht erneut gegen Original-BWA geprüft. Die exakte Monatsquote folgt nach dem Monatsabschluss.':history.exact===null?'Vorläufiger Durchschnitt aus '+history.count+' abgeschlossenen Monaten mit Nettoumsatz und Personalkosten. Die exakte Monatsquote folgt mit dem Monatsabschluss.':'Personalkosten dieses Monats / Nettoumsatz.';
   values[4].title=planRatio!==null?'Aktuelle Planquote: Personalkosten des Vormonats / bisher erfasster Nettoumsatz. Kein Jahresdurchschnitt.':'Arithmetischer Durchschnitt aus '+history.count+' abgeschlossenen Monaten mit Nettoumsatz und Personalkosten.';
   values[4].previousElementSibling.textContent=planRatio!==null?'Ø Personalquote · vorläufiger Plan':'Ø Personalquote im Jahr · '+history.count+' Monate';
   values[3].title=data.goods===null?'Geprüfte Lagerveränderung, Netto-Einkäufe oder Nettoumsatz fehlen.':'Netto-Einkäufe plus Lagerveränderung / Nettoumsatz.';
  }catch(error){hint.textContent='Kennzahlen konnten nicht geladen werden';values[0].title=error.message;}
 }));
}
