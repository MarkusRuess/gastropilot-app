
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type UploadedImage = {
  image_base64: string;
  mime_type: string;
};

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGES = 12;
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const MAX_TOTAL_BASE64_LENGTH = 35_000_000;

function normalizeImages(body: any): UploadedImage[] {
  if (Array.isArray(body.images)) {
    return body.images.map((image: any) => ({
      image_base64: image?.image_base64,
      mime_type: image?.mime_type || "image/jpeg",
    }));
  }

  if (typeof body.image_base64 === "string") {
    return [{
      image_base64: body.image_base64,
      mime_type: body.mime_type || "image/jpeg",
    }];
  }

  return [];
}

function getOutputText(result: any): string {
  return (result.output || [])
    .flatMap((item: any) => item.content || [])
    .filter((item: any) => item.type === "output_text")
    .map((item: any) => item.text || "")
    .join("");
}

function cleanJson(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function amount(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function count(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function quantity(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result || null;
}

function normalizeTaxBreakdown(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((row: any) =>
      row &&
      typeof row === "object" &&
      typeof row.rate === "number" &&
      Number.isFinite(row.rate)
    )
    .map((row: any) => ({
      rate: row.rate,
      net: amount(row.net),
      vat: amount(row.vat),
      gross: amount(row.gross),
    }));
}

function normalizeSalesItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item: any) =>
      item &&
      typeof item.name === "string" &&
      item.name.trim() &&
      typeof item.quantity === "number" &&
      Number.isFinite(item.quantity) &&
      item.quantity >= 0
    )
    .map((item: any) => ({
      name: item.name.trim(),
      quantity: item.quantity,
    }));
}

// NEU: Artikelgruppenstatistik / Spartenumsätze
function normalizeCategorySales(value: unknown) {
  if (!Array.isArray(value)) return [];

  const result = [];

  for (const row of value) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.name !== "string" ||
      !row.name.trim()
    ) {
      continue;
    }

    result.push({
      name: row.name.trim(),
      gross: amount(row.gross),
      net: amount(row.net),
      vat: amount(row.vat),
      quantity: quantity(row.quantity),
    });
  }

  return result;
}


const TAX_PIPELINE_VERSION = 2;
const near = (a, b, tolerance = 0.03) => typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= tolerance;
function taxErrors(doc) {
 const errors = [];
 const rows = doc.tax_breakdown || [];
 if (!rows.length) return ["Gedruckte Steuergruppen fehlen"];
 for (const row of rows) {
  if (![row.rate,row.gross,row.net,row.vat].every(n=>typeof n==="number"&&Number.isFinite(n))) {errors.push("Steuerzeile unvollständig");continue;}
  if (!near(row.net+row.vat,row.gross)) errors.push("Netto + Steuer stimmt in Steuergruppe nicht");
  if (!near(Math.round(row.net*row.rate)/100,row.vat)) errors.push("Steuersatz passt nicht zu Nettobetrag");
 }
 if (!near(rows.reduce((a,r)=>a+(r.gross||0),0),doc.gross_total)) errors.push("Steuergruppen passen nicht zum Bruttoumsatz");
 if (!near(rows.reduce((a,r)=>a+(r.net||0),0),doc.net_total)) errors.push("Steuergruppen passen nicht zum Nettoumsatz");
 if (!near(rows.reduce((a,r)=>a+(r.vat||0),0),doc.vat_total)) errors.push("Steuergruppen passen nicht zur Umsatzsteuer");
 if (!near(doc.net_total+doc.vat_total,doc.gross_total)) errors.push("Netto + Steuer passt nicht zu Brutto");
 return [...new Set(errors)];
}
async function verifyPrintedTaxes(doc, images, apiKey) {
 const prompt = `Lies NUR den gedruckten Summenblock der BONit-Abrechnung direkt unter "Gesamtumsatz brutto". kind ist gross für brutto, net für netto und vat für Steuer. Jede Zeile ist LABEL links und BETRAG rechts. Übernimm Brutto, Netto, Bar, Unbar und jede Steuerzeile genau aus dem Bild. Bei 10,00 brutto/netto/Steuer und 20,00 brutto/netto/Steuer NIEMALS die Zeilen gegeneinander verschieben. Der erste Betrag einer Steuergruppe ist BRUTTO, nicht Netto. Steuersatz 10,00 oder 20,00 ist keine Geldsumme. Ermittle KEINE Steueraufteilung aus Artikelgruppen. Nicht schätzen, bei unlesbaren Zahlen null. Lies zusätzlich Artikelgruppenstatistik zeilenweise mit korrekter Zuordnung von Bezeichnung und Betrag, inklusive aller Zeilen. Vorhandene OCR-Werte sind ausdrücklich NICHT die Quelle. Der erwartete Tagesbruttoumsatz als Zuordnungsprüfung ist ${doc.gross_total}; Datum ${doc.date}. Gibt es mehrere abweichende Tagesabschlüsse, liefere needs_review=true. Rechenprüfungen erfolgen danach im Programm. Antworte ausschließlich mit JSON: {"date":"YYYY-MM-DD","gross_total":null,"net_total":null,"vat_total":null,"cash_total":null,"card_total":null,"other_payments_total":null,"receipt_count":null,"tax_breakdown":[{"rate":10,"gross":null,"net":null,"vat":null}],"printed_tax_lines":[{"page":1,"rate":10,"kind":"gross","label":"10,00 brutto","amount":null}],"category_sales":[{"name":"exakte Originalbezeichnung inkl Steuersatz","gross":null}],"needs_review":false,"notes":null}. vat_total darf die Summe der GEDRUCKTEN Steuerbeträge sein, falls keine Gesamtsumme gedruckt ist. date darf null sein, wenn auf der Steuerseite kein Datum sichtbar ist.`;
 const content = [];content.push({type:"input_text",text:prompt});
 images.forEach((image,index)=>{content.push({type:"input_text",text:"Originalseite "+(index+1)});content.push({type:"input_image",image_url:"data:"+image.mime_type+";base64,"+image.image_base64,detail:"high"});});
 const res = await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-2025-04-14",temperature:0,max_output_tokens:4500,store:false,text:{format:{type:"json_object"}},input:[{role:"user",content}]})});
 if(!res.ok) throw new Error("Automatische Steuer-Nachprüfung nicht verfügbar ("+res.status+")");
 const result=await res.json();if(result.status==="incomplete")throw new Error("Steuer-Nachprüfung unvollständig");
 const read=JSON.parse(cleanJson(getOutputText(result)));
 const candidate={...doc,gross_total:amount(read.gross_total),net_total:amount(read.net_total),vat_total:amount(read.vat_total),tax_breakdown:normalizeTaxBreakdown(read.tax_breakdown)};
 const errors=taxErrors(candidate);
 if(read.date&&read.date!==doc.date)errors.push("Datum der Steuerseite weicht ab");
 if(!near(candidate.gross_total,doc.gross_total))errors.push("Bruttoumsatz weicht vom gespeicherten Abschluss ab");
 if(read.needs_review)errors.push(textOrNull(read.notes)||"Gedruckte Steuerzeilen nicht eindeutig");
 if(!Array.isArray(read.printed_tax_lines)||read.printed_tax_lines.length<candidate.tax_breakdown.length*3)errors.push("Gedruckte Steuerzeilen nicht vollständig belegt");
 for(const row of candidate.tax_breakdown){for(const kind of ["gross","net","vat"]){const line=(read.printed_tax_lines||[]).find(l=>l.rate===row.rate&&l.kind===kind);if(!line||!near(amount(line.amount),row[kind],0.001))errors.push("Gedruckte Steuerzeile stimmt nicht mit übernommener Zahl überein");}}
 candidate.tax_verification={version:TAX_PIPELINE_VERSION,method:"printed_summary_second_read",model:"gpt-4.1-2025-04-14",verified:errors.length===0,errors,printed_tax_lines:read.printed_tax_lines||[],checked_at:new Date().toISOString()};
 if(errors.length){doc.tax_verification=candidate.tax_verification;doc.needs_review=true;doc.notes=errors.join("; ");return doc;}
 for(const key of ["cash_total","card_total","other_payments_total","receipt_count"]){if(typeof read[key]==="number")candidate[key]=key==="receipt_count"?count(read[key]):amount(read[key]);}
 if(!near((candidate.cash_total||0)+(candidate.card_total||0)+(candidate.other_payments_total||0),candidate.gross_total))errors.push("Zahlungsarten passen nicht zum Umsatz");
 const categories=normalizeCategorySales(read.category_sales);
 if(categories.length&&categories.every(r=>r.gross!==null)&&near(categories.reduce((a,r)=>a+r.gross,0),candidate.gross_total)){candidate.category_sales=categories;}
 else if(categories.length)errors.push("Artikelgruppen nicht vollständig abgeglichen");
 candidate.vat_breakdown=candidate.tax_breakdown;
 candidate.needs_review=errors.length>0;
 candidate.tax_verification.verified=errors.length===0;candidate.tax_verification.errors=errors;
 candidate.analysis_notes_original=doc.analysis_notes_original||doc.notes;
 candidate.notes=errors.length?errors.join("; "):null;
 return candidate;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Nur POST erlaubt" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json({
        error: "Anmeldung erforderlich",
      }, 401);
    }

    const publicKey = Deno.env.get(
      "GASTROPILOT_PUBLIC_KEY"
    );

    const supabaseUrl = Deno.env.get(
      "SUPABASE_URL"
    );

    if (!publicKey || !supabaseUrl) {
      return json({
        error: "Supabase-Konfiguration fehlt",
      }, 500);
    }

    const supabase = createClient(
      supabaseUrl,
      publicKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const token = authHeader.substring(7);

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return json({
        error: "Ungültige Anmeldung",
      }, 401);
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return json({
        error: "Ungültige Anfrage",
      }, 400);
    }

    const businessId = body.business_id;

    const mode =
      body.mode === "cash_report"
        ? "cash_report"
        : body.mode === "invoice"
          ? "invoice"
          : "auto";

    let images = normalizeImages(body);
    let savedDocument: any = null;

    if (
      typeof businessId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        .test(businessId)
    ) {
      return json({
        error: "Ungültiger Betrieb",
      }, 400);
    }

    const { data: membership, error: memberError } =
      await supabase
        .from("business_members")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

    if (memberError || !membership) {
      return json({
        error: "Kein Zugriff auf diesen Betrieb",
      }, 403);
    }


    if (body.document_id) {
      if (typeof body.document_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.document_id)) return json({error:"Ungültiger Beleg"},400);
      const existing=await supabase.from("documents").select("*").eq("id",body.document_id).eq("business_id",businessId).eq("document_type","cash_report").maybeSingle();
      if(existing.error||!existing.data)return json({error:"Abrechnung nicht gefunden oder kein Zugriff"},404);
      savedDocument=existing.data;
      const paths=[...new Set([...(savedDocument.extracted_data?.original_files||[]),savedDocument.storage_path].filter(Boolean))];
      if(!paths.length||paths.length>MAX_IMAGES)return json({error:"Originalfotos fehlen"},422);
      images=[];
      for(const path of paths){
        if(typeof path!=="string"||!path.startsWith(businessId+"/"))return json({error:"Ungültiger Originalpfad"},403);
        const original=await supabase.storage.from("invoice-originals").download(path);
        if(original.error||!original.data)return json({error:"Originalfoto konnte nicht geladen werden"},422);
        const bytes=new Uint8Array(await original.data.arrayBuffer());
        let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        images.push({image_base64:btoa(binary),mime_type:original.data.type||"image/jpeg"});
      }
    }

    if (
      images.length === 0 ||
      images.length > MAX_IMAGES
    ) {
      return json({
        error:
          `Bitte 1 bis ${MAX_IMAGES} Fotos auswählen.`,
      }, 400);
    }

    let totalLength = 0;

    for (const image of images) {
      if (
        typeof image.image_base64 !== "string" ||
        !allowedMimeTypes.includes(image.mime_type)
      ) {
        return json({
          error: "Ungültige Bilddaten",
        }, 400);
      }

      if (
        image.image_base64.length === 0 ||
        image.image_base64.length >
          MAX_IMAGE_BASE64_LENGTH
      ) {
        return json({
          error: "Ein Foto ist zu groß",
        }, 413);
      }

      totalLength += image.image_base64.length;
    }

    if (totalLength > MAX_TOTAL_BASE64_LENGTH) {
      return json({
        error:
          "Die Fotos sind insgesamt zu groß. Bitte weniger Fotos gleichzeitig hochladen.",
      }, 413);
    }


    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return json({
        error: "KI-Schlüssel fehlt",
      }, 500);
    }

    const instructions = `
Du bist ein äußerst präziser Beleganalyst für
einen österreichischen Gastronomiebetrieb.

Du erhältst ${images.length} Fotos.

MODUS: ${mode}

ALLGEMEINE REGELN

1. Lies sämtliche Fotos vollständig.
2. Ein Dokument kann mehrere Seiten haben.
3. Erfasse jede Zahl nur einmal.
4. Erfinde niemals Beträge, Mengen oder Steuersätze.
5. Nicht vorhandene oder unlesbare Werte sind null.
6. Gib ausschließlich gültiges JSON zurück.
7. Geldbeträge sind JSON-Zahlen in Euro.
8. Übernimm die Originalbezeichnungen.
9. Beachte Stornos, Rabatte, Retouren,
   Gutscheine und Zwischensummen.
10. Bei Widersprüchen setze needs_review true
    und beschreibe sie in notes.

BONit-MONATSABSCHLÜSSE (monthly_report)

Erkenne ausdrücklich BONit Monatsabschluss, Monatsauswertung, Monatsbericht, Zeitraum von/bis, Monatsstatistik und Z-Auswertungen über einen ganzen Monat. document_type = monthly_report, niemals cash_report. date = letzter Tag des ausgewiesenen Berichtszeitraums; period_start und period_end als YYYY-MM-DD. gross_total = Monatsbrutto, net_total = Monatsnetto; Steuergruppen, Bar/Karte, bezahlte Bons getrennt von kostenlosen Bons; sämtliche Artikelgruppen und Artikelpositionen mit Originalbezeichnungen, Artikelnummer, Menge, Umsatz und Varianten, Stundenumsätze, Tischumsätze, Mitarbeiterstatistik, Stornos, Rabatte, Gutscheine. Unbekannte Werte null, keine erfundenen Angaben. Monatswerte nicht als Tageswerte ausgeben. Zusätzliche Felder article_details, hourly_sales, table_sales, paid_receipt_count, free_receipt_count, period_start, period_end ausgeben soweit vorhanden.

TAGESABRECHNUNGEN (cash_report)

Alle hochgeladenen Fotos gehören grundsätzlich
zu EINER Tagesabrechnung.

Fasse alle Seiten zu EINEM Dokument zusammen.

Erfasse:

date:
Tatsächliches Datum der Tagesabrechnung
im Format YYYY-MM-DD.

gross_total:
Gesamter Bruttoumsatz des Tages.

net_total:
Gesamter Nettoumsatz, wenn ausgewiesen
oder aus vollständig und eindeutig
ausgewiesenen Steuergruppen berechenbar.

vat_total:
Gesamte Umsatzsteuer, wenn ausgewiesen
oder eindeutig berechenbar.

tax_breakdown:
Alle erkennbaren Steuergruppen.

Für jede Steuergruppe:
rate = Steuersatz in Prozent
net = Nettoumsatz
vat = Umsatzsteuer
gross = Bruttoumsatz

Keine pauschale Nettoberechnung mit einem
angenommenen Steuersatz.

Nicht annehmen, dass alle Speisen 10 %
und alle Getränke 20 % haben.

food_gross:
Ausgewiesener Bruttoumsatz Speisen.

drinks_gross:
Ausgewiesener Bruttoumsatz Getränke.

nonfood_gross:
Ausgewiesener Bruttoumsatz Non-Food.

other_gross:
Sonstiger ausgewiesener Bruttoumsatz.

cash_total:
Tatsächliche Barzahlungen laut Tagesabschluss.

card_total:
Kartenzahlungen laut Tagesabschluss.

other_payments_total:
Sonstige Zahlungsarten, wenn eindeutig
als Gesamtbetrag ausgewiesen.

receipt_count:
Anzahl der Rechnungen bzw. Kassenbons.

Achte besonders auf die Bezeichnungen
"Anzahl Rechnungen", "Rechnungen",
"Anzahl Bons" oder "Belege".

Nicht mit Artikelmengen oder Positionen
verwechseln.

sales_items:
Alle lesbaren verkauften Einzelartikel.

Für jeden Einzelartikel:
name = Originalbezeichnung
quantity = verkaufte Menge

Gleiche Artikel dürfen zusammengeführt
werden, wenn sie tatsächlich mehrfach
verkauft wurden.

Zwischensummen nicht als Artikel erfassen.

==================================================
BESONDERS WICHTIG:
ARTIKELGRUPPENSTATISTIK
==================================================

Suche auf ALLEN Fotos ausdrücklich nach
der Überschrift:

"Artikelgruppenstatistik"

oder gleichbedeutenden Überschriften wie:

"Artikelgruppen"
"Warengruppenstatistik"
"Warengruppen"
"Spartenumsätze"
"Umsatz nach Artikelgruppen"

Dieser Bereich ist für die betriebliche
Monatsauswertung besonders wichtig.

Lies die GESAMTE Artikelgruppenstatistik.

Erfasse JEDE einzelne Artikelgruppe
als eigenen Eintrag im Feld:

category_sales

Für jede Artikelgruppe:

name:
Originalbezeichnung laut Kassenbeleg.

gross:
Tatsächlich ausgewiesener Bruttoumsatz
der Artikelgruppe in Euro.

net:
Nettoumsatz der Artikelgruppe,
falls eindeutig ausgewiesen.

vat:
Umsatzsteuer der Artikelgruppe,
falls eindeutig ausgewiesen.

quantity:
Verkaufte Menge der Artikelgruppe,
falls ausdrücklich ausgewiesen.

Beispiel für die STRUKTUR, nicht für Werte:

"category_sales": [
  {
    "name": "Originalbezeichnung laut Beleg",
    "gross": 123.45,
    "net": null,
    "vat": null,
    "quantity": null
  }
]

WICHTIGE REGELN FÜR ARTIKELGRUPPEN:

1. Verwende exakt die Bezeichnungen
   aus der Artikelgruppenstatistik.

2. Übernimm die dort ausgewiesenen
   Umsatzbeträge.

3. Verwende bevorzugt den ausdrücklich
   ausgewiesenen Bruttobetrag.

4. Wenn nur Netto ausgewiesen ist,
   setze gross auf null, sofern Brutto
   nicht eindeutig berechenbar ist.

5. Verwechsle Artikelgruppen nicht
   mit einzelnen verkauften Artikeln.

6. Leite Gruppenumsätze NICHT aus
   verkauften Stückzahlen ab.

7. Erfinde keine Artikelgruppen.

8. Fasse unterschiedliche Artikelgruppen
   nicht zu einer neuen Gruppe zusammen.

9. Übernimm keine Zwischensummen,
   Gesamtsummen oder Überschriften
   als zusätzliche Artikelgruppe.

10. Wenn die Artikelgruppenstatistik
    auf mehreren Fotos derselben Seite
    erscheint, erfasse sie nur einmal.

11. Wenn die Statistik über mehrere
    Seiten geht, erfasse alle Gruppen.

12. Falls eine Gruppenbezeichnung
    oder ein Betrag unlesbar ist,
    markiere die Unsicherheit in notes.

13. Falls keine Artikelgruppenstatistik
    vorhanden ist, gib zurück:
    "category_sales": []

14. Wenn eine Gruppe lesbar ist,
    ihr Umsatz aber nicht, verwende
    gross: null.

15. Prüfe, ob die Summe der eindeutig
    ausgewiesenen Gruppenumsätze
    zum ausgewiesenen Gruppen-Gesamtwert
    passt.

16. Bei Abweichungen keine Zahlen
    stillschweigend ändern.

17. Bei Abweichungen needs_review true
    und Erklärung in notes.

Die Artikelgruppenstatistik muss
ZUSÄTZLICH zu sales_items erfasst werden.

Beide Felder sind erforderlich.

==================================================
KONTROLLEN DER TAGESABRECHNUNG
==================================================

Prüfe, ob Netto + Umsatzsteuer
dem Bruttoumsatz entspricht.

Prüfe, ob Bar + Karte + sonstige
Zahlungsarten dem Bruttoumsatz entspricht,
sofern dieselbe Umsatzbasis vorliegt.

Beachte Gutscheine, Trinkgelder,
Stornos und offene Rechnungen.

Prüfe die Artikelgruppenstatistik
auf erkennbare Summenfehler.

Prüfe, ob die Anzahl der Rechnungen
tatsächlich eine Bonanzahl ist.

Abweichungen niemals automatisch
korrigieren.

Beschreibe sie in notes.

RECHNUNGEN (invoice)

Die Fotos können mehrere Rechnungen enthalten.

Mehrseitige Rechnungen gehören zusammen.

Unterscheide Rechnungen anhand von:

Lieferant
Rechnungsnummer
Rechnungsdatum
Seitennummer
Rechnungsinhalt

Erzeuge für jede eindeutig erkannte
Rechnung ein eigenes Dokument.

supplier = Lieferant

invoice_number = Rechnungsnummer

date = Rechnungsdatum im Format YYYY-MM-DD

gross_total = Rechnungsbruttobetrag

net_total = Rechnungsnetto

vat_total = Umsatzsteuer

tax_breakdown = ausgewiesene Steuergruppen

sales_items = lesbare Artikel und Mengen,
sofern sinnvoll erkennbar.

Die bisherigen Rechnungsfelder bleiben
kompatibel.

Für Lieferantenrechnungen:

category_sales = []

Tagesabrechnungsfelder wie cash_total,
card_total und receipt_count sind
grundsätzlich null.

Ordne jeder Rechnung ihre Bildnummern zu.

Bei unsicherer Zuordnung:
needs_review true.

AUTO-MODUS

Erkenne die Belegart.

Verbinde nur eindeutig
zusammengehörende Seiten.

AUSGABEFORMAT

{
  "documents": [
    {
      "document_type": "cash_report",
      "period_start": null,
      "period_end": null,
      "paid_receipt_count": null,
      "free_receipt_count": null,
      "article_details": [],
      "hourly_sales": [],
      "table_sales": [],
      "date": "YYYY-MM-DD",
      "supplier": null,
      "invoice_number": null,
      "gross_total": null,
      "net_total": null,
      "vat_total": null,
      "tax_breakdown": [],
      "food_gross": null,
      "drinks_gross": null,
      "nonfood_gross": null,
      "other_gross": null,
      "cash_total": null,
      "card_total": null,
      "other_payments_total": null,
      "receipt_count": null,
      "sales_items": [],
      "category_sales": [],
      "notes": null,
      "image_indices": [1],
      "needs_review": true
    }
  ],
  "notes": null
}

document_type darf sein:

cash_report
monthly_report
invoice
unknown

image_indices enthält die 1-basierten
Bildnummern aus der Eingabereihenfolge.

Alle Beträge sind JSON-Zahlen,
keine Strings.

Nicht lesbare Werte sind null.

Keine erfundenen Standardwerte.

Alle Dokumente müssen überprüfbar bleiben.

Gib ausschließlich gültiges JSON zurück.
`;

    let extracted: any;
    if(savedDocument){extracted={documents:[savedDocument.extracted_data]};}else{
    const content: any[] = [{
      type: "input_text",
      text: instructions,
    }];

    for (
      let index = 0;
      index < images.length;
      index++
    ) {
      const image = images[index];

      content.push({
        type: "input_text",
        text:
          `Foto ${index + 1} von ${images.length}`,
      });

      content.push({
        type: "input_image",
        image_url:
          `data:${image.mime_type};base64,${image.image_base64}`,
        detail: "high",
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          max_output_tokens: 12000,
          store: false,
          text: {
            format: {
              type: "json_object",
            },
          },
          input: [{
            role: "user",
            content,
          }],
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorBody =
        await openaiResponse.text();

      console.error(
        "OpenAI-Fehler:",
        openaiResponse.status,
        errorBody.slice(0, 1000)
      );

      return json({
        error:
          "Die Auswertung konnte nicht abgeschlossen werden. Bitte erneut versuchen.",
      }, 502);
    }

    const result =
      await openaiResponse.json();

    if (result.status === "incomplete") {
      return json({
        error:
          "Die Auswertung war unvollständig. Bitte weniger Fotos gleichzeitig verarbeiten.",
      }, 502);
    }

    const outputText =
      getOutputText(result);


    try {
      extracted =
        JSON.parse(cleanJson(outputText));
    } catch {
      return json({
        error:
          "Die Auswertung konnte nicht gelesen werden. Bitte erneut versuchen.",
      }, 502);
    }

    if (
      !extracted ||
      !Array.isArray(extracted.documents) ||
      extracted.documents.length === 0
    ) {
      return json({
        error:
          "Keine auswertbaren Dokumente erkannt.",
      }, 422);
    }


    }
    const documents = extracted.documents.map(
      (document: any) => ({
        document_type:
          [
            "cash_report",
            "monthly_report",
            "invoice",
            "unknown",
          ].includes(document.document_type)
            ? document.document_type
            : "unknown",

        date: textOrNull(document.date),
        period_start: textOrNull(document.period_start),
        period_end: textOrNull(document.period_end),
        paid_receipt_count: count(document.paid_receipt_count),
        free_receipt_count: count(document.free_receipt_count),
        article_details: Array.isArray(document.article_details) ? document.article_details : [],
        hourly_sales: Array.isArray(document.hourly_sales) ? document.hourly_sales : [],
        table_sales: Array.isArray(document.table_sales) ? document.table_sales : [],

        supplier:
          textOrNull(document.supplier),

        invoice_number:
          textOrNull(document.invoice_number),

        gross_total:
          amount(document.gross_total),

        net_total:
          amount(document.net_total),

        vat_total:
          amount(document.vat_total),

        tax_breakdown:
          normalizeTaxBreakdown(
            document.tax_breakdown
          ),

        food_gross:
          amount(document.food_gross),

        drinks_gross:
          amount(document.drinks_gross),

        nonfood_gross:
          amount(document.nonfood_gross),

        other_gross:
          amount(document.other_gross),

        cash_total:
          amount(document.cash_total),

        card_total:
          amount(document.card_total),

        other_payments_total:
          amount(document.other_payments_total),

        receipt_count:
          count(document.receipt_count),

        sales_items:
          normalizeSalesItems(
            document.sales_items
          ),

        // NEU:
        // Artikelgruppenstatistik wird
        // vollständig an GastroPilot übergeben.
        category_sales:
          normalizeCategorySales(
            document.category_sales
          ),

        notes:
          textOrNull(document.notes),

        image_indices:
          Array.isArray(document.image_indices)
            ? [...new Set(
                document.image_indices.filter(
                  (value: unknown) =>
                    Number.isInteger(value) &&
                    Number(value) >= 1 &&
                    Number(value) <= images.length
                )
              )]
            : [],

        needs_review: !!document.needs_review,
      })
    );


    for (let i=0;i<documents.length;i++) {
      const document=documents[i];
      if(document.document_type!=="cash_report")continue;
      const selected=document.image_indices.length?document.image_indices.map(index=>images[index-1]).filter(Boolean):images;
      try{documents[i]=await verifyPrintedTaxes(document,selected,apiKey);}
      catch(error){document.needs_review=true;document.tax_verification={version:TAX_PIPELINE_VERSION,verified:false,errors:[String(error.message||error)],checked_at:new Date().toISOString()};}
    }
    if(savedDocument){
      const corrected=documents[0];
      const original=savedDocument.extracted_data||{};
      const merged={...original,...corrected,original_files:original.original_files,original_page_count:original.original_page_count,tax_reprocessed_at:new Date().toISOString()};
      if(!corrected.tax_verification?.verified){
        // Retain the old business figures when a second read remains uncertain.
        for(const key of ["gross_total","net_total","vat_total","cash_total","card_total","receipt_count","tax_breakdown","vat_breakdown","category_sales"])merged[key]=original[key];
      }
      const updated=await supabase.from("documents").update({extracted_data:merged,status:corrected.needs_review?"auto_review":"auto_imported"}).eq("id",savedDocument.id).eq("business_id",businessId).select("id").maybeSingle();
      if(updated.error||!updated.data)return json({error:"Automatische Nachprüfung konnte nicht gespeichert werden"},500);
      if(corrected.tax_verification?.verified){
        const synced=await supabase.from("bonit_daily_closings").select("id,raw_data,gross_amount").eq("business_id",businessId).eq("closing_date",savedDocument.document_date);
        if(synced.error)return json({error:"Tagesliste konnte nicht abgeglichen werden"},500);
        for(const row of synced.data||[]){
          if(!near(Number(row.gross_amount),corrected.gross_total))continue;
          const update=await supabase.from("bonit_daily_closings").update({net_amount:corrected.net_total,raw_data:{...row.raw_data,vat_breakdown:corrected.tax_breakdown,gross_total:corrected.gross_total,net_total:corrected.net_total,tax_verification:corrected.tax_verification}}).eq("id",row.id).eq("business_id",businessId);
          if(update.error)return json({error:"Steuerwerte der Tagesliste konnten nicht gespeichert werden"},500);
        }
      }
      documents[0]=merged;
    }

    const response: Record<string, unknown> = {
      success: true,
      documents,
      document_count: documents.length,
      image_count: images.length,
      requires_review: documents.some(d=>d.needs_review),
      notes: textOrNull(extracted.notes),
    };

    // Kompatibilität mit der bisherigen App.
    if (
      images.length === 1 &&
      documents.length === 1
    ) {
      response.data = documents[0];
    }

    return json(response);

  } catch (error) {
    console.error(
      "Verarbeitungsfehler:",
      error
    );

    return json({
      error:
        "Verarbeitung fehlgeschlagen. Bitte erneut versuchen.",
    }, 500);
  }
});
