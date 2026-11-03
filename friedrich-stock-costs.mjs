const goods=new Set(['food','beverage','drinks','coffee','merchandise']);
export function purchaseCost(lines){
 let net=0;const warnings=[];
 for(const l of lines){const x=l.raw_data||{};if(l.state==='conflict'||l.state==='review'){warnings.push('Ungeprüfte Position: '+l.name);continue;}if(l.state==='excluded')continue;
 if(!goods.has(x.category)){warnings.push('Kostenstelle offen: '+l.name);continue;}
 const n=x.line_net??(typeof x.line_gross==='number'&&typeof x.tax_rate==='number'?x.line_gross/(1+x.tax_rate/100):null);
 if(typeof n!=='number'||!Number.isFinite(n)){warnings.push('Netto-EK fehlt: '+l.name);continue;}net+=n;
 }return {net,warnings};
}
export function actualCost({opening,closing,purchases,revenue,complete,ended}){
 const warnings=[...purchases.warnings];
 if(!complete)warnings.push('Vollständigkeit der Einkaufsbelege nicht bestätigt.');
 if(!ended)warnings.push('Monat noch nicht abgeschlossen.');
 for(const [title,rows] of [['Anfangsinventur',opening],['Endinventur',closing]])if(!rows.length||rows.some(x=>!x.physical||!Number.isFinite(x.value)||x.value<0))warnings.push(title+' oder Netto-Bewertung unvollständig.');
 const ready=!warnings.length,cost=ready?opening.reduce((s,x)=>s+x.value,0)+purchases.net-closing.reduce((s,x)=>s+x.value,0):null;
 if(cost!==null&&cost<-.01)warnings.push('Negativer Wareneinsatz: Inventuren/Einkäufe prüfen.');
 const actual=warnings.length?null:cost;
 const ratio=actual!==null&&typeof revenue==='number'&&revenue>0?actual/revenue*100:null;
 if(revenue===null)warnings.push('Nettoumsatz unvollständig.');
 return {cost:actual,ratio,deviation:ratio===null?null:ratio-26,warnings};
}
