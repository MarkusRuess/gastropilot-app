// Deterministic local interpretation; never calls AI or writes an order.
const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
const unknown=s=>!clean(s)||/^(?:bitte prüfen|unklar|offen|unbekannt|keine Angabe|nicht angegeben|\?)$/i.test(clean(s));
const sizeName=s=>clean(s).replace(/(\d)\s*cm\b/gi,'$1 cm').replace(/(\d)\s*[x×]\s*(?=\d)/g,'$1 × ');
const flavourName=s=>{const x=clean(s);for(const [re,name] of [[/^sacher(?:torte)?$/i,'Sacher'],[/^prinzess(?:en)?[- ]?(?:torte)?$/i,'Prinzess'],[/^punsch(?:torte)?$/i,'Punsch'],[/^schoko(?:laden?)?(?:torte)?$/i,'Schokolade'],[/^erdbeer(?:e|en|torte)?$/i,'Erdbeere'],[/^himbeer(?:e|en|torte)?$/i,'Himbeere']])if(re.test(x))return name;return x;};
export const detailText=o=>String(o.details||'').replace(/\\n/g,'\n');
export function parseFillings(value){const text=clean(value);if(unknown(text))return null;if(/^(?:keine(?: Füllung)?|ohne(?: Füllung)?|ungefüllt)$/i.test(text))return [];if(/\b(?:oder|eventuell|vielleicht)\b|\?/i.test(text))return null;const parts=text.split(/\s*(?:\+|;|,|\/|\bund\b|&)\s*/i).map(clean).filter(Boolean);return parts.length?[...new Map(parts.map(s=>[s.toLocaleLowerCase('de'),s])).values()]:null;}
function fillingFromText(text){const label=text.match(/(?:^|[\n;,])\s*Füllung(?:en)?\s*:\s*([^\n;]+)/i)||text.match(/gefüllt mit\s+([^\n;.]+)/i)||text.match(/mit\s+([^\n;.]+?)\s+gefüllt/i);return label?parseFillings(label[1]):null;}
function finish(size,flavour,quantity,fillings){size=unknown(size)?'Bitte prüfen':sizeName(size);flavour=unknown(flavour)?'Bitte prüfen':flavourName(flavour);quantity=/^[1-9]\d*$/.test(String(quantity))&&Number.isSafeInteger(Number(quantity))?Number(quantity):null;const missing=[];if(size==='Bitte prüfen')missing.push('Tortengröße');if(flavour==='Bitte prüfen')missing.push('Geschmacksrichtung');if(fillings===null)missing.push('Füllung');if(quantity===null)missing.push('Anzahl');return {size,flavour,quantity,fillings,missing,review:missing.length>0};}
export function cakeParts(order){
 const text=detailText(order),explicit=text.split('\n').filter(l=>/^\s*Backliste:/i.test(l));
 if(explicit.length)return explicit.map(line=>{const [q,size,flavour,filling]=line.replace(/^\s*Backliste:\s*/i,'').split('|').map(clean);return finish(size,flavour,q,filling!==undefined?parseFillings(filling):explicit.length===1?fillingFromText(text):null);});
 const body=text.split(/\n(?:Stückzahl|Vereinbarter Preis|Erfasst von|E-Mail laut Foto):/i)[0];
 const sizePattern=/\b\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?\s*cm\b/gi;
 const lines=body.split(/\n|;/).filter(l=>/\d\s*cm\b/i.test(l)),sizes=[...body.matchAll(sizePattern)];
 const flavours=s=>{const label=s.match(/(?:Geschmacksrichtung|Geschmack|Sorte|Boden):\s*([^\n;]+)/i);if(label)return clean(label[1]);const content=s.replace(/Füllung(?:en)?:[^\n;]+/gi,'');const matches=[...content.matchAll(/\b(?:Schwarzwälder(?:\s+Kirsch(?:torte)?)?|Biskuit[- ]Vanille|Prinzess(?:en)?[- ]?(?:torte)?|Sacher(?:torte)?|Punsch(?:torte)?|Schokoladen?(?:torte)?|Schoko(?:torte)?|Erdbeer(?:e|en|torte)?|Himbeer(?:e|en|torte)?|Vanille)\b/gi)].map(m=>flavourName(m[0]));return new Set(matches.map(x=>x.toLocaleLowerCase('de'))).size===1?matches[0]:'';};
 if(sizes.length>1&&lines.length===sizes.length)return lines.map(l=>{const q=l.match(/^\s*(\d+)\s*(?:x|×|Torten?\b)/i);return finish(l.match(sizePattern)?.[0],flavours(l),q?.[1],fillingFromText(l));});
 const q=text.match(/(?:^|\n)Stückzahl:\s*(\d+)\b/i)||body.match(/^\s*(\d+)\s*(?:x|×|Torten?\b)/i),multi=/\b(?:mehrstöckig|zweistöckig|dreistöckig|\d+[- ]?(?:stöckig|Etagen))\b/i.test(body)||sizes.length>1;
 return [finish(sizes.length===1?sizes[0][0]:'',flavours(body),multi?null:q?.[1],fillingFromText(text))];
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

export function shiftWeek(value,direction){const range=weekRange(value),date=new Date(range.start+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+direction*7);return isoWeek(date);}
export function weekTitle(value){const r=weekRange(value),a=new Date(r.start+'T12:00:00Z'),b=new Date(r.end+'T12:00:00Z'),fmt=d=>d.toLocaleDateString('de-AT',{day:'2-digit',month:'long',timeZone:'UTC'});const dates=a.getUTCMonth()===b.getUTCMonth()?String(a.getUTCDate()).padStart(2,'0')+'.–'+fmt(b):fmt(a)+'–'+fmt(b);return 'KW '+Number(value.slice(-2))+' · '+dates+' '+b.getUTCFullYear();}
export function isProductionOrder(o){return o.status==='confirmed'&&!o.picked_up_at&&!o.deleted_at&&!o.is_deleted&&!['cancelled','canceled','deleted','picked_up'].includes(o.fulfillment_status);}
export function buildBacklist(orders,value){const range=weekRange(value),groups=new Map(),fills=new Map(),checks=[],seen=new Set();let undated=0,pending=0;
 for(const o of orders){if(o.id&&seen.has(o.id))continue;if(o.id)seen.add(o.id);if(!isProductionOrder(o))continue;if(!o.requested_date){undated++;checks.push({order:o,missing:['Abholdatum'],parts:[]});continue;}if(o.requested_date<range.start||o.requested_date>range.end)continue;
 const parts=cakeParts(o),missing=new Set();for(const p of parts){p.missing.forEach(x=>missing.add(x));if(p.quantity&&p.size!=='Bitte prüfen'&&p.flavour!=='Bitte prüfen'){const key=p.size.toLocaleLowerCase('de').replace(/\s/g,'')+'|'+p.flavour.toLocaleLowerCase('de'),row=groups.get(key)||{size:p.size,flavour:p.flavour,quantity:0};row.quantity+=p.quantity;groups.set(key,row);}else pending++;
 if(p.quantity&&p.fillings)for(const filling of p.fillings){const key=filling.toLocaleLowerCase('de'),row=fills.get(key)||{filling,quantity:0};row.quantity+=p.quantity;fills.set(key,row);}}
 if(missing.size)checks.push({order:o,missing:[...missing],parts});}
 return {...range,rows:[...groups.values()].sort((a,b)=>a.size.localeCompare(b.size,'de',{numeric:true})||a.flavour.localeCompare(b.flavour,'de')),fillings:[...fills.values()].sort((a,b)=>a.filling.localeCompare(b.filling,'de')),checks,undated,pending,unknown:pending,total:[...groups.values()].reduce((s,r)=>s+r.quantity,0)};
}
export function orderFilterStage(o){if(['cancelled','canceled','deleted'].includes(o.fulfillment_status))return o.fulfillment_status;if(o.status==='picked_up'||o.picked_up_at)return 'picked_up';if(o.status==='confirmed')return ['in_progress','ready'].includes(o.fulfillment_status)?o.fulfillment_status:'confirmed';return o.status==='inquiry'?'inquiry':o.status;}
export function filterOrders(orders,customers,{stage='current',name='',date='',today}={}){const term=clean(name).toLocaleLowerCase('de');return orders.filter(o=>{const state=orderFilterStage(o);if(stage==='current'&&(state==='picked_up'||['cancelled','canceled','deleted'].includes(state)||!date&&o.requested_date&&o.requested_date<today))return false;if(!['current','all'].includes(stage)&&state!==stage)return false;if(date&&o.requested_date!==date)return false;return !term||clean(customers.get(o.customer_id)?.name).toLocaleLowerCase('de').includes(term);});}
