// Pure calculation. Internal context must never be returned to staff.
export const VERSION='20261102.1';
export function number(value){if(value===null||value===undefined||value==='')return null;const n=Number(String(value).replace(/€/g,'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;}
export function extract(text=''){
 const p=[...text.matchAll(/(?:preis(?:\s+brutto)?|budget|gesamt(?:preis)?)\s*[:=]?\s*(\d{1,3}(?:[. ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)?/gi)].map(m=>number(m[1]));
 const portions=[...text.matchAll(/(\d{1,4})\s*(?:portionen|personen|gäste|gaste)/gi)].map(m=>Number(m[1]));
 return {portions:portions.length===1?portions[0]:null,customer_price:p.length===1?p[0]:null,wedding:/hochzeit|wedding/i.test(text)};
}
export function costRates(ledger,personnel,expenses,now=new Date()){
 // Completed months only; a partially imported month must not lower the recommendation.
 const current=now.toISOString().slice(0,7), months=new Map();
 function month(k){if(!k||k.slice(0,7)>current)return null;const key=k.slice(0,7);if(!months.has(key))months.set(key,{p:0,f:0,lp:0,lf:0});return months.get(key);}
 for(const x of ledger){if(x.verification_status!=='verified')continue;const m=month(x.month_start);if(m&&['personnel','fixed_costs'].includes(x.metric_key))m[x.metric_key==='personnel'?'lp':'lf']+=Math.abs(Number(x.amount)||0);}
 for(const x of personnel){const m=month(x.accounting_month);if(m)m.p+=Number(x.total_costs)||0;}
 for(const x of expenses){const m=month(x.accounting_month||x.expense_date);if(m&&['rent','energy','insurance','leasing','telecom','fixed_costs'].includes(x.category)&&x.net_amount!==null)m.f+=Number(x.net_amount)||0;}
 const values=[...months.entries()].filter(([k])=>k<current).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);const pending=months.get(current);
 const avg=(key)=>values.length?values.reduce((s,[,v])=>s+Math.max(v[key],v[key==='p'?'lp':'lf']),0)/values.length:0;
 // Productive hours are an explicit temporary assumption, never presented as measured.
 const p=Math.max(avg('p'),pending?.p||0,pending?.lp||0),f=Math.max(avg('f'),pending?.f||0,pending?.lf||0);if(pending)values.unshift([current,pending]);return {hourly:p>0?p/400:35,overheadHourly:f>0?f/400:8,months:values.map(([k])=>k),estimatedHours:400,hasPersonnel:p>0,hasFixed:f>0};
}
export function calculate(input,context){
 const portions=number(input.portions),cakes=number(input.cakes)??1;
 if(!portions||portions>2000||!Number.isInteger(portions)||!cakes||cakes>100||!Number.isInteger(cakes))throw Error('Portionen (1–2000) und Tortenanzahl (1–100) bitte prüfen.');
 const warnings=['Vorläufige Schätzung: Kapazitätsannahme, 20 % Zielmarge und 10 % Umsatzsteuer sind noch nicht betrieblich bestätigt.'];
 const wedding=!!input.wedding;
 let material=portions*1.8,packaging=3*cakes,minutes=(wedding?180:60)*cakes+portions*2;
 let recipeUsed=false;
 const recipe=context.recipe;
 if(recipe){
  const unit=String(recipe.yield_unit).toLowerCase();
  const factor=/torte/.test(unit)?cakes/Number(recipe.yield_qty):/stück|portion/.test(unit)?portions/Number(recipe.yield_qty):null;
  if(factor&&context.ingredients?.length){
   let total=0,valid=true;
   for(const row of context.ingredients){
    const catalog=context.catalog?.find(c=>c.id===row.matched_ingredient_id);
    // Never silently convert kg/g/l/ml: mismatched units require a reviewed recipe.
    const price=catalog&&catalog.canonical_unit===row.unit?number(catalog.current_price_net):number(row.fallback_price_net);
    if(price===null||!Number.isFinite(Number(row.quantity))||Number(row.quantity)<=0){valid=false;break;}
    if(!catalog||catalog.canonical_unit!==row.unit)warnings.push('Mindestens ein Zutatenpreis ist ein Rezeptur-Schätzwert.');
    total+=Number(row.quantity)*price;
   }
   if(valid){material=total*factor*(1+(number(recipe.setup_percent)??0)/100);packaging=(number(recipe.packaging_net)??0)*factor;minutes=Math.max(minutes,(number(recipe.labor_minutes)??0)*factor);recipeUsed=true;}
  }
 }
 if(!recipeUsed)warnings.push('Rezeptur fehlt oder ist unvollständig: Material und Verpackung vorläufig geschätzt.');
 if(recipeUsed)warnings.push('Rezepturmenge und Portionsgröße vor Angebot prüfen; Dekorzeit vorläufig geschätzt.');
 const manual=number(input.labor_minutes);if(manual!==null){if(manual<1||manual>100000)throw Error('Arbeitszeit bitte prüfen.');minutes=manual;}else warnings.push('Herstellungs- und Dekorzeit geschätzt.');
 const rates=context.rates;
 if(!rates.hasPersonnel||!rates.hasFixed)warnings.push('Kostenbasis unvollständig: fehlende Kosten durch Schätzsätze ergänzt.');
 const net=(material+packaging+minutes/60*(rates.hourly+rates.overheadHourly))/0.8;
 const gross=Math.ceil(net*1.1/5)*5;
 if(!Number.isFinite(gross)||gross<=0)throw Error('Keine belastbare Berechnung möglich.');
 const customer=number(input.customer_price);
 return {version:VERSION,status:'estimate',recommended_gross:gross,range_gross:[Math.ceil(gross*.9/5)*5,Math.ceil(gross*1.2/5)*5],customer_price:customer,difference_gross:customer===null?null:Math.round((gross-customer)*100)/100,portions,cakes,wedding,recipe_used:recipeUsed,assumptions:[...new Set(warnings)],calculated_at:new Date().toISOString(),cost_basis_months:rates.months};
}
export function similarOrders(input,orders){
 const tokens=String(input.text||'').toLowerCase().match(/[a-zäöüß]{5,}/g)||[];
 return orders.filter(o=>!!extract(o.details).wedding===!!input.wedding).map(o=>({o,score:tokens.filter(t=>String(o.details||'').toLowerCase().includes(t)).length})).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score).slice(0,3).map(({o})=>({occasion:o.occasion||'Torte',date:o.requested_date,customer_price:extract(o.details).customer_price}));
}
