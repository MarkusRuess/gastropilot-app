import {FRIEDRICH,validatePages,pagePrompt,reconcileFriedrichSummary} from './friedrich-pages.mjs';

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

function normalizePurchaseItems(value: unknown, friedrich = false) {
  const signed = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: any) => item && typeof item.name === "string" && item.name.trim())
    .map((item: any) => ({
      name: item.name.trim(),
      ...(friedrich ? {category: textOrNull(item.category), review_required: item.review_required === true, package_count: signed(item.package_count),units_per_pack: signed(item.units_per_pack),pack_size: signed(item.pack_size),pack_unit: textOrNull(item.pack_unit),total_base_quantity: signed(item.total_base_quantity),base_unit: textOrNull(item.base_unit),quantity_basis: textOrNull(item.quantity_basis),delivery_date: textOrNull(item.delivery_date),line_kind: textOrNull(item.line_kind)} : {}),
      article_number: textOrNull(item.article_number),
      quantity: friedrich ? signed(item.quantity) : quantity(item.quantity),
      unit: textOrNull(item.unit),
      unit_price_net: amount(item.unit_price_net),
      unit_price_gross: amount(item.unit_price_gross),
      line_net: friedrich ? signed(item.line_net) : amount(item.line_net),
      line_vat: friedrich ? signed(item.line_vat) : amount(item.line_vat),
      line_gross: friedrich ? signed(item.line_gross) : amount(item.line_gross),
      tax_rate: typeof item.tax_rate === "number" && Number.isFinite(item.tax_rate) ? item.tax_rate : null,
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
// Judith's daily report prints turnover and discounts by VAT rate, but often
// prints no net/VAT columns. Derive the tax split only from fully reconciled
// printed product groups; keep the calculated provenance explicit.
function reconcileJudithReport(read, gross) {
 const errors = [];
 const categories = normalizeCategorySales(read.category_sales).filter(row=>row.gross!==null);
 const groups = new Map<number,number>();
 for(const row of categories) {
  const match = String(row.name).match(/(?:^|\s)(10|12|20)\s*%/);
  if(!match){errors.push("Steuersatz der Warengruppe fehlt");continue;}
  const rate=Number(match[1]);groups.set(rate,Math.round(((groups.get(rate)||0)+row.gross)*100)/100);
 }
 if(!categories.length||!near(categories.reduce((s,r)=>s+r.gross,0),gross,0.001))errors.push("Warengruppen passen nicht zum berichtigten Umsatz");
 const lines=Array.isArray(read.printed_payment_lines)?read.printed_payment_lines:[];
 const find=(pattern)=>lines.filter(line=>pattern.test(String(line.label||"")));
 const cash=find(/bank\s*einlage\s*bar|barzahlung/i),card=find(/kreditk\.?\s*\/\s*bankomat|kartenzahlung/i);
 const credit=find(/kund\.?\s*forderungen/i).length?find(/kund\.?\s*forderungen/i):find(/^kredit$/i);
 if(cash.length!==1||card.length!==1||credit.length!==1)errors.push("Bar, Karte oder Kundenforderungen nicht eindeutig gedruckt");
 const positive=line=>typeof line?.amount==="number"&&Number.isFinite(line.amount)?Math.round(Math.abs(line.amount)*100)/100:null;
 const payments=[positive(cash[0]),positive(card[0]),positive(credit[0])];
 if(payments.some(v=>v===null)||!near(payments.reduce((s,v)=>s+(v||0),0),gross,0.001))errors.push("Zahlungsarten passen nicht zum berichtigten Umsatz");
 if(errors.length)return {errors};
 const tax_breakdown=[...groups].sort((a,b)=>a[0]-b[0]).map(([rate,groupGross])=>{
  const net=Math.round(groupGross/(1+rate/100)*100)/100;
  return {rate,gross:groupGross,net,vat:Math.round((groupGross-net)*100)/100};
 });
 const net_total=Math.round(tax_breakdown.reduce((s,r)=>s+r.net,0)*100)/100;
 const vat_total=Math.round(tax_breakdown.reduce((s,r)=>s+r.vat,0)*100)/100;
 return {errors:taxErrors({gross_total:gross,net_total,vat_total,tax_breakdown}),
  gross_total:gross,net_total,vat_total,tax_breakdown,
  cash_total:payments[0],card_total:payments[1],other_payments_total:payments[2],
  payment_methods:{cash:{label:cash[0].label,amount:payments[0]},card:{label:card[0].label,amount:payments[1]},customer_credit:{label:credit[0].label,amount:payments[2]}},
  tax_calculation:"aus gedruckten Warengruppen-Bruttobeträgen und Steuersätzen centweise berechnet"};
}
async function verifyPrintedTaxes(doc, images, apiKey, friedrich = false) {
 let prompt = `Du siehst genau EINE Originalseite eines BONit-Tagesabschlusses vom ${doc.date}. Der Tagesgesamtumsatz ist ${doc.gross_total} Euro. Eine einzelne Speisen- oder Artikelgruppen-Zwischensumme (beispielsweise 399,37 Euro) ist NICHT der Gesamtumsatz. Falls diese Seite den Summenblock unter "Gesamtumsatz brutto" nicht enthält, gib für gross_total, net_total, vat_total und tax_breakdown null beziehungsweise [] zurück. Falls diese Seite die Artikelgruppenstatistik enthält, lies deren einzelne Gruppen; falls nicht, gib category_sales: [] zurück. Erfinde keine Werte von anderen Seiten.

Für jede gedruckte Steuergruppe (zum Beispiel 10,00 und 20,00) übernimm aus der rechten Betragsspalte getrennt die Zeilen "brutto", "netto" und "Steuer". Die Zahl links (10,00 oder 20,00) ist der Steuersatz, kein Geldbetrag. Der erste Betrag einer Gruppe ist brutto, nicht netto. Lies außerdem die Gesamtzeilen für Brutto, Netto, "Gesamtumsatz brutto bar" und "Gesamtumsatz brutto unbar". Unter "Zahlarten" lies BAR Rechnung, Kreditkarte und Gutschein mit jeweiliger Anzahl und Betrag einzeln. Gutscheine sind eine eigene Zahlungsart und dürfen weder Bar noch Karte zugeschlagen werden. Bar niemals aus unbar ableiten. Rundungsunterschiede zwischen gedrucktem Gesamtnetto und Summe der Steuergruppen centgenau belegen. Übernimm die gedruckten Zahlen; unlesbare Werte sind null. Gib für JEDE Steuerzeile in printed_tax_lines Seitenzahl, gedrucktes Label, kind (gross/net/vat), rate und Betrag an. Lies nur die Artikelgruppenstatistik, keine Einzelartikel, in category_sales. Trenne Zwischensummen von Artikelgruppen. Bei Unsicherheit needs_review=true und Grund in notes. Antworte nur als JSON: {"date":"YYYY-MM-DD","gross_total":null,"net_total":null,"vat_total":null,"cash_total":null,"card_total":null,"other_payments_total":null,"receipt_count":null,"printed_payment_lines":[{"label":"BAR Rechnung","count":null,"amount":null},{"label":"Kreditkarte","count":null,"amount":null},{"label":"Gutschein","count":null,"amount":null}],"tax_breakdown":[{"rate":10,"gross":null,"net":null,"vat":null}],"printed_tax_lines":[{"page":1,"rate":10,"kind":"gross","label":"10,00 brutto","amount":null}],"category_sales":[{"name":"gedruckte Artikelgruppe","gross":null}],"needs_review":false,"notes":null}.`;
 if(!friedrich)prompt=`Du liest genau EINE Originalseite eines Tagesberichts von Judith und die Torten für ${doc.date}. Lies ausschließlich gedruckte Werte. "Umsatz berichtigt (inkl.MWSt.)" ist der Umsatz nach Rabatten, "Umsatz gesamt" vor Rabatten ist keine zweite Tagesbuchung. Lies JEDE Zeile unter WARENGRUPPENUMSÄTZE mit Betrag und MWST-Satz im Namen, z.B. "SHOP 10%" und "TORTEN 10%". Rabatte vor dem berichtigten Umsatz niemals ein zweites Mal abziehen. "Kredit", "Kund.Forderungen", "Bank Einlage Bar" und "Kreditk./Bankomatkarten" sind drei verschiedene Zahlungsarten; die letzten drei Beträge können als negative Gegenbuchung gedruckt sein. Übernimm das gedruckte Vorzeichen und die Originalbeschriftung in printed_payment_lines. Kredit niemals zu Karte oder Bar zählen. Wenn Netto/Steuer nicht gedruckt ist, gib null zurück. Lies Beleganzahl. Bei unlesbaren Zeilen needs_review=true, keine Zahlen erfinden. Gib JSON zurück: {"date":"YYYY-MM-DD","gross_total":null,"net_total":null,"vat_total":null,"cash_total":null,"card_total":null,"other_payments_total":null,"receipt_count":null,"printed_payment_lines":[{"label":"Kund.Forderungen","amount":null},{"label":"Bank Einlage Bar","amount":null},{"label":"Kreditk./Bankomatkarten","amount":null}],"tax_breakdown":[],"printed_tax_lines":[],"category_sales":[{"name":"gedruckte Warengruppe mit MWST-Satz","gross":null}],"needs_review":false,"notes":null}.`;
 const results=await Promise.allSettled(images.map(async (image,index)=>{
  const content=[{type:"input_text",text:prompt+"\nDies ist Originalseite "+(index+1)+"."},{type:"input_image",image_url:"data:"+image.mime_type+";base64,"+image.image_base64,detail:"high"}];
  const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",max_output_tokens:5000,store:false,text:{format:{type:"json_object"}},input:[{role:"user",content}]})});
  if(!res.ok)throw new Error("Originalseite "+(index+1)+": Erkennung "+res.status);
  const result=await res.json();if(result.status==="incomplete")throw new Error("Originalseite "+(index+1)+": unvollständig");
  return {...JSON.parse(cleanJson(getOutputText(result))),source_page:index+1};
 }));
 const reads=results.filter((result): result is PromiseFulfilledResult<any>=>result.status==="fulfilled").map(result=>result.value);
 if(!reads.length)throw new Error("Keine Originalseite konnte erneut gelesen werden");
 const read=reads.find(row=>near(amount(row.gross_total),doc.gross_total)&&taxErrors({gross_total:amount(row.gross_total),net_total:amount(row.net_total),vat_total:amount(row.vat_total),tax_breakdown:normalizeTaxBreakdown(row.tax_breakdown)}).length===0)
  ||reads.find(row=>near(amount(row.gross_total),doc.gross_total))
  ||reads.find(row=>Array.isArray(row.tax_breakdown)&&row.tax_breakdown.length)
  ||reads[0];
 read.printed_tax_lines=(Array.isArray(read.printed_tax_lines)?read.printed_tax_lines:[]).map(line=>({...line,page:read.source_page}));
 const categoryPages=reads.map(row=>normalizeCategorySales(row.category_sales));
 const distinctCategories=categoryPages.find(rows=>rows.length>0&&rows.every(r=>r.gross!==null)&&near(rows.reduce((sum,r)=>sum+r.gross,0),doc.gross_total))||[];
 if(friedrich){
  const paymentPage=reads.find(row=>Array.isArray(row.printed_payment_lines)&&row.printed_payment_lines.length);
  if(paymentPage)Object.assign(read,{printed_payment_lines:paymentPage.printed_payment_lines});
  const paymentErrors=reconcileFriedrichSummary(read,{gross_total:doc.gross_total});
  if(paymentErrors.length)read.needs_review=true;
  read.summary_errors=paymentErrors;
 }
 const candidate={...doc,gross_total:amount(read.gross_total),net_total:amount(read.net_total),vat_total:amount(read.vat_total),tax_breakdown:normalizeTaxBreakdown(read.tax_breakdown)};
 let judithSummary;
 if(!friedrich){
  judithSummary=reconcileJudithReport(read,doc.gross_total);
  if(!judithSummary.errors.length)Object.assign(candidate,judithSummary);
 }
 const errors=friedrich?taxErrors(candidate):[...judithSummary.errors];
 if(friedrich)errors.push(...(read.summary_errors||[]));
 if(read.date&&read.date!==doc.date)errors.push("Datum der Steuerseite weicht ab");
 if(!near(candidate.gross_total,doc.gross_total))errors.push("Bruttoumsatz weicht vom gespeicherten Abschluss ab");
 if(read.needs_review)errors.push(textOrNull(read.notes)||"Gedruckte Steuerzeilen nicht eindeutig");
 if(friedrich){
  if(!Array.isArray(read.printed_tax_lines)||read.printed_tax_lines.length<candidate.tax_breakdown.length*3)errors.push("Gedruckte Steuerzeilen nicht vollständig belegt");
  for(const row of candidate.tax_breakdown){for(const kind of ["gross","net","vat"]){const line=(read.printed_tax_lines||[]).find(l=>l.rate===row.rate&&l.kind===kind);if(!line||!near(amount(line.amount),row[kind],0.001))errors.push("Gedruckte Steuerzeile stimmt nicht mit übernommener Zahl überein");}}
 }
 candidate.tax_verification={version:TAX_PIPELINE_VERSION,method:"printed_summary_per_page",model:"gpt-4.1-mini",verified:errors.length===0,errors,printed_tax_lines:read.printed_tax_lines||[],read_candidate:{source_page:read.source_page,gross_total:read.gross_total,net_total:read.net_total,vat_total:read.vat_total,tax_breakdown:read.tax_breakdown,category_sales:distinctCategories,notes:read.notes},pages_read:reads.length,pages_total:images.length,checked_at:new Date().toISOString()};
 if(errors.length){
  // A conflicting second OCR read must not replace arithmetically consistent
  // original figures or report its errors as defects of the stored figures.
  const storedErrors=taxErrors(doc);
  doc.tax_verification=candidate.tax_verification;
  doc.needs_review=true;
  doc.notes=[
    ...(storedErrors.length ? storedErrors.map(e=>"Gespeicherte Werte: "+e) : []),
    ...errors.map(e=>"Erneute Originalerkennung: "+e)
  ].join("; ");
  return doc;
}
 for(const key of friedrich?["cash_total","card_total","other_payments_total","receipt_count"]:["receipt_count"]){if(typeof read[key]==="number")candidate[key]=key==="receipt_count"?count(read[key]):amount(read[key]);}
 if(friedrich&&read.printed_payment_lines)candidate.printed_payment_lines=read.printed_payment_lines;
 if(!near((candidate.cash_total||0)+(candidate.card_total||0)+(candidate.other_payments_total||0),candidate.gross_total))errors.push("Zahlungsarten passen nicht zum Umsatz");
 const categories=normalizeCategorySales(distinctCategories);
 const groupsComplete=results.every(result=>result.status==="fulfilled")&&categories.length>0&&categories.every(r=>r.gross!==null)&&near(categories.reduce((a,r)=>a+r.gross,0),candidate.gross_total);
 candidate.category_sales_verification={verified:groupsComplete,pages_read:reads.length,pages_total:images.length,checked_at:new Date().toISOString()};
 if(groupsComplete)candidate.category_sales=categories;
 else{candidate.category_sales_candidate=categories;errors.push("Artikelgruppen nicht vollständig abgeglichen");}
 candidate.vat_breakdown=candidate.tax_breakdown;
 candidate.needs_review=errors.length>0;
 candidate.tax_verification.verified=true;candidate.tax_verification.errors=[];candidate.document_validation_errors=[...errors];
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
        : body.mode === "invoice_items"
          ? "invoice_items"
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
      const expectedType=body.mode==="invoice_items"?"invoice":"cash_report";
      const existing=await supabase.from("documents").select("*").eq("id",body.document_id).eq("business_id",businessId).eq("document_type",expectedType).maybeSingle();
      if(existing.error||!existing.data)return json({error:"Beleg nicht gefunden oder kein Zugriff"},404);
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

      // Reject truncated/empty uploads before any OCR request or database write.
      // Checking the decoded signature also catches base64 text mislabeled as an image.
      const compact = image.image_base64.replace(/\\s/g, "");
      if (compact.length < 136 || compact.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
        return json({error: "Foto leer oder beschädigt. Bitte erneut aufnehmen."}, 422);
      }
      let header: string;
      try { header = atob(compact.slice(0, 32)); }
      catch { return json({error: "Foto enthält ungültige Bilddaten."}, 422); }
      const bytes = Array.from(header, c => c.charCodeAt(0));
      const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const png = bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
      const webp = header.slice(0, 4) === "RIFF" && header.slice(8, 12) === "WEBP";
      if (!((image.mime_type === "image/jpeg" && jpeg) ||
            (image.mime_type === "image/png" && png) ||
            (image.mime_type === "image/webp" && webp))) {
        return json({error: "Fotoformat stimmt nicht mit den Bilddaten überein."}, 422);
      }
      totalLength += compact.length;
    }

    if (totalLength > MAX_TOTAL_BASE64_LENGTH) {
      return json({
        error:
          "Die Fotos sind insgesamt zu groß. Bitte weniger Fotos gleichzeitig hochladen.",
      }, 413);
    }


    if(savedDocument && businessId===FRIEDRICH && body.mode==='article_sales'){
      const old=savedDocument.extracted_data;
      const cached=old.article_sales_verification;
      const fingerprint=await Promise.all(images.map(async im=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(im.mime_type+':'+im.image_base64)))).map(x=>x.toString(16).padStart(2,'0')).join('')));
      if(cached?.version===2 && cached.verified && JSON.stringify(cached.source_fingerprint)===JSON.stringify(fingerprint) && Array.isArray(old.sales_items))return json({documents:[old],updated:false,reused:true});
      const apiKey=Deno.env.get('OPENAI_API_KEY');if(!apiKey)return json({error:'KI-Schlüssel fehlt'},500);
      const expected={...old,date:savedDocument.document_date,
        cash_total:old.tax_verification?.verified?old.cash_total:null,
        card_total:old.tax_verification?.verified?old.card_total:null};
      const result=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',max_output_tokens:24000,store:false,text:{format:{type:'json_object'}},input:[{role:'user',content:[{type:'input_text',text:pagePrompt(expected,images.length)},...images.flatMap((im,i)=>[{type:'input_text',text:'Foto '+(i+1)+' von '+images.length},{type:'input_image',image_url:'data:'+im.mime_type+';base64,'+im.image_base64,detail:'high'}])]}]})});
      if(!result.ok)return json({error:'Originalauswertung fehlgeschlagen; vorhandene Daten erhalten.'},502);
      const model=await result.json();if(model.status==='incomplete')return json({error:'Originalauswertung unvollständig; keine Artikelübernahme.'},422);
      const read=JSON.parse(cleanJson(getOutputText(model)));
      const summaryErrors=reconcileFriedrichSummary(read,expected);
      const validation=validatePages(read,expected,images.length);
      validation.errors.push(...summaryErrors);
      if(validation.errors.length){
        await supabase.from('documents').update({extracted_data:{...old,article_sales_review:{errors:validation.errors,pages:read.pages,checked_at:new Date().toISOString()}}}).eq('id',savedDocument.id).eq('business_id',FRIEDRICH);
        return json({error:validation.errors.join(' '),requires_review:true},422);
      }
      const imported=await supabase.rpc('gp_f_import_bonit_articles',{p_document:savedDocument.id,p_z:String(read.z_number),p_sales:read.sales_items});
      if(imported.error)return json({error:imported.error.message},409);
      const patch={z_number:String(read.z_number),sales_items:read.sales_items,cash_total:read.cash_total,card_total:read.card_total,paid_receipt_count:read.cash_count+read.card_count,free_receipt_count:read.free_count,payment_methods:{cash:{count:read.cash_count,amount:read.cash_total},card:{count:read.card_count,amount:read.card_total}},receipt_count_verification:{version:2,verified:true,method:'all_original_pages',printed_payment_lines:read.printed_payment_lines,checked_at:new Date().toISOString()},printed_payment_lines:read.printed_payment_lines,tax_breakdown:read.tax_breakdown,returns:read.returns,needs_review:validation.warnings.length>0,article_sales_verification:{version:2,verified:true,method:'all_original_pages',source_fingerprint:fingerprint,pages_total:images.length,pages:read.pages,warnings:validation.warnings,checked_at:new Date().toISOString()}};
      const updated=await supabase.from('documents').update({extracted_data:{...old,...patch}}).eq('id',savedDocument.id).eq('business_id',FRIEDRICH);
      if(updated.error)return json({error:'Artikel gespeichert, Prüfstatus noch nicht gespeichert; Wiederholung erzeugt keine doppelte Buchung.'},500);
      const closings=await supabase.from('bonit_daily_closings').select('id,raw_data').eq('business_id',FRIEDRICH).eq('closing_date',savedDocument.document_date).eq('z_number',String(read.z_number));
      if(closings.error)return json({error:'Abschluss-Prüfstatus konnte nicht geladen werden.'},500);
      for(const c of closings.data||[]){const u=await supabase.from('bonit_daily_closings').update({raw_data:{...c.raw_data,...patch}}).eq('id',c.id).eq('business_id',FRIEDRICH);if(u.error)return json({error:'Abschluss-Prüfstatus noch offen.'},500);}
      return json({documents:[{...old,...patch}],updated:true,requires_review:validation.warnings.length>0,warnings:validation.warnings});
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return json({
        error: "KI-Schlüssel fehlt",
      }, 500);
    }


    if(savedDocument && ["paid_receipts","article_sales"].includes(body.mode)){
      const prompt='Lies die vier Spalten Artikelnummer, Menge, Einzelpreis, Gesamt zeilenweise exakt vom Bild. Gesamt ist Menge mal Einzelpreis; nimm den Gesamtbetrag aus der rechten Betragsspalte und verwechsle ihn nie mit dem Einzelpreis. Keine Preise aus Erinnerung. Der Gesamtbruttoumsatz ist '+savedDocument.extracted_data.gross_total+'. '+(body.mode==='article_sales'?'Lies die Z-Nummer und gib z_number als Zeichenfolge zurück. Lies zusätzlich ALLE Artikelzeilen aller Seiten vollständig. Ergänze sales_items:[{article_number,name,quantity,unit_price,gross_amount}]. Menge, Einzelpreis und Gesamtbetrag stehen in getrennten Spalten. Auch kostenlose Artikel mit 0 Euro aufnehmen. Rücknahmenliste NICHT nochmals addieren. Die Artikelgesamtsumme muss dem Tagesbruttoumsatz entsprechen. Nicht schätzen. ':'')+'Lies die Zahlarten und Anzahl Rechnungen aus dem BONit-Original. Bar und Kreditkarte sind BEZAHLTE Rechnungen. Personal/Einladung mit 0 ist kostenlos. Teilbetrag bar NICHT als zusätzlichen Bon zählen. Kein Schätzen. Liefere JSON mit date,gross_total,receipt_count,cash_count,card_count,free_count,printed_payment_lines:[{label,count,amount}]. Die Summe cash_count+card_count+free_count muss der Anzahl Rechnungen entsprechen. Erwartetes Datum '+savedDocument.document_date+'.';
      const result=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",max_output_tokens:16000,store:false,text:{format:{type:"json_object"}},input:[{role:"user",content:[{type:"input_text",text:prompt},...images.map(image=>({type:"input_image",image_url:"data:"+image.mime_type+";base64,"+image.image_base64}))]}]})});
      if(!result.ok)return json({error:"Bonzahlen konnten nicht gelesen werden"},502);
      const model=await result.json();if(model.status==="incomplete")return json({error:"Originalauswertung unvollständig. Bitte erneut versuchen."},422);const read=JSON.parse(cleanJson(getOutputText(model)));
      const counts=[read.receipt_count,read.cash_count,read.card_count,read.free_count];
      if(counts.some(x=>!Number.isInteger(x)||x<0)||read.cash_count+read.card_count+read.free_count!==read.receipt_count||read.receipt_count!==savedDocument.extracted_data.receipt_count||read.date!==savedDocument.document_date||Math.abs(read.gross_total-savedDocument.extracted_data.gross_total)>.02)return json({error:"Bonzahlen nicht vollständig mit Originalsumme abgeglichen"},422);
      const lines=read.printed_payment_lines||[];
      const cashLine=lines.find(x=>/bar/i.test(x.label)&&!/teil/i.test(x.label)),cardLine=lines.find(x=>/kredit|karte/i.test(x.label)),freeLine=lines.find(x=>/personal|einladung/i.test(x.label));
      if(!cashLine||!cardLine||!freeLine||cashLine.count!==read.cash_count||cardLine.count!==read.card_count||freeLine.count!==read.free_count||Math.abs(cashLine.amount+cardLine.amount-read.gross_total)>.02)return json({error:"Gedruckte Zahlarten nicht eindeutig"},422);
      const sales=read.sales_items;
      if(body.mode==="article_sales"&&(!Array.isArray(sales)||!sales.length||sales.some(x=>typeof x.name!=="string"||!Number.isFinite(x.quantity)||!Number.isFinite(x.unit_price)||!Number.isFinite(x.gross_amount)||Math.abs(x.quantity*x.unit_price-x.gross_amount)>.02)||Math.abs(sales.reduce((a,x)=>a+x.gross_amount,0)-read.gross_total)>.03))return json({error:"Artikelzeilen noch nicht vollständig mit Tagesumsatz abgeglichen"},422);
      if(body.mode==="article_sales"){
        if(businessId!=="6a5484d1-daf6-4263-897d-24cdf536aa29")return json({error:"Einzelartikel-Sofortimport ist nur für Das Friedrich freigegeben"},403);
        const z=String(read.z_number||"").trim();
        if(!/^\d{3,8}$/.test(z))return json({error:"Z-Nummer nicht eindeutig erkannt"},422);
        const existing=await supabase.from("bonit_article_sales").select("id,gross_amount").eq("business_id",businessId).eq("closing_date",savedDocument.document_date).eq("z_number",z);
        if(existing.error)return json({error:"Artikel-Dublettenprüfung fehlgeschlagen"},500);
        if(existing.data?.length){
          const oldSum=existing.data.reduce((n:any,row:any)=>n+Number(row.gross_amount||0),0);
          if(existing.data.length!==sales.length||Math.abs(oldSum-read.gross_total)>.03)return json({error:"Für diese Z-Nummer liegen bereits abweichende Einzelartikel vor; manueller Abgleich nötig"},409);
        }else{
          const rows=sales.map((item:any,i:number)=>({
            business_id:businessId,closing_date:savedDocument.document_date,z_number:z,
            source_key:"upload:"+businessId+":"+z+":"+(i+1),
            article_number:String(item.article_number||"").trim()||null,
            article_name:item.name.trim(),quantity:item.quantity,gross_amount:item.gross_amount,
            raw_data:{source:"photo-upload",document_id:savedDocument.id,unit_price:item.unit_price,verified:true}
          }));
          const inserted=await supabase.from("bonit_article_sales").insert(rows);
          if(inserted.error)return json({error:"Einzelartikel konnten nicht gespeichert werden: "+inserted.error.message},500);
        }
      }
      const patch={...(body.mode==="article_sales"?{sales_items:sales,article_sales_verification:{version:1,verified:true,method:"original_article_rows",checked_at:new Date().toISOString()}}:{}),paid_receipt_count:read.cash_count+read.card_count,free_receipt_count:read.free_count,payment_methods:{cash:{count:read.cash_count},card:{count:read.card_count}},receipt_count_verification:{version:1,verified:true,method:"original_payment_rows",printed_payment_lines:lines,checked_at:new Date().toISOString()}};
      const updated=await supabase.from("documents").update({extracted_data:{...savedDocument.extracted_data,...patch}}).eq("id",savedDocument.id).eq("business_id",businessId);
      if(updated.error)return json({error:"Bonzahlen konnten nicht gespeichert werden"},500);
      const closings=await supabase.from("bonit_daily_closings").select("id,raw_data").eq("business_id",businessId).eq("closing_date",savedDocument.document_date);
      if(closings.error)return json({error:"Tagesabschluss konnte nicht abgeglichen werden"},500);
      for(const closing of closings.data||[]){const sync=await supabase.from("bonit_daily_closings").update({raw_data:{...closing.raw_data,...patch}}).eq("id",closing.id).eq("business_id",businessId);if(sync.error)return json({error:"Tagesabschluss konnte nicht aktualisiert werden"},500);}
      return json({documents:[{...savedDocument.extracted_data,...patch}],updated:true});
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

z_number ist ausschließlich die ausdrücklich gedruckte Z-Nummer eines Tagesabschlusses; fehlt sie (zum Beispiel in einem anderen Kassenformat), gib null zurück. Eine Berichtsnummer ist keine Z-Nummer.

Prüfe die Bildnummern, Seitenüberschriften, Belegnummern und Datumsangaben.
Mehrere Seiten derselben Tagesabrechnung gehören zu EINEM Dokument;
setze image_indices auf alle zugehörigen Bilder in Eingabereihenfolge.
Eine gemeinsam hochgeladene Lieferantenrechnung oder ein anderer
Tagesabschluss bleibt ein separates Dokument. Vermische niemals
verschiedene Belege oder unterschiedliche Berichtszeiträume.
Das Tagesdatum kann auf einer anderen Seite als der Gesamtbetrag stehen:
lies alle zugehörigen Seiten, bevor du date bestimmst. Verwende das
Abschlussdatum des Berichts, nicht Uploadzeit, Druckzeit oder ein Datum
eines einzelnen Bons. Falls mehrere widersprüchliche Datumsangaben
vorliegen, setze date auf null und needs_review auf true.

Erfasse:

date:
Tatsächliches Datum der Tagesabrechnung
im Format YYYY-MM-DD.

gross_total:
Gesamter Bruttoumsatz des Tages.
Nimm den ausgewiesenen Tagesgesamtumsatz aus der Abschlussübersicht.
Artikelgruppen, einzelne Seiten, Zahlungsarten, Steuern, Stornos und
Zwischensummen sind keine zusätzlichen Tagesumsätze. Falls der
Gesamtbetrag auf den vorliegenden Seiten nicht lesbar oder der Bericht
offensichtlich unvollständig ist, setze gross_total auf null und
needs_review auf true; errechne keinen vermuteten Gesamtbetrag.

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
sofern sinnvoll erkennbar; aus Kompatibilitätsgründen beibehalten.

purchase_items = JEDE lesbare Rechnungsposition einzeln:
name, article_number, quantity, unit, unit_price_net,
unit_price_gross, line_net, line_vat, line_gross, tax_rate.
Übernimm Menge, Einheit, Einzelpreis und Positionssumme genau
aus den gedruckten Spalten. Fehlt ein Wert oder ist er unlesbar,
setze null. Erfinde und schätze nichts. Ordne Preise nicht der
falschen Position zu. Mengenangaben wie kg, l, Stück und Gebinde
exakt übernehmen. Wenn der Beleg nur einen Einzelpreis oder nur
eine Positionssumme zeigt, fülle nur diesen eindeutig gedruckten
Wert. Produkte und Preise dienen der späteren Einkaufskalkulation.

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
      "z_number": null,
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
      "purchase_items": [],
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
    if(savedDocument && body.mode!=="invoice_items"){extracted={documents:[savedDocument.extracted_data]};}else{
    const content: any[] = [{
      type: "input_text",
      text: instructions + (businessId === "6a5484d1-daf6-4263-897d-24cdf536aa29" ? `
FRIEDRICH LAGER: category je Position ausschließlich food, beverage, coffee, merchandise, cleaning, consumables, packaging, equipment oder unknown. Unlesbare/mehrdeutige Produktidentität: review_required=true. Keine Flaschengröße aus Produktwissen ergänzen. Jede Rechnungsposition zusätzlich mit package_count, units_per_pack, pack_size, pack_unit, total_base_quantity, base_unit, quantity_basis, delivery_date, line_kind (goods/deposit/transport) erfassen. quantity und unit bleiben unverändert aus der gedruckten Mengenspalte. total_base_quantity ist die tatsächlich gelieferte Gesamtmenge in l, g oder Stück. Wenn quantity bereits Gesamtstücke ist, Kartoninhalt NICHT nochmals multiplizieren. quantity_basis erläutert dies. Unklare Gebinde null statt Annahmen. Retouren mit negativem Vorzeichen; Pfand und Transportgebinde getrennt. Mengen und Netto-Einzelpreise getrennt von Positionssummen. Lieferdatum aus Beleg; fehlt es, null. Handschriftliche Zähllisten als document_type unknown mit inventory_counts:[{name,quantity,unit,counted_at}] erkennen, keine Rechnung daraus machen. Nur lesbare Angaben übernehmen, Zählzeit niemals erfinden.
` : ""),
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
        z_number: textOrNull(document.z_number),
        ...(businessId === "6a5484d1-daf6-4263-897d-24cdf536aa29" ? {delivery_date:textOrNull(document.delivery_date), inventory_counts:Array.isArray(document.inventory_counts)?document.inventory_counts.map((x:any)=>({name:textOrNull(x.name),quantity:quantity(x.quantity),unit:textOrNull(x.unit),counted_at:textOrNull(x.counted_at)})).filter((x:any)=>x.name):[]} : {}),
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

        purchase_items:
          normalizePurchaseItems(document.purchase_items, businessId === "6a5484d1-daf6-4263-897d-24cdf536aa29"),

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


    if(savedDocument && body.mode==="invoice_items"){
      const recognized=documents[0];
      if(!recognized || recognized.document_type!=="invoice" || !recognized.purchase_items.length){
        return json({error:"Keine Produktpositionen mit ausreichend lesbaren Mengen/Preisen erkannt. Originalrechnung bleibt unverändert."},422);
      }
      const original=savedDocument.extracted_data||{};
      const merged={...original,...(businessId === "6a5484d1-daf6-4263-897d-24cdf536aa29" ? {delivery_date:recognized.delivery_date} : {}),purchase_items:recognized.purchase_items,purchase_items_checked_at:new Date().toISOString(),purchase_items_source:"original_invoice_reprocess"};
      const updated=await supabase.from("documents").update({extracted_data:merged}).eq("id",savedDocument.id).eq("business_id",businessId).select("id").maybeSingle();
      if(updated.error||!updated.data)return json({error:"Produktpositionen konnten nicht im Archiv gespeichert werden"},500);
      return json({success:true,updated:true,documents:[{...recognized,...merged}]});
    }

    for (let i=0;i<documents.length;i++) {
      const document=documents[i];
      if(document.document_type!=="cash_report")continue;
      if(body.defer_tax_verification===true && !savedDocument){
        document.needs_review=true;
        document.tax_verification={version:0,verified:false,errors:["Steuerprüfung im Archiv ausstehend"],checked_at:new Date().toISOString()};
        continue;
      }
      const selected=document.image_indices.length?document.image_indices.map(index=>images[index-1]).filter(Boolean):images;
      try{documents[i]=await verifyPrintedTaxes(document,selected,apiKey,businessId===FRIEDRICH);}
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
      if(businessId===FRIEDRICH&&(!merged.article_sales_verification?.verified||merged.article_sales_verification.warnings?.length)){
        merged.needs_review=true;
        merged.notes=[merged.notes,'Artikelpositionen nicht vollständig bestätigt'].filter(Boolean).join('; ');
      }
      const updated=await supabase.from("documents").update({extracted_data:merged,status:corrected.tax_verification?.verified?(merged.needs_review?"auto_review":"auto_imported"):savedDocument.status}).eq("id",savedDocument.id).eq("business_id",businessId).select("id").maybeSingle();
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

    if(businessId===FRIEDRICH&&!savedDocument)for(const d of documents)if(d.document_type==='cash_report'){d.article_candidates=d.sales_items;d.sales_items=[];}

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

