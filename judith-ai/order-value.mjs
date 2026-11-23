// Read-only parsing of prices already stored in Judith AI order descriptions.
// Never guess a price or multiply an agreed total by the quantity.
const pricePattern=/(?:Vereinbarter\s+Preis(?:\s+brutto)?|Preis\s+brutto)\s*:\s*(\d{1,7}(?:[.,]\d{1,2})?)\s*(?:€|EUR)?(?=\s|$)/i;
const quantityPattern=/(?:Stückzahl|Menge)\s*:\s*(\d{1,5})(?=\s|$)/i;
const metadataPattern=/\s+(?:Stückzahl|Menge|Vereinbarter\s+Preis(?:\s+brutto)?|Preis\s+brutto|Erfasst\s+(?:von|am)|Kontaktangaben\s+fehlen)\s*:/i;
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
