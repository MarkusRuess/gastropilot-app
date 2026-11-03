// Pure local calculations. No AI calls and no writes to orders.
const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
export const detailText=o=>String(o.details||'').replace(/\\n/g,'\n');
export function cakeParts(order){
 const text=detailText(order);
 const explicit=text.split('\n').filter(l=>/^Backliste:/i.test(l.trim()));
 if(explicit.length)return explicit.map(line=>{const [q,size,flavour]=line.replace(/^\s*Backliste:\s*/i,'').split('|').map(clean);return {size:size||'Bitte prüfen',flavour:flavour||'Bitte prüfen',quantity:/^[1-9]\d*$/.test(q)?Number(q):null,review:!size||!flavour||!(/^[1-9]\d*$/.test(q))};});
 const body=text.split(/\n(?:Stückzahl|Vereinbarter Preis|Erfasst von|E-Mail laut Foto):/i)[0];
 const lines=body.split(/\n|;/).filter(l=>/\d\s*cm\b/i.test(l));
 const sizes=[...body.matchAll(/\b\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?\s*cm\b/gi)];
 const globalQ=text.match(/(?:^|\n)Stückzahl:\s*(\d+)\b/i);
 const flavours=s=>{const label=s.match(/(?:Geschmacksrichtung|Geschmack|Sorte|Füllung):\s*([^\n;]+)/i);if(label)return clean(label[1]);const matches=[...s.matchAll(/\b(?:Schwarzwälder(?:\s+Kirsch(?:torte)?)?|Biskuit[- ]Vanille|Prinzess(?:en)?[- ]?(?:torte)?|Sacher(?:torte)?|Punsch(?:torte)?|Schokoladen?(?:torte)?|Schoko(?:torte)?|Erdbeer(?:e|en|torte)?|Himbeer(?:e|en|torte)?|Vanille)\b/gi)].map(m=>clean(m[0]).replace(/sachertorte/i,'Sacher').replace(/prinzess(?:en)?[- ]?(?:torte)?/i,'Prinzess').replace(/punschtorte/i,'Punsch'));
 return [...new Set(matches.map(x=>x.toLocaleLowerCase('de')))].length===1?matches[0]:'Bitte prüfen';};
 if(sizes.length>1 && lines.length===sizes.length){return lines.map(l=>{const size=l.match(/\b\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?\s*cm\b/i)?.[0];const q=l.match(/^\s*(\d+)\s*(?:x|×|Torten?\b)/i);const flavour=flavours(l);return {size:clean(size),flavour,quantity:q?Number(q[1]):null,review:!q||flavour==='Bitte prüfen'};});}
 const size=sizes.length===1?clean(sizes[0][0]):'Bitte prüfen';const flavour=flavours(body);
 const inlineQ=body.match(/^\s*(\d+)\s*(?:x|×|Torten?\b)/i);
 const multi=/\b(?:mehrstöckig|zweistöckig|dreistöckig|\d+[- ]?(?:stöckig|Etagen))\b/i.test(body)||sizes.length>1;
 const quantity=multi?null:globalQ?Number(globalQ[1]):inlineQ?Number(inlineQ[1]):null;
 return [{size,flavour,quantity:quantity>0?quantity:null,review:multi||!quantity||size==='Bitte prüfen'||flavour==='Bitte prüfen'}];
}
export function weekRange(value){
 const m=/^(\d{4})-W(\d{2})$/.exec(value||'');if(!m)throw Error('Bitte gültige Kalenderwoche auswählen.');
 const year=Number(m[1]),week=Number(m[2]),jan4=new Date(Date.UTC(year,0,4));
 const monday=new Date(jan4);monday.setUTCDate(jan4.getUTCDate()-(jan4.getUTCDay()+6)%7+(week-1)*7);
 if(isoWeek(monday)!==value)throw Error('Diese Kalenderwoche existiert nicht.');
 const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
 return {start:monday.toISOString().slice(0,10),end:sunday.toISOString().slice(0,10),label:`KW ${week}/${year}`};
}
export function isoWeek(date){const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));d.setUTCDate(d.getUTCDate()+3-(d.getUTCDay()+6)%7);const year=d.getUTCFullYear();const first=new Date(Date.UTC(year,0,4));return year+'-W'+String(1+Math.round(((d-first)/86400000-3+(first.getUTCDay()+6)%7)/7)).padStart(2,'0');}
export function nextWeek(now=new Date()){const today=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)+'T12:00:00Z');today.setUTCDate(today.getUTCDate()+7);return isoWeek(today);}
export function buildBacklist(orders,value){const range=weekRange(value),groups=new Map(),checks=[],seen=new Set();let undated=0;
 for(const o of orders){if(o.id&&seen.has(o.id))continue;if(o.id)seen.add(o.id);if(!['confirmed','picked_up'].includes(o.status)||o.deleted_at||o.is_deleted||['cancelled','canceled','deleted'].includes(o.fulfillment_status))continue;
 if(!o.requested_date){undated++;continue;}if(o.requested_date<range.start||o.requested_date>range.end)continue;
 for(const p of cakeParts(o)){const key=p.size.toLocaleLowerCase('de').replace(/\s/g,'')+'|'+p.flavour.toLocaleLowerCase('de');const row=groups.get(key)||{size:p.size,flavour:p.flavour,quantity:0,unknown:0};if(p.quantity)row.quantity+=p.quantity;else row.unknown++;groups.set(key,row);if(p.review)checks.push({order:o,part:p});}}
 const rows=[...groups.values()].sort((a,b)=>a.size.localeCompare(b.size,'de',{numeric:true})||a.flavour.localeCompare(b.flavour,'de'));
 return {...range,rows,checks,undated,total:rows.reduce((s,r)=>s+r.quantity,0),unknown:rows.reduce((s,r)=>s+r.unknown,0)};
}
