// Read-only parsing of prices already stored in Judith AI order descriptions.
// Never guess a price or multiply an agreed total by the quantity.
const pricePattern=/(?:Vereinbarter\s+Preis(?:\s+brutto)?|Preis\s+brutto)\s*:\s*(\d{1,7}(?:[.,]\d{1,2})?)\s*(?:€|EUR)?(?=\s|$)/i;
const quantityPattern=/(?:Stückzahl|Menge)\s*:\s*(\d{1,5})(?=\s|$)/i;
const metadataPattern=/\s+(?:Stückzahl|Menge|Vereinbarter\s+Preis(?:\s+brutto)?|Preis\s+brutto|Erfasst\s+(?:von|am)|Kontaktangaben\s+fehlen)\s*:/i;
// Deterministic, read-only quantity extraction shared by photo/mail-derived orders.
// Explicit per-item quantities win over legacy single-order Stückzahl metadata.
const quantityWords={ein:1,eine:1,einen:1,einem:1,einer:1,zwei:2,drei:3,vier:4,fünf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,elf:11,zwölf:12};
const itemQuantityPattern=/(?:^|[\\s,;+])((?:\\d{1,4}|ein(?:e|en|em|er)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf))\\s*(?:x\\s*)?(Dosen?|Stück(?:e)?|Stk\\.?|Packungen?|Kartons?|Torten?|Cake\\s*Pops?|Küchlein|Kekse?)\\b/giu;
const unitNames={dose:'Dose',dosen:'Dose',stück:'Stück',stücke:'Stück',stk:'Stück',packung:'Packung',packungen:'Packung',karton:'Karton',kartons:'Karton',torte:'Torte',torten:'Torte',kekse:'Keks',keks:'Keks',küchlein:'Küchlein'};
export function orderItemQuantities(order){
 const details=String(order?.details||'').split(metadataPattern)[0];
 const result=[];const normalized=details.replace(/\\s+/g,' ').trim();
 const matches=[...normalized.matchAll(itemQuantityPattern)];
 for(let i=0;i<matches.length;i++){
  const match=matches[i];const token=match[1].toLowerCase();const count=/^\\d+$/.test(token)?Number(token):quantityWords[token];
  if(!Number.isSafeInteger(count)||count<1||count>1000)continue;
  const unit=unitNames[match[2].toLowerCase().replace(/\\.$/,'')]||match[2];
  const start=match.index+match[0].length;
  const end=i+1<matches.length?matches[i+1].index:normalized.length;
  const item=normalized.slice(start,end).replace(/^(?:\\s*(?:von|an|mit)\\s+)/i,'').replace(/(?:\\s+(?:und|plus|\\+)\\s*)$/i,'').replace(/^[\\s,;:+-]+|[\\s,;:+-]+$/g,'').trim();
  result.push({quantity:count,unit,product:item});
 }
 return result;
}
export function orderQuantityDisplay(order){
 const items=orderItemQuantities(order);
 if(items.length>=2)return items.map(x=>x.quantity+' '+x.unit+(x.product?' '+x.product:'')).join(' · ');
 if(items.length===1)return items[0].quantity+' '+items[0].unit+(items[0].product?' '+items[0].product:'');
 const details=String(order?.details||'');
 const saved=details.match(quantityPattern)?.[1];
 return saved?'Erfasste Menge: '+saved:null;
}
export function orderFacts(order){
 const details=String(order?.details||'').replace(/\s+/g,' ').trim();
 const quantity=details.match(quantityPattern)?.[1]||null;
 const raw=details.match(pricePattern)?.[1]||null;
 const parsed=raw===null?null:Number(raw.replace(',','.'));
 const price=parsed!==null&&Number.isFinite(parsed)&&parsed>0?parsed:null;
 const product=details.split(metadataPattern)[0].split(/\s+Kontaktangaben\s+fehlen\b/i)[0].replace(/[\s,;·-]+$/,'').trim();
 return {product:product||String(order?.occasion||'Tortendetails fehlen'),quantity,price};
}
export function orderValueSummary(orders){
 const seen=new Set();let cents=0,count=0,missing=0;
 for(const order of orders||[]){
  if(!order||order.archived_at||!['confirmed','picked_up'].includes(order.status)||!order.id||seen.has(order.id))continue;
  seen.add(order.id);
  const price=orderFacts(order).price;
  if(price===null){missing++;continue}
  cents+=Math.round(price*100);count++;
 }
 return {total:cents/100,count,missing};
}
