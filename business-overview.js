/* Startübersicht: ausschließlich Daten aus den freigegebenen Betrieben lesen. */
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const total=(rows,key)=>rows.length&&rows.every(row=>number(row[key])!==null)?rows.reduce((sum,row)=>sum+number(row[key]),0):null;
const euro=value=>value===null?'–':new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(value);
const percent=value=>value===null?'–':new Intl.NumberFormat('de-AT',{maximumFractionDigits:1,minimumFractionDigits:1}).format(value)+' %';
const TICKET_TARGETS={friedrich:22,judith:100};
function setProgress(track,progress){
 if(!track)return;
 const capped=Math.max(0,Math.min(100,progress??0));
 track.querySelector('.homeProgressFill').style.width=capped+'%';
 track.dataset.level=progress===null?'unknown':progress>=100?'complete':progress>=70?'high':progress>=50?'mid':'low';
 track.setAttribute('aria-valuetext',progress===null?'Umsatzdaten fehlen':percent(progress)+' erreicht');
 if(progress===null)track.removeAttribute('aria-valuenow');
 else track.setAttribute('aria-valuenow',String(Math.round(capped)));
}
// Vorläufige Referenz aus der Judith-Gesamtanalyse Jan–Jul 2026; bisher nicht erneut anhand der BWA geprüft.
export const JUDITH_PERSONNEL_REFERENCE={ratio:100*149196/298214,period:'Jan–Jul 2026'};
// Vorläufige Monatsziele brutto; bewusst getrennt von echten Ist-Zahlen.
// Judith: Personal 19.958,75 netto + Miete 4.130,11 netto + sonstige Fixkosten 3.000 netto,
// 26 % Wareneinsatz, 10 % USt angenommen. Friedrich: Personal 18.000 netto,
// Fixkosten rund 5.000 netto, 26 % Wareneinsatz und pauschal 15 % Misch-USt.
export const SALES_TARGETS={
 judith:{breakEven:60000,profit5000:60000,note:'Plan: September-Personal 19.958,75 €, Miete 4.130,11 €, sonstige Fixkosten 3.000 €, Wareneinsatz 26 %, angenommene USt 10 %.'},
 friedrich:{breakEven:50000,profit5000:50000,note:'Plan: Personal 18.000 €, Fixkosten rund 5.000 €, Wareneinsatz 26 %, angenommene Misch-USt 15 %. Noch nicht vollständig abgestimmt.'}
};
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
 const [salesResult,documentsResult,staffResult,costResult,ratioResult,summaryResult,planStaffResult,invoicesResult]=await Promise.all([
  db.from('bonit_daily_closings').select('closing_date,gross_amount,net_amount,receipt_count,raw_data').eq('business_id',businessId).gte('closing_date',start).lt('closing_date',end),
  db.from('documents').select('document_date,document_type,status,created_at,extracted_data').eq('business_id',businessId).gte('document_date',start).lt('document_date',end).in('document_type',['cash_report']),
  db.from('personnel_costs').select('total_costs').eq('business_id',businessId).eq('accounting_month',start),
  db.from('expenses').select('category,net_amount').eq('business_id',businessId).gte('expense_date',start).lt('expense_date',end).in('category',['food','drinks','beverages']),
  db.from('monthly_cost_ratio_inputs').select('net_revenue,inventory_change').eq('business_id',businessId).eq('month',start).maybeSingle(),
  ['2026-08','2026-09'].includes(month)?db.from('monthly_bonit_summaries').select('summary').eq('business_id',businessId).eq('month_start',start).maybeSingle():Promise.resolve({data:null,error:null}),
  db.from('personnel_costs').select('total_costs').eq('business_id',businessId).eq('accounting_month',previousMonthStart)
 ]);
 const sales=result(salesResult,'Umsätze'),documents=result(documentsResult,'Tagesabschlüsse');
 const staff=result(staffResult,'Personal'),costs=result(costResult,'Einkäufe'),planStaff=result(planStaffResult,'Personal Vormonat'),invoices=result(invoicesResult,'Ausgangsrechnungen');
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
 const dayCount=new Set([...days.keys(),...invoices.map(x=>x.service_date)]).size;\n return {gross,net,receipts,average,personnel,personnelPlan,goods,days:dayCount,paidDays:paidDays.length,hasSummary:gross!==null&&!!summary};
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
 let combined=document.getElementById('combinedGrossHome');
 if(!combined){
  combined=document.createElement('button');combined.id='combinedGrossHome';combined.type='button';combined.className='combinedGrossHome';
  combined.innerHTML='<span>Gesamtumsatz beider Betriebe · brutto</span><strong>–</strong><small hidden></small>';
  host.before(combined);
  combined.addEventListener('click',()=>{const detail=combined.querySelector('small');detail.hidden=!detail.hidden;combined.setAttribute('aria-expanded',String(!detail.hidden));});
 }
 const bothAllowed=['Friedrich','Judith'].every(name=>allowed.some(member=>member.businesses.name.includes(name)));
 combined.hidden=!bothAllowed;
 combined.querySelector('strong').textContent='Wird geladen …';
 combined.querySelector('small').hidden=true;
 combined.setAttribute('aria-expanded','false');
 combined.disabled=true;
 const cards=allowed.map(member=>{
  const name=member.businesses.name.includes('Friedrich')?'Das Friedrich':member.businesses.name.includes('Judith')?'Judith und die Torten':member.businesses.name;
  const card=document.createElement('button');card.type='button';card.className='homeBusiness';
  const heading=document.createElement('h2');heading.textContent=name;
  const hint=document.createElement('span');hint.className='homeHint';hint.textContent='Monatsdaten werden geladen …';
  const metrics=document.createElement('div');metrics.className='homeMetrics';
  const isJudith=name==='Judith und die Torten';
  const labels=['Umsatz brutto','Ø Bon','Personalquote · vorläufig','Wareneinkäufe · laufender Monat','Ø Personalquote im Jahr / Plan','Nettoumsatz','Belege','Personal · Vormonat (Plan)','Monatsziel · brutto','Zielerreichung · verbleibende Tage'];
  for(const label of labels){
   const box=document.createElement('div');box.className='homeMetric';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent='–';box.append(small,strong);
   if(label==='Ø Bon'){const target=document.createElement('span');target.className='homeTicketTarget';target.textContent='Soll '+euro(TICKET_TARGETS[isJudith?'judith':'friedrich']);box.append(target);}
   if(label.startsWith('Zielerreichung')||label==='Ø Bon'){const track=document.createElement('span');track.className='homeProgress';track.setAttribute('role','progressbar');track.setAttribute('aria-label',label==='Ø Bon'?'Ø Bon Soll erreicht':'Monatsziel erreicht');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');const fill=document.createElement('span');fill.className='homeProgressFill';track.append(fill);box.append(track);}
   metrics.append(box);
  }
  const goal=SALES_TARGETS[isJudith?'judith':'friedrich'];for(const [index,value] of [[metrics.children.length-2,goal.breakEven],[metrics.children.length-1,goal.profit5000]]){const box=metrics.children[index];box.querySelector('strong').textContent=euro(value);box.title=goal.note;}const action=document.createElement('span');action.className='homeOpen';action.textContent='Betrieb öffnen →';
  card.append(heading,hint,metrics,action);card.addEventListener('click',()=>onSelect(member));host.append(card);
  return {member,hint,values:[...metrics.querySelectorAll('strong')]};
 });
 const combinedRows=await Promise.all(cards.map(async({member,hint,values})=>{
  try{
   const isJudith=member.businesses.name.includes('Judith');
   const [data,history,purchaseRows,goalRow]=await Promise.all([loadBusinessMetrics(db,member.business_id,month,isJudith),loadPersonnelAverage(db,member.business_id,month),db.from('expenses').select('category,net_amount,expense_date,accounting_month').eq('business_id',member.business_id).in('category',['food','drinks','beverages']),db.from('gp_revenue_targets').select('target_monthly_gross,estimated_food_cost_pct').eq('business_id',member.business_id).maybeSingle()]);
   if(!host.isConnected||document.getElementById('homeMonth')?.value!==month)return;
   values[0].textContent=euro(data.gross);values[1].textContent=euro(data.average);
   const ticketTarget=TICKET_TARGETS[isJudith?'judith':'friedrich'];
   const ticketProgress=data.average===null?null:100*data.average/ticketTarget;
   const ticketBox=values[1].parentElement;
   ticketBox.querySelector('.homeTicketTarget').textContent='Soll '+euro(ticketTarget)+(ticketProgress===null?'':' · '+percent(ticketProgress));
   setProgress(ticketBox.querySelector('.homeProgress'),ticketProgress);
   const planRatio=history.exact===null&&data.personnelPlan!==null&&data.net>0?100*data.personnelPlan/data.net:null;
   const historicalReference=isJudith&&history.exact===null&&planRatio===null&&history.average===null;
   values[2].textContent=percent(history.exact??planRatio??history.average??(historicalReference?JUDITH_PERSONNEL_REFERENCE.ratio:null));
   const relevantPurchases=(purchaseRows.data||[]).filter(x=>String(x.accounting_month||x.expense_date||'').slice(0,7)===month);
   const purchaseNet=relevantPurchases.length&&relevantPurchases.every(x=>number(x.net_amount)!==null)?total(relevantPurchases,'net_amount'):null;
   const purchaseRatio=data.net>0&&purchaseNet!==null?100*purchaseNet/data.net:null;
   const target=number(goalRow.data?.estimated_food_cost_pct)??26;
   values[3].textContent=purchaseRatio===null?'Ist – / Ziel '+percent(target):'Ist '+percent(purchaseRatio)+' / Ziel '+percent(target);
   values[3].previousElementSibling.textContent='Wareneinkäufe · laufender Monat';
   values[3].title='Vorläufige Einkaufsquote: erfasste Netto-Wareneinkäufe / Nettoumsatz. Noch kein tatsächlicher Verbrauch; fehlende Rechnungen und Lagerbewegungen können die Quote verfälschen.';
   const monthlyTarget=number(goalRow.data?.target_monthly_gross)??(isJudith?60000:50000);
   const monthStart=new Date(Number(month.slice(0,4)),Number(month.slice(5,7))-1,1);
   const daysInMonth=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const remainingDays=month===today.slice(0,7)?Math.max(0,daysInMonth-Number(today.slice(8))):month<today.slice(0,7)?0:daysInMonth;
   const actual=number(data.gross),missing=actual===null?null:Math.max(0,monthlyTarget-actual);
   const progress=actual===null||monthlyTarget<=0?null:100*actual/monthlyTarget;
   values[values.length-2].textContent=euro(monthlyTarget);
   values[values.length-2].previousElementSibling.textContent='Monatsziel · brutto';
   values[values.length-1].textContent=progress===null?'–':percent(progress)+' erreicht'+(progress>=100?' ✓':'');
   values[values.length-1].previousElementSibling.textContent='Zielerreichung · '+remainingDays+' Kalendertage übrig';
   setProgress(values[values.length-1].parentElement.querySelector('.homeProgress'),progress);
   values[values.length-1].title=missing===null?'Umsatzdaten fehlen.':actual>=monthlyTarget?'Monatsziel erreicht.':euro(missing)+' fehlen zum Monatsziel; '+(remainingDays?euro(missing/remainingDays)+' pro verbleibendem Kalendertag.':'Monat abgelaufen.');
   values[values.length-2].title=missing===null?'Noch keine Umsätze erfasst.':euro(missing)+' fehlen zum Monatsziel.';
   values[4].textContent=percent(planRatio??history.average);
   values[5].textContent=euro(data.net);values[6].textContent=data.receipts===null?'–':new Intl.NumberFormat('de-AT').format(data.receipts);values[7].textContent=euro(data.personnelPlan);values[7].title='Personalkosten des Vormonats als Planwert; Ist-Kosten des ausgewählten Monats folgen mit der Abrechnung.';
   hint.textContent=data.gross===null?'Noch keine Umsätze erfasst':data.hasSummary?'Geprüfter Monatsabschluss':data.days+' Tag(e) erfasst · bisheriger Stand';
   values[1].previousElementSibling.textContent='Ø Bon';
   values[1].title=data.average===null?(isJudith?'Beleganzahl oder Umsatz fehlen.':'Bezahlte Bons und zugehöriger Umsatz fehlen.'):(isJudith?'Umsatz / Belege aus ':'Umsatz / bezahlte Bons aus ')+data.paidDays+' Tag(en).';
   values[2].previousElementSibling.textContent='Personalquote · vorläufig';
   values[2].title=planRatio!==null?'Personalkosten des Vormonats / bisher erfasster Nettoumsatz dieses Monats. Vorläufige Planquote, keine Ist-Lohnabrechnung dieses Monats.':historicalReference?'Vorläufige Referenz '+JUDITH_PERSONNEL_REFERENCE.period+': 149.196 € Personal / 298.214 € Nettoumsatz. Früherer Analysewert, nicht erneut gegen Original-BWA geprüft. Die exakte Monatsquote folgt nach dem Monatsabschluss.':history.exact===null?'Vorläufiger Durchschnitt aus '+history.count+' abgeschlossenen Monaten mit Nettoumsatz und Personalkosten. Die exakte Monatsquote folgt mit dem Monatsabschluss.':'Personalkosten dieses Monats / Nettoumsatz.';
   values[4].title=planRatio!==null?'Aktuelle Planquote: Personalkosten des Vormonats / bisher erfasster Nettoumsatz. Kein Jahresdurchschnitt.':'Arithmetischer Durchschnitt aus '+history.count+' abgeschlossenen Monaten mit Nettoumsatz und Personalkosten.';
   values[4].previousElementSibling.textContent='Ø Personalquote im Jahr / Plan';
   return {name:member.businesses.name,gross:data.gross};
  }catch(error){hint.textContent='Kennzahlen konnten nicht geladen werden';values[0].title=error.message;return null;}
 }));
 if(!bothAllowed||!host.isConnected||document.getElementById('homeMonth')?.value!==month)return;
 const friedrich=combinedRows.find(row=>row?.name.includes('Friedrich'));
 const judith=combinedRows.find(row=>row?.name.includes('Judith'));
 const valid=friedrich?.gross!==null&&friedrich?.gross!==undefined&&judith?.gross!==null&&judith?.gross!==undefined;
 combined.querySelector('strong').textContent=valid?euro(friedrich.gross+judith.gross):'–';
 combined.querySelector('small').textContent=valid?'Das Friedrich '+euro(friedrich.gross)+' + Judith und die Torten '+euro(judith.gross):'Für mindestens einen Betrieb fehlen die Bruttoumsätze dieses Monats.';
 combined.disabled=false;
}
