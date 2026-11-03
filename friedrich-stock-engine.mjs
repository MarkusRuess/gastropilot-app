export const FRIEDRICH='6a5484d1-daf6-4263-897d-24cdf536aa29';
export const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
// Only explicit existing packaging data, never a default bottle volume.
export function litresInLabel(label){
 const m=String(label||'').match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(ml|cl|l|liter)\b/i);
 return m?Math.round(Number(m[1].replace(',','.'))*({ml:.001,cl:.01,l:1,liter:1}[m[2].toLowerCase()])*1e9)/1e9:null;
}
export function countingInfo(x,original={},lines=[]){
 const bottle=/flasch/i.test((original.unit||'')+' '+(x.pack_label||''))||['829bea07-8d63-42ba-9c9c-be0503e166c7','87dd191f-3ee0-40fb-a72e-600cd57eaa6a'].includes(x.item_id);
 if(!bottle)return {...x,count_unit:x.unit,count_factor:1,bottle:false,bottle_sizes:[]};
 if(x.unit!=='l')return {...x,count_unit:'volle Flaschen',count_factor:1,bottle:true,bottle_sizes:[]};
 const documented=litresInLabel(x.pack_label)||litresInLabel(original.unit);
 const sizes=documented?[documented]:[...new Set(lines.filter(l=>l.source_kind==='delivery'&&l.state!=='excluded'&&(l.item_id===x.item_id||x.item_id==='87dd191f-3ee0-40fb-a72e-600cd57eaa6a'&&/^aperol\b/i.test(l.name||''))).map(l=>litresInLabel(l.raw_data?.pack_label)||litresInLabel(l.raw_data?.name||l.name)).filter(v=>v>0))].sort((a,b)=>a-b);
 return {...x,bottle:true,count_unit:'volle Flaschen',count_factor:sizes.length===1?sizes[0]:null,bottle_sizes:sizes};
}
export function countedQuantity(x,value,size){
 const n=number(value),factor=x.count_factor??number(size);
 if(n===null||n<0||x.bottle&&!Number.isInteger(n))throw Error('Bitte die Anzahl voller Flaschen als ganze Zahl ab 0 eingeben.');
 if(n===0)return 0; // Confirmed empty is independent of bottle volume.
 if(factor===null||factor<=0)throw Error('Flaschengröße laut Rechnung auswählen; keine Größe wird geschätzt.');
 if(x.bottle_sizes?.length&& !x.bottle_sizes.includes(factor))throw Error('Flaschengröße ist nicht belegt.');
 return Math.round(n*factor*1e9)/1e9;
}
export function countedValue(x){const q=number(x.baseline),p=number(x.net_unit_price);return q===null||p===null?null:q*p;}
export function orderQuantity(demand,reserve,stock,pack){
 const d=number(demand),s=number(stock),p=number(pack),r=number(reserve);
 if(d===null||s===null||p===null||p<=0||r===null||r<0)return null;
 return Math.max(0,Math.ceil((d*(1+r/100)-s-1e-9)/p));
}
export function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/^[=+@]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n');}
export function exportRows(items){return [['Artikel','Einheit','Menge','Netto-EK je Einheit','Warenwert netto','Letzte Zählung','Bestandsart','Hinweis'],...items.map(x=>[x.name,x.unit,x.quantity,x.net_unit_price,x.value_net,x.counted_at,(x.count_kind||'unbekannt')+' / rechnerisch',[x.source_conflict?'Quellkonflikt':'',x.timing_warning?'Tageszeiten prüfen':'',x.missing_days?.length?'Bonit fehlt: '+x.missing_days.join(', '):''].filter(Boolean).join(' · ')])];}
export function viennaDay(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna'}).format(d);}
export function lastWeek(d=new Date()){
 const day=viennaDay(d),date=new Date(day+'T12:00:00Z'),offset=(date.getUTCDay()+6)%7;
 date.setUTCDate(date.getUTCDate()-offset);const until=date.toISOString().slice(0,10);
 date.setUTCDate(date.getUTCDate()-7);return {from:date.toISOString().slice(0,10),until};
}
export function coffeeDisplay(g){return number(g)===null?'unbekannt':Math.floor(g/1500)+' Dosen + '+Math.round(g%1500*100)/100+' g';}
// Small offline PDF writer, WinAnsi supports German labels. No third-party PDF service.
export function inventoryPdf(items,label){
 const fmt=v=>number(v)===null?'unbekannt':new Intl.NumberFormat('de-AT',{maximumFractionDigits:4}).format(v);
 const lines=['Das Friedrich - Lager & Inventur',label,'Rechnerische Bestände; tatsächliche Zählzeitpunkte separat.','Artikel / Einheit / Menge / Netto-EK / Warenwert netto / letzte Zählung',''];
 for(const x of items){const name=String(x.name);for(let n=0;n<name.length;n+=80)lines.push(name.slice(n,n+80));lines.push(`${x.unit} | ${fmt(x.quantity)} | EUR ${fmt(x.net_unit_price)} | EUR ${fmt(x.value_net)}`,`Zählung: ${x.counted_at||'unbekannt'} | ${x.count_kind||'unbekannt'}${x.timing_warning?' | Tageszeit prüfen':''}`);if(x.missing_days?.length){const note='Bonit fehlt: '+x.missing_days.join(', ');for(let n=0;n<note.length;n+=85)lines.push(note.slice(n,n+85));}lines.push('');}
 const enc=s=>String(s).replace(/€/g,'EUR').replace(/[–—]/g,'-').replace(/[^\x20-\xFF]/g,'?').replace(/([\\()])/g,'\\$1');
 const pages=[];for(let n=0;n<lines.length;n+=48)pages.push(lines.slice(n,n+48));
 const objs=['','<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
 const ids=[];
 for(const [i,page] of pages.entries()){
  const id=objs.length;ids.push(id);const stream='BT /F1 10 Tf 45 800 Td 14 TL '+page.map(l=>'('+enc(l)+') Tj T*').join('\n')+`\n(Seite ${i+1}/${pages.length}) Tj ET`;
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
 }
 objs[2]=`<< /Type /Pages /Kids [${ids.map(id=>id+' 0 R').join(' ')}] /Count ${ids.length} >>`;
 let out='%PDF-1.4\n',offsets=[0];for(let n=1;n<objs.length;n++){offsets.push(out.length);out+=`${n} 0 obj\n${objs[n]}\nendobj\n`;}
 const start=out.length;out+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return new Uint8Array([...out].map(c=>c.charCodeAt(0)));
}

