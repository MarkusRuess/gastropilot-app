/* GastroPilot Dokumenteneingang – Entwicklungsversion, keine automatische Verbuchung.
 * Die Erkennung verwendet ausschließlich vorhandene OCR-/Parserdaten.
 * Nicht erkannte Dokumente bleiben in der manuellen Prüfung.
 */
(function (root) {
  "use strict";
  const TYPES = Object.freeze({
    invoice:"Lieferantenrechnung", daily:"BONit-Tagesabschluss",
    bank:"Bankauszug", payroll:"Lohnabrechnung",
    trial:"Saldenliste", inventory:"Inventur",
    tax:"Abgabenbescheid", unknown:"Unbekanntes Dokument"
  });
  const CATEGORIES = Object.freeze([
    ["cleaning", /reiniger|spülmittel|desinfektion|putz|waschmittel|hygiene|seife/i],
    ["decoration", /deko|blume|kerze|serviette dekor|vase|ornament/i],
    ["packaging", /verpackung|becher|deckel|tragetasche|einweg|folie|karton/i],
    ["office", /drucker|papier|büro|toner|stift/i],
    ["maintenance", /reparatur|ersatzteil|wartung|serviceleistung/i],
    ["beverage", /bier|wein|prosecco|sekt|kaffee|espresso|wasser|saft|limonade|sirup|tee|milch/i],
    ["food", /schinken|käse|butter|mehl|zucker|brot|fleisch|fisch|lachs|ei|eier|gemüse|obst|torte|kuchen|sahne|schlagobers/i]
  ]);
  const normalize = v => String(v == null ? "" : v).normalize("NFKC").trim();
  function classifyDocument(input) {
    const s = normalize(typeof input === "string" ? input : [input?.text,input?.filename].filter(Boolean).join(" ")).toLowerCase();
    if (!s) return {type:"unknown",confidence:"none",requiresReview:true};
    const rules = [
      ["trial", /saldenliste|summen.?und.?saldenliste|susa|kontensalden/],
      ["bank", /kontoauszug|bankauszug|iban.{0,35}(buchung|valuta)|buchungsdatum.{0,70}betrag/],
      ["payroll", /lohnabrechnung|gehaltsabrechnung|lohnzettel|nettoauszahlung.{0,80}dienstgeber/],
      ["daily", /z.?bericht|tagesabschluss|bonit.{0,70}(abschluss|umsatz)|bonanzahl.{0,80}bruttoumsatz/],
      ["inventory", /inventurliste|inventuraufnahme|lagerbestand.{0,60}stichtag/],
      ["tax", /beitragsvorschreibung|abgabenbescheid|vorschreibung.{0,70}(ögk|finanzamt)/],
      ["invoice", /rechnung(?:snummer|sdatum|snr|nr|nummer)?|invoice|zahlbar bis/]
    ];
    const hits=rules.filter(([type,re])=>re.test(s)).map(([type])=>type);
    return hits.length===1 ? {type:hits[0],confidence:"rule",requiresReview:true}
      : {type:"unknown",confidence:"ambiguous",candidates:hits,requiresReview:true};
  }
  function classifyLineItem(item) {
    const name=normalize(typeof item==="string"?item:item?.description||item?.name);
    const match=CATEGORIES.find(([,re])=>re.test(name));
    return {description:name,category:match?match[0]:"unclassified",requiresReview:!match};
  }
  function validateInvoice(invoice) {
    const errors=[];
    if (!normalize(invoice?.supplier)) errors.push("Lieferant fehlt");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalize(invoice?.date))) errors.push("Rechnungsdatum fehlt/ungültig");
    if (!normalize(invoice?.invoiceNumber)) errors.push("Rechnungsnummer fehlt");
    if (!Number.isFinite(Number(invoice?.gross))||Number(invoice?.gross)<0) errors.push("Bruttobetrag fehlt/ungültig");
    if (!Array.isArray(invoice?.items)||invoice.items.length===0) errors.push("Artikelpositionen fehlen");
    return {valid:errors.length===0,errors};
  }
  function invoiceFingerprint(invoice) {
    return [invoice?.supplier,invoice?.invoiceNumber,invoice?.date,invoice?.gross]
      .map(v=>normalize(v).toLocaleLowerCase("de-AT")).join("|");
  }
  function approveInvoice(invoice, decision, paymentMethod) {
    const check=validateInvoice(invoice);
    if (!check.valid) return {ok:false,errors:check.errors};
    if (!["open","paid"].includes(decision)) return {ok:false,errors:["Freigabe Offen oder Bezahlt erforderlich"]};
    if (decision==="paid"&&!["cash","bank","card"].includes(paymentMethod))
      return {ok:false,errors:["Zahlungsart erforderlich"]};
    return {ok:true,record:{
      ...invoice,status:decision,paymentMethod:decision==="paid"?paymentMethod:null,
      fingerprint:invoiceFingerprint(invoice),
      items:invoice.items.map(item=>({...item,...classifyLineItem(item)})),
      needsBankMatch:decision==="paid"&&paymentMethod!=="cash",
      approved:true
    }};
  }
  root.GastroPilotDocumentIntake=Object.freeze({
    TYPES,classifyDocument,classifyLineItem,validateInvoice,invoiceFingerprint,approveInvoice
  });
})(typeof window!=="undefined"?window:globalThis);
