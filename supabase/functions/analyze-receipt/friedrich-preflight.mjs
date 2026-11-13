export function preflightPrompt(total){
 return `Prüfe ${total} hochgeladene Fotos einzeln: Sind sie in Reihenfolge Seite 1 bis ${total} DESSELBEN BONit-Tagesabschlusses von DAS FRIEDRICH? Lies ausschließlich sichtbaren Druck, keine Uploadzeit. Auf Seite 1 stehen Z-Nummer und Buchung von/bis; auf einer späteren Seite stehen Gesamtumsatz brutto, Gesamtnetto, Bar und unbar; die letzte Seite enthält die Artikelgruppenstatistik und Summe AG. Rücknahmen sind keine weitere Umsatzbuchung. Wenn ein Foto ein anderer Beleg ist, eine Seite fehlt, oder ein Wert unlesbar ist, gib null bzw. false zurück. Antworte nur JSON: {"same_report":false,"pages":[{"image_index":1,"printed_page":1,"continues":true,"bonit":true}],"z_number":null,"booking_from":null,"booking_to":null,"gross_total":null,"net_total":null,"cash_total":null,"card_total":null,"footer_total":null,"receipt_count":null,"tax_breakdown":[{"rate":10,"gross":null,"net":null,"vat":null}],"notes":null}. Datumsformat YYYY-MM-DD. printed_page nur aus 'Seite N'; auf der letzten Seite ohne Seitenzahl null. continues nur aus 'Fortsetzung nächste Seite'. footer_total aus 'Summe AG' auf der letzten Seite. Bar und Karte aus den gedruckten Zahlarten, keine Schätzung.`;
}
export function validatePreflight(read,total){
 const cents=n=>Math.round(n*100);
 const pages=read?.pages;
 if(read?.same_report!==true||!Array.isArray(pages)||pages.length!==total||
  pages.some((p,i)=>p.image_index!==i+1||(p.printed_page!==i+1&&!(i===total-1&&p.printed_page===null))||p.bonit!==true||p.continues!==(i<total-1)))return null;
 if(!/^\d{3,8}$/.test(String(read.z_number||''))||!/^(20\d\d)-(\d\d)-(\d\d)$/.test(read.booking_from||'')||read.booking_to!==read.booking_from)return null;
 const date=read.booking_from;
 if(Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return null;
 const monetary=['gross_total','net_total','cash_total','card_total'];
 if(monetary.some(k=>typeof read[k]!=='number'||!Number.isFinite(read[k])||read[k]<0)||
  !Number.isInteger(read.receipt_count)||read.receipt_count<0||
  typeof read.footer_total!=='number'||!Number.isFinite(read.footer_total)||
  cents(read.cash_total)+cents(read.card_total)!==cents(read.gross_total)||cents(read.footer_total)!==cents(read.gross_total))return null;
 const tax=read.tax_breakdown;
 if(!Array.isArray(tax)||tax.length<1||tax.some(x=>![0,10,13,20].includes(x.rate)||
  ['gross','net','vat'].some(k=>typeof x[k]!=='number'||!Number.isFinite(x[k]))||Math.abs(x.net+x.vat-x.gross)>.02)||
  Math.abs(tax.reduce((n,x)=>n+x.gross,0)-read.gross_total)>.02||
  Math.abs(tax.reduce((n,x)=>n+x.net,0)-read.net_total)>.02)return null;
 return {document_type:'cash_report',date,z_number:String(read.z_number),gross_total:read.gross_total,
  net_total:read.net_total,vat_total:Math.round((read.gross_total-read.net_total)*100)/100,
  cash_total:read.cash_total,card_total:read.card_total,receipt_count:read.receipt_count,
  tax_breakdown:tax,image_indices:pages.map(p=>p.image_index),needs_review:true,
  notes:'Dreiteiliger BONit-Abschluss; Artikel, Zahlarten und Steuern werden vor Buchung einzeln geprüft.'};
}
