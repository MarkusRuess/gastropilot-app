export const FRIEDRICH='6a5484d1-daf6-4263-897d-24cdf536aa29';
export const near=(a,b,t=.03)=>typeof a==='number'&&Number.isFinite(a)&&typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=t;
export function pageRowsPrompt(expected,index,total){
 return `Lies ausschließlich Foto ${index} von ${total} eines BONit-Tagesabschlusses für ${expected.date}. Erfasse JEDE sichtbare Artikelzeile in gedruckter Reihenfolge, auch Nullpreis und gleiche Artikelnummer mit anderem Preis. Durchscheinende Rückseiten und Rücknahmenstatistik nicht als Artikel lesen. Die Spalten heißen Artikelnummer, Artikelbezeichnung, Menge, Einzel, Gesamt, MWST. Nichts ergänzen oder aus dem Tagesumsatz errechnen. Bei unlesbarer Zeile unreadable_rows erhöhen, keine Schätzung. Antworte nur JSON: {"image_index":${index},"printed_page":null,"processed":true,"continues":false,"unreadable_rows":0,"article_row_count":0,"sales_items":[{"row_index":1,"article_number":"1400","name":"Bezeichnung","quantity":1,"unit_price":3.1,"gross_amount":3.1,"tax_rate":20}]}. printed_page aus "Seite N" ablesen; continues nur bei "Fortsetzung nächste Seite". article_row_count zählt die sichtbaren Artikelzeilen, unabhängig von der Summe.`;
}
export function pageSummaryPrompt(expected,total){
 return `Lies den Summenblock dieses EINEN BONit-Tagesabschlusses aus allen ${total} Fotos. Geschäftstag und Z-Nummer ausschließlich aus der Überschrift "Buchung von/bis" und "Z-Nummer" ablesen. Upload-Datum nicht verwenden. Erwartete Archivwerte als Kontrollhilfe: Datum ${expected.date}, Brutto ${expected.gross_total}; bei Widerspruch Original melden, nicht anpassen. Erfasse gedrucktes Gesamtbrutto, Gesamtnetto, 10-/20-%-Steuergruppen, BAR Rechnung, Kreditkarte, Gutschein falls vorhanden, Personal/Einladung mit 0 und Anzahl Rechnungen. "Teilbetrag bar" ist keine zusätzliche Rechnung. Gib nur JSON: {"date":null,"z_number":null,"gross_total":null,"net_total":null,"vat_total":null,"cash_total":null,"card_total":null,"receipt_count":null,"cash_count":null,"card_count":null,"voucher_count":0,"free_count":0,"other_payments_total":0,"tax_breakdown":[{"rate":10,"gross":0,"net":0,"vat":0}],"printed_payment_lines":[{"label":"BAR Rechnung","count":0,"amount":0}],"returns":[]}. Unlesbare Felder null, niemals aus anderen Tagen übernehmen.`;
}
export function pageHeaderPrompt(expected){
 return `Lies nur den Kopf der ERSTEN Originalseite des BONit-Tagesabschlusses. Buchung von/bis ist der Geschäftstag, nicht der Upload- oder Drucktag. Schreibe Z-Nummer und beide Buchungsdaten ab. Erwarteter Geschäftstag ${expected.date} ist nur Kontrollwert; bei Widerspruch das gedruckte Datum zurückgeben. Keine Beträge oder Artikel lesen. JSON: {"date":null,"z_number":null,"booking_from":null,"booking_until":null}. Unlesbares null.`;
}
export function pageTotalsPrompt(expected){
 return `Lies nur den Summenblock mit "Gesamtumsatz brutto" auf dieser BONit-Seite. Erwartete Bruttosumme ${expected.gross_total} ist nur Kontrollwert. Lies rechte BETRAGSSPALTE in gedruckter Zeilenfolge: Gesamtumsatz brutto, Gesamtumsatz netto, Gesamtumsatz brutto bar, Gesamtumsatz brutto unbar; dann für 10,00 und 20,00 jeweils brutto, netto, Steuer. Die 10,00/20,00 links sind Steuersätze und keine Geldbeträge. Keine Werte aus anderen Zeilen ableiten oder vertauschen. Lies Anzahl Rechnungen. JSON: {"gross_total":null,"net_total":null,"cash_total":null,"card_total":null,"receipt_count":null,"tax_breakdown":[{"rate":10,"gross":null,"net":null,"vat":null},{"rate":20,"gross":null,"net":null,"vat":null}]}. Unlesbares null.`;
}
export function pagePaymentPrompt(){
 return `Lies ausschließlich den Block "Zahlarten" dieser BONit-Seite. Schreibe für BAR Rechnung, Kreditkarte, Gutschein (falls gedruckt), Personal / Einladung mit 0 und Teilbetrag bar jede gedruckte Zeile mit ANZAHL Rechnungen und Bruttobetrag ab. Die Summe der beiden bezahlten Arten und eines Gutscheins ist kein zusätzlicher Verkauf. JSON: {"printed_payment_lines":[{"label":"BAR Rechnung","count":null,"amount":null},{"label":"Kreditkarte","count":null,"amount":null},{"label":"Personal / Einladung mit 0","count":null,"amount":null}]}. Keine Beträge schätzen; unlesbare Werte null.`;
}
export function choosePaymentRead(reads,gross){
 const label=row=>String(row?.label||'').trim();
 const patterns=[/^BAR Rechnung$/i,/^Kreditkarte$/i,/^Gutschein$/i,/personal|einladung/i,/^Teilbetrag bar$/i];
 const lines=patterns.map(pattern=>{
  const candidates=reads.flatMap(read=>(read?.printed_payment_lines||[]).filter(row=>pattern.test(label(row))));
  const valid=candidates.filter(row=>Number.isInteger(row.count)&&row.count>=0&&Number.isFinite(row.amount)&&row.amount>=0);
  // A repeated row on adjacent photos is safe only if both reads agree.
  if(candidates.length>1&&valid.some(row=>row.count!==valid[0]?.count||Math.abs(row.amount-valid[0]?.amount)>.01))return null;
  return valid[0]||null;
 });
 const [cash,card,voucher,free]=lines;
 if(!cash||!card||!free)return {printed_payment_lines:[]};
 if(Math.abs(cash.amount+card.amount+(voucher?.amount||0)-gross)>.01)return {printed_payment_lines:[]};
 return {printed_payment_lines:lines.filter(Boolean)};
}
export function combineSummaryReads(header,totals,payments){
 const iso=value=>{const text=String(value||'');const ymd=text.match(/\d{4}-\d{2}-\d{2}/);if(ymd)return ymd[0];const dmy=text.match(/(\d{2})\.(\d{2})\.(\d{4})/);return dmy?`${dmy[3]}-${dmy[2]}-${dmy[1]}`:null;};
 const dates=[header.booking_from,header.booking_until].map(iso);
 const date=dates[0]&&dates[1]&&dates[0]===dates[1]&&dates[0]===iso(header.date)?dates[0]:null;
 const lines=payments.printed_payment_lines||[];
 const find=label=>lines.find(row=>String(row.label||'').trim().toLowerCase()===label);
 return {...totals,date,z_number:header.z_number,printed_payment_lines:lines,
  cash_count:find('bar rechnung')?.count,card_count:find('kreditkarte')?.count,
  free_count:lines.find(row=>/personal|einladung/i.test(String(row.label||'')))?.count,
  voucher_count:find('gutschein')?.count||0,other_payments_total:find('gutschein')?.amount||0,
  vat_total:Number.isFinite(totals.gross_total)&&Number.isFinite(totals.net_total)?Math.round((totals.gross_total-totals.net_total)*100)/100:null};
}
export function combinePageReads(summary,reads){
 const pages=reads.map((read,i)=>({
  image_index:i+1,printed_page:read.printed_page??null,processed:read.processed===true,
  continues:read.continues===true,unreadable_rows:read.unreadable_rows,
  article_row_count:read.article_row_count
 }));
 const sales_items=reads.flatMap((read,i)=>Array.isArray(read.sales_items)?read.sales_items.map(row=>({...row,source_page:i+1})):[]);
 return {...summary,pages,sales_items};
}
export function reconcileFriedrichSummary(read, expected){
 const errors=[];
 const gross=read.gross_total, net=read.net_total, rows=read.tax_breakdown;
 const lines=read.printed_payment_lines||[];
 const cash=lines.find(x=>/^BAR Rechnung$/i.test(String(x.label||'').trim()));
 const card=lines.find(x=>/^Kreditkarte$/i.test(String(x.label||'').trim()));
 const voucher=lines.find(x=>/^Gutschein$/i.test(String(x.label||'').trim()));
 const voucherAmount=voucher?.amount ?? 0;
 const voucherCount=voucher?.count ?? 0;
 const printedVat=Number.isFinite(gross)&&Number.isFinite(net)?Math.round((gross-net)*100)/100:null;
 if(!near(gross,expected.gross_total,.01)||!Number.isFinite(printedVat))errors.push('Gesamtumsatz und Nettosumme nicht belegt.');
 if(!cash||!card||!Number.isFinite(voucherAmount)||voucherAmount<0||!Number.isInteger(voucherCount)||voucherCount<0||!near(cash.amount+card.amount+voucherAmount,gross,.01)||!Number.isInteger(cash.count)||!Number.isInteger(card.count))errors.push('Bar und Kreditkarte nicht eindeutig gedruckt.');
 if(!Array.isArray(rows)||!rows.length||!near(rows.reduce((n,r)=>n+r.gross,0),gross,.01)||!near(rows.reduce((n,r)=>n+r.net,0),net,.02)||!near(rows.reduce((n,r)=>n+r.vat,0),printedVat,.02)||rows.some(r=>!near(r.net+r.vat,r.gross,.01)))errors.push('Steuergruppen und Rundung nicht abgeglichen.');
 if(!errors.length){read.vat_total=printedVat;read.cash_total=cash.amount;read.card_total=card.amount;read.cash_count=cash.count;read.card_count=card.count;read.other_payments_total=voucherAmount;read.voucher_count=voucherCount;}
 return errors;
}
export function validatePages(read,expected,imageCount){
 const errors=[],warnings=[],pages=read.pages,rows=read.sales_items;
 if(read.date!==expected.date||!/^\d{3,8}$/.test(String(read.z_number||''))||(expected.z_number&&String(expected.z_number)!==String(read.z_number)))errors.push('Datum/Z-Nummer stimmt nicht eindeutig mit dem Original überein.');
 if(!Array.isArray(pages)||pages.length!==imageCount)errors.push('Nicht jedes hochgeladene Foto ist ausgewertet.');
 else {
 const indices=pages.map(p=>p.image_index),numbers=pages.map(p=>p.printed_page).filter(n=>n!==null);
 if(new Set(indices).size!==imageCount||indices.some(n=>!Number.isInteger(n)||n<1||n>imageCount))errors.push('Fotozuordnung fehlt oder ist doppelt.');
 if(new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isInteger(n)||n<1||n>imageCount)||!Array.from({length:numbers.length},(_,i)=>i+1).every(n=>numbers.includes(n)))errors.push('Gedruckte Seitenfolge ist unvollständig oder doppelt.');
 if(pages.some(p=>p.processed!==true||p.unreadable_rows!==0||!Number.isInteger(p.article_row_count)||p.article_row_count<0))errors.push('Unlesbare oder ungeprüfte Positionen vorhanden.');
 if(pages.some(p=>p.continues===true&&p.image_index===imageCount))errors.push('Fortsetzungsseite fehlt.');
 }
 if(!Array.isArray(rows)||!rows.length)errors.push('Keine vollständigen Artikelzeilen erkannt.');
 else {
 for(const r of rows)if(typeof r.name!=='string'||!r.name.trim()||!/^\d+$/.test(String(r.article_number||''))||!Number.isFinite(r.quantity)||!Number.isFinite(r.unit_price)||!Number.isFinite(r.gross_amount)||!near(r.quantity*r.unit_price,r.gross_amount,.02)||!Number.isInteger(r.row_index)||r.row_index<1||!pages?.some(p=>p.image_index===r.source_page))errors.push('Artikelzeile oder Quellseite unvollständig.');
 if(new Set(rows.map(r=>r.source_page+':'+r.row_index)).size!==rows.length)errors.push('Artikelzeile doppelt erkannt.');
 for(const p of pages||[])if(rows.filter(r=>r.source_page===p.image_index).length!==p.article_row_count)errors.push('Artikel fehlen auf Foto '+p.image_index+'.');
 if(!near(rows.reduce((s,r)=>s+r.gross_amount,0),expected.gross_total))errors.push('Artikelsumme stimmt nicht mit Tagesbrutto überein.');
 }
 for(const k of ['gross_total','net_total','cash_total','card_total','receipt_count'])if(expected[k]!==null&&expected[k]!==undefined&&!near(read[k],expected[k],k==='receipt_count'?0:.02))errors.push('Originalwert weicht ab: '+k);
 if(!near(read.cash_total+read.card_total+(read.other_payments_total||0),read.gross_total)||!near(read.net_total+read.vat_total,read.gross_total))errors.push('Zahlungsarten oder Nettosumme unvollständig.');
 if(![read.cash_count,read.card_count,read.free_count,read.receipt_count].every(x=>Number.isInteger(x)&&x>=0)||read.cash_count+read.card_count+read.free_count+(read.voucher_count||0)!==read.receipt_count)errors.push('Bonanzahlen nicht abgeglichen.');
 const lines=read.printed_payment_lines||[];
 const cash=lines.find(x=>/bar/i.test(x.label)&&!/teil/i.test(x.label)),card=lines.find(x=>/kredit|karte/i.test(x.label)),free=lines.find(x=>/personal|einladung/i.test(x.label)),voucher=lines.find(x=>/^gutschein$/i.test(x.label));
 if(!cash||!card||!free||cash.count!==read.cash_count||card.count!==read.card_count||free.count!==read.free_count||!near(cash.amount,read.cash_total)||!near(card.amount,read.card_total)||!near(free.amount,0)||(read.other_payments_total>0&&(!voucher||!near(voucher.amount,read.other_payments_total)||voucher.count!==read.voucher_count)))errors.push('Gedruckte Zahlartenzeilen fehlen oder weichen ab.');
 const tax=read.tax_breakdown;
 if(!Array.isArray(tax)||!tax.length||tax.some(t=>![0,10,13,20].includes(t.rate)||!near(t.net+t.vat,t.gross)||!near(t.net*t.rate/100,t.vat))||!near(tax.reduce((s,t)=>s+t.gross,0),read.gross_total)||!near(tax.reduce((s,t)=>s+t.net,0),read.net_total)||!near(tax.reduce((s,t)=>s+t.vat,0),read.vat_total))errors.push('Gedruckte Steuergruppen nicht vollständig abgeglichen.');
 if(Array.isArray(rows)&&Array.isArray(tax))for(const t of tax){const total=rows.filter(r=>r.tax_rate===t.rate).reduce((s,r)=>s+r.gross_amount,0);if(!near(total,t.gross))warnings.push('Artikel-Steuergruppe '+t.rate+' % weicht von gedruckter Steuersumme ab; gedruckte Steuerwerte bleiben maßgeblich.');}
 if(rows?.some(r=>typeof r.tax_rate!=='number'))errors.push('Einzelne Artikel-Steuersätze unlesbar.');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
export function pagePrompt(expected,n){return `Lies sämtliche ${n} Fotos eines einzigen mehrseitigen BONit-Tagesabschlusses unabhängig vollständig. Erwarte Geschäftstag ${expected.date}, Z ${expected.z_number||'laut Original'}. Kein Bild auslassen. Durchscheinende Rückseiten nicht lesen. Rücknahmenblock separat als returns erfassen, NICHT erneut von den bereits abgeglichenen Artikelzeilen abziehen. Keine Zeilen nach Artikelnummer zusammenfassen: bezahlte, kostenlose und unterschiedliche Preiszeilen getrennt erhalten. Nichts schätzen oder ergänzen. Unlesbares null und unreadable_rows erhöhen. Jede Artikelzeile mit source_page (1-basierter Fotoindex), row_index (1-basierte Zeile auf diesem Foto), article_number, name, quantity, unit_price, gross_amount, tax_rate. Summenblock und Steuergruppen auf allen Fotos suchen; über Seiten geteilte Steuergruppen nur anhand der gedruckten Werte zusammenfügen. Jede Quelle kennzeichnen. Antworte JSON: {date,z_number,gross_total,net_total,vat_total,cash_total,card_total,receipt_count,cash_count,card_count,voucher_count,free_count,other_payments_total,pages:[{image_index,printed_page,processed:true,continues:false,unreadable_rows:0,article_row_count:0}],sales_items:[],tax_breakdown:[{rate,gross,net,vat}],printed_payment_lines:[{label,count,amount}],returns:[]}. Für Fotos ohne Artikel trotzdem pages-Eintrag mit article_row_count:0. Fortsetzungshinweise und gedruckte Seitennummern prüfen; fehlende Seite nicht erfinden.`;}
