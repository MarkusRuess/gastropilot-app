import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json"}});
const encoder=new TextEncoder();
function constantTime(a:string,b:string){const x=encoder.encode(a),y=encoder.encode(b);let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)d|=(x[i]||0)^(y[i]||0);return d===0}

// Convert HTML-only emails into readable plain text without paid AI or storing HTML.
function htmlToPlainText(html:string){
 const source=html.slice(0,500000).replace(/<!--[\s\S]*?-->/g,"").replace(/<(script|style|head|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,"");
 const lines=source.replace(/<\s*br\s*\/?\s*>/gi,"\n").replace(/<\s*\/\s*(?:p|div|tr|li|h[1-6]|table|section)\s*>/gi,"\n").replace(/<[^>]+>/g," ");
 const decoded=lines.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp|euro);/gi,(_,e)=>{const key=e.toLowerCase();const named:{[k:string]:string}={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",euro:"€"};if(key[0]==="#"){const cp=key[1]==="x"?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):" "}return named[key]||" "});
 return decoded.replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").replace(/\n{3,}/g,"\n\n").trim().slice(0,200000);
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const secret=Deno.env.get("RESEND_WEBHOOK_SECRET");
 const apiKey=Deno.env.get("RESEND_API_KEY");
 const url=Deno.env.get("SUPABASE_URL");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!apiKey||!url||!service)return reply({error:"Webhook not configured"},503);
 const id=req.headers.get("svix-id"),timestamp=req.headers.get("svix-timestamp"),signature=req.headers.get("svix-signature");
 if(!id||!timestamp||!signature||!/^\d+$/.test(timestamp))return reply({error:"Signature missing"},401);
 if(Math.abs(Date.now()/1000-Number(timestamp))>300)return reply({error:"Signature expired"},401);
 const raw=await req.text();
 try{
  const key=Uint8Array.from(atob(secret.replace(/^whsec_/,"")),c=>c.charCodeAt(0));
  const cryptoKey=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=new Uint8Array(await crypto.subtle.sign("HMAC",cryptoKey,encoder.encode(id+"."+timestamp+"."+raw)));
  const computed=btoa(String.fromCharCode(...digest));
  if(!signature.split(" ").some(x=>x.startsWith("v1,")&&constantTime(x.slice(3),computed)))return reply({error:"Invalid signature"},401);
 }catch{return reply({error:"Invalid signature"},401)}
 let event:any;
 try{event=JSON.parse(raw)}catch{return reply({error:"Invalid JSON"},400)}
 if(event.type!=="email.received")return reply({ok:true,ignored:true});
 const emailId=event.data?.email_id;
 if(typeof emailId!=="string"||!emailId)return reply({error:"Missing email ID"},400);
 const response=await fetch("https://api.resend.com/emails/receiving/"+encodeURIComponent(emailId),{headers:{Authorization:"Bearer "+apiKey}});
 if(!response.ok)return reply({error:"Unable to retrieve received email",code:response.status},502);
 const message=await response.json();
 const sender=typeof message.from==="string"?message.from:"";
 const recipients=Array.isArray(message.to)?message.to.join(", "):String(message.to||"");
 const subject=String(message.subject||"");
 const body=(String(message.text||"").trim()||htmlToPlainText(String(message.html||""))).slice(0,200000);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:stored,error}=await db.from("judith_ai_mail_messages").upsert({provider_message_id:emailId,direction:"inbound",sender_email:sender,recipient_email:recipients,subject,body_text:body,received_at:message.created_at||new Date().toISOString()},{onConflict:"provider_message_id"}).select("id").single();
 if(error||!stored)return reply({error:"Storage failed"},503);
 // Fetch each attachment via the authenticated Resend receiving API; never expose Resend URLs to browsers.
 let attachmentCount=0;
 const invoiceAttachments:{id:string,mime:string,name:string}[]=[];
 const attachmentResponse=await fetch("https://api.resend.com/emails/receiving/"+encodeURIComponent(emailId)+"/attachments",{headers:{Authorization:"Bearer "+apiKey}});
 if(attachmentResponse.ok){
  const listing=await attachmentResponse.json();
  const attachments=Array.isArray(listing.data)?listing.data:Array.isArray(listing)?listing:[];
  for(const a of attachments.slice(0,20)){
   const attachmentId=String(a.id||"");
   const mime=String(a.content_type||a.contentType||"").toLowerCase();
   const name=String(a.filename||"Anhang").slice(0,180);
   if(!attachmentId||!["image/jpeg","image/png","image/webp","image/gif","application/pdf"].includes(mime))continue;
   const path=stored.id+"/"+encodeURIComponent(attachmentId);
   const {data:existing}=await db.from("judith_ai_attachments").select("id").eq("storage_path",path).maybeSingle();
   if(existing)continue;
   let downloadUrl=typeof a.download_url==="string"?a.download_url:"";
   if(!downloadUrl){
    const detail=await fetch("https://api.resend.com/emails/receiving/"+encodeURIComponent(emailId)+"/attachments/"+encodeURIComponent(attachmentId),{headers:{Authorization:"Bearer "+apiKey}});
    if(!detail.ok)continue;
    const detailJson=await detail.json();downloadUrl=String(detailJson.download_url||"");
   }
   if(!downloadUrl)continue;
   const fileResponse=await fetch(downloadUrl);
   if(!fileResponse.ok)continue;
   const bytes=await fileResponse.arrayBuffer();
   if(bytes.byteLength>10485760||bytes.byteLength===0)continue;
   const uploaded=await db.storage.from("judith-ai-attachments").upload(path,bytes,{contentType:mime,upsert:false});
   if(uploaded.error)continue;
   const inserted=await db.from("judith_ai_attachments").insert({message_id:stored.id,provider_attachment_id:attachmentId,filename:name,mime_type:mime,byte_size:bytes.byteLength,storage_path:path}).select("id").single();
   if(inserted.error){await db.storage.from("judith-ai-attachments").remove([path]);continue}
   attachmentCount++;
   if(/rechnung|invoice|faktura|beleg/i.test(subject+" "+name))invoiceAttachments.push({id:inserted.data?.id||"",mime,name});
  }
 }
 // Hand over stored originals only. A failed OCR never rejects or alters the inbound mail.
 const eligible=invoiceAttachments.filter(f=>f.id&&(f.mime==="application/pdf"||f.mime.startsWith("image/")&&!/(?:logo|signatur|signature|footer|icon|pixel|banner)/i.test(f.name)));
 for(const entry of eligible.filter((entry,index,all)=>entry.mime==="application/pdf"||all.findIndex(f=>f.mime.startsWith("image/"))===index)){
  const attachment_id=entry.id;
  const work=fetch(url+"/functions/v1/judith-mail-invoice",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({action:"analyze",attachment_id})}).then(async r=>{if(!r.ok)console.error("Invoice intake",r.status)}).catch(e=>console.error("Invoice intake unavailable",String(e)));
  try{EdgeRuntime.waitUntil(work)}catch{await work}
 }

 // Receipt acknowledgement: only customer inquiries, never invoices, newsletters or automated senders.
 // The unique message_id ledger is claimed BEFORE contacting Resend: parallel webhook retries cannot duplicate sends.
 const senderAddress=(sender.match(/<([^<>]+@[^<>]+)>/)?.[1]||sender).trim().toLowerCase();
 if(/^KI-KONTROLLE\s*·/i.test(subject)&&senderAddress.endsWith("@mail.judithwalli.at"))return reply({ok:true,stored:true,internal_control:true});
 const automated=/no-?reply|do-?not-?reply|mailer-daemon|postmaster|newsletter|notification/i.test(senderAddress);
 const invoiceLike=invoiceAttachments.length>0||/rechnung|invoice|faktura|mahnung|beleg|gutschrift/i.test(subject);
 const inquiryLike=/anfrage|torte|hochzeit|bestellung|kuchen|angebot|geburtstag|feier/i.test(subject);
 if(inquiryLike&&!invoiceLike&&!automated&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderAddress)&&!senderAddress.endsWith("@judithwalli.at")){
  const from=Deno.env.get("JUDITH_MAIL_FROM");
  if(from){
   const {error:claimError}=await db.from("judith_ai_mail_acknowledgements").insert({message_id:stored.id,recipient_email:senderAddress,status:"reserved"});
   if(!claimError){
    const hasPhone=(s)=>{const clean=s.replace(/https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi," ");return (clean.match(/(?:\+|00)?\d(?:[\d \t().\/-]*\d)?/g)||[]).some(n=>{const d=n.replace(/\D/g,"");return d.length>=7&&d.length<=15&&(/^(?:\+|00|0)/.test(n)||/(?:tel(?:efon)?|mobil|handy|phone|rufnummer)\s*[:.]?\s*$/i.test(clean.slice(Math.max(0,clean.indexOf(n)-30),clean.indexOf(n))))&&!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(n)&&!/^0\d{7}$/.test(n.replace(/[ .\/-]/g,""))});};
    let phoneKnown=hasPhone(body)||hasPhone((String(message.html||"").match(/href\s*=\s*["']tel:[^"']+["']/gi)||[]).map(s=>s.replace(/^.*tel:/i,"").slice(0,-1)).join("\n"));
    let lookupOk=true;
    if(!phoneKnown){try{const {data,error}=await db.from("judith_ai_customers").select("phone").ilike("email",senderAddress.replace(/[%_\\]/g,c=>"\\"+c)).limit(20);lookupOk=!error;phoneKnown=(data||[]).some(c=>typeof c.phone==="string"&&c.phone.replace(/\D/g,"").length>=7)}catch{lookupOk=false}}
    const askPhone=lookupOk&&!phoneKnown;
    let acknowledgement="Vielen lieben Dank für die Anfrage!\n\nWir freuen uns sehr über das Interesse an unseren handgefertigten Produkten.\n\nDie Anfrage ist gut bei uns angekommen.\nWir melden uns so bald wie möglich persönlich zurück.\n\nGanz liebe Grüße aus der Backstube\nJudith Walli & Team\n\n02252 266066\n office@judithwalli.at\nwww.judithwalli.at";
    let acknowledgementHtml="<!doctype html><html lang=\"de\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body style=\"margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#444444\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tr><td align=\"center\" style=\"padding:16px\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;border:8px solid #f7dce2;border-radius:20px;background:#ffffff\"><tr><td align=\"center\" style=\"padding:28px 18px\"><img src=\"https://judithwalli.at/wp-content/uploads/2019/09/judithunddietorten300px-300x300.png\" width=\"120\" height=\"120\" alt=\"Judith und die Torten\" style=\"display:block;margin:0 auto;border:0\"><p style=\"font-size:11px;letter-spacing:2px;color:#ae6879;margin:20px 0\">MEISTERKONDITOREI · BADEN BEI WIEN</p><div style=\"border-top:1px solid #e9b9c4\"></div><h1 style=\"font-size:23px;line-height:1.35;color:#a84f66;margin:26px 0 20px\">Vielen lieben Dank für die Anfrage!</h1><p style=\"font-size:16px;line-height:1.65\">Wir freuen uns sehr über das Interesse an unseren handgefertigten Produkten.</p><p style=\"font-size:16px;line-height:1.65\">Die Anfrage ist gut bei uns angekommen.<br>Wir melden uns so bald wie möglich persönlich zurück.</p><p style=\"font-size:16px;line-height:1.65;margin:26px 0\">Ganz liebe Grüße aus der Backstube<br><strong style=\"font-style:italic;color:#a84f66\">Judith Walli &amp; Team</strong></p><div style=\"border-top:1px solid #e9b9c4\"></div><p style=\"font-size:14px;line-height:1.8;margin:20px 0 0\"><a style=\"color:#a84f66\" href=\"tel:+432252266066\">02252 266066</a><br><a style=\"color:#a84f66\" href=\"mailto:office@judithwalli.at\">office@judithwalli.at</a><br><a style=\"color:#a84f66\" href=\"https://www.judithwalli.at/\">www.judithwalli.at</a></p></td></tr></table></td></tr></table></body></html>";
    if(askPhone){acknowledgement=acknowledgement.replace("\n\nGanz liebe Grüße","\n\nDamit wir die Tortenwünsche auch persönlich besprechen können, bitten wir noch um Bekanntgabe einer Telefonnummer.\n\nGanz liebe Grüße");acknowledgementHtml=acknowledgementHtml.replace('<p style="font-size:16px;line-height:1.65;margin:26px 0">Ganz liebe Grüße','<p style="font-size:16px;line-height:1.65">Damit wir die Tortenwünsche auch persönlich besprechen können, bitten wir noch um Bekanntgabe einer Telefonnummer.</p><p style="font-size:16px;line-height:1.65;margin:26px 0">Ganz liebe Grüße')}
    // Ask only for missing cake inquiry details; never quote prices or confirm availability.
    const cakeInquiry=/torte|hochzeit|kuchen|geburtstag/i.test(subject+" "+body);
    const parseRequestedDate=(input:string)=>{
     const source=input.toLowerCase();
     for(const m of source.matchAll(/\b(\d{6}|\d{8})\b/g)){const raw=m[1],day=+raw.slice(0,2),month=+raw.slice(2,4),year=raw.length===6?2000+ +raw.slice(4,6):+raw.slice(4,8);const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day)return d.toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"});}
     const n=source.match(/\b([0-3]?\d)[.\/-]([01]?\d)(?:[.\/-](\d{2,4}))?\b/);if(n){const day=+n[1],month=+n[2],year=n[3]?+(n[3].length===2?"20"+n[3]:n[3]):new Date().getFullYear();const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day)return d.toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"});}
     return source.match(/\b(morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i)?.[0]||"";
    };
    if(cakeInquiry){
     const missing=(s:string)=>{const date=!!parseRequestedDate(s);const people=/\b\d{1,3}\s*(?:personen|person|pax|gäste|stücke|portionen|kinder|erwachsene)\b/i.test(s);return [!date?"Für welchen Tag ist die Torte gewünscht?":"",!people?"Für wie viele Personen ist die Torte gedacht?":""].filter(Boolean)};
     const questions=missing(subject+" "+body);
     if(questions.length){const extra=questions.join(" ");acknowledgement=acknowledgement.replace("\n\nGanz liebe Grüße","\n\n"+extra+"\n\nGanz liebe Grüße");acknowledgementHtml=acknowledgementHtml.replace('<p style="font-size:16px;line-height:1.65;margin:26px 0">Ganz liebe Grüße','<p style="font-size:16px;line-height:1.65">'+extra+'</p><p style="font-size:16px;line-height:1.65;margin:26px 0">Ganz liebe Grüße')}
    }

    if(cakeInquiry){
     const esc=(x)=>String(x||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
     const cleanBody=body.replace(/https?:\/\/[^\s]+/g," ");
     const senderName=(sender.match(/^\s*([^<]+?)\s*<[^<>]+>\s*$/)?.[1]||"").replace(/^["']|["']$/g,"").trim();
     const signatureName=(cleanBody.match(/(?:Liebe Grüße|Viele Grüße|Mit freundlichen Grüßen|Liebe Grüsse|Ganz liebe Grüße)[,\s\S]{0,100}?\n\s*([A-ZÄÖÜ][^\n]{1,50})\s*$/i)||[])[1]||"";
     const senderLocalPart=senderAddress.split("@")[0].toLowerCase();
     const genericMailbox=/^(office|info|kontakt|contact|mail|post|service|support|admin|buchhaltung|bestellung|sekretariat)$/i.test(senderLocalPart);
     const trustedSenderName=genericMailbox||/^judith walli$/i.test(senderName)?"":senderName;
     const customerName=signatureName||trustedSenderName;
     const phoneMatch=cleanBody.match(/(?:telefon|tel\.?|mobil|handy|phone)\s*[:.]?\s*([+\d][\d ()\/-]{5,})/i);
     const dateValue=parseRequestedDate(subject+" "+body);
     const peopleMatch=(subject+" "+body).match(/\b(\d{1,3})\s*(personen|person|pax|gäste|stücke|portionen|kinder|erwachsene)\b/i);
     const colorMatch=(subject+" "+body).match(/\b(rosa|pink|weiß|weiss|rot|blau|grün|gruen|gelb|lila|violett|gold|silber|schwarz)\b/i);
     const flavorMatch=(subject+" "+body).match(/\b(sacher(?:torte)?|schokolade|vanille|erdbeer(?:e)?|himbeer(?:e)?|zitrone|mohn|nuss|haselnuss|marille|apfel|topfen)\b/i);
     const cakeMatch=(subject+" "+body).match(/\b(batman|spiderman|einhor[nr]|paw\s*patrol)\s*(?:-\s*)?torte\b/i)|| (subject+" "+body).match(/\b(sponsion(?:sfeier)?|matura|promotion|hochzeit|geburtstag|taufe|kommunion|firmung)\b/i)|| (subject+" "+body).match(/\b(hochzeitstorte|geburtstagstorte|sachertorte|tauftorte|kommunionstorte|firmungstorte|motivtorte|torte)\b/i);
     const row=(label,value)=>'<tr><td style="padding:9px 10px;border-bottom:1px solid #f1dce2;color:#75545d;width:42%">'+esc(label)+'</td><td style="padding:9px 10px;border-bottom:1px solid #f1dce2;color:#44383b">'+esc(value||"Bitte ergänzen")+'</td></tr>';
     const summary='<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fcf1f5;border:1px solid #efd5dd;border-radius:10px"><tr><td colspan="2" style="padding:13px 10px;color:#a84f66;font-weight:bold;font-size:17px">Deine Tortenanfrage</td></tr>'+row("Name",customerName)+row("E-Mail",senderAddress)+row("Telefonnummer",phoneMatch?.[1]?.trim()||"Bitte ergänzen")+row("Abholdatum",dateValue||"Bitte ergänzen")+row("Torte / Anlass",cakeMatch?.[0]||"Bitte ergänzen")+row("Farbe",colorMatch?.[0]||"Bitte ergänzen")+row("Geschmack",flavorMatch?.[0]||"Bitte ergänzen")+row("Personenanzahl",peopleMatch?.[0]||"Bitte ergänzen")+'</table>';
     acknowledgementHtml=acknowledgementHtml.replace(/<p[^>]*>[^<]*(?:Bekanntgabe einer Telefonnummer|Für welchen Tag ist die Torte gewünscht|Für wie viele Personen ist die Torte gedacht)[\s\S]*?<\/p>/gi,"");
     acknowledgement=acknowledgement.replace(/Damit wir die Tortenwünsche[\s\S]*?Telefonnummer\./i,"").replace(/Für welchen Tag ist die Torte gewünscht\?\s*Für wie viele Personen ist die Torte gedacht\?/i,"");
     acknowledgementHtml=acknowledgementHtml.replace('<p style="font-size:16px;line-height:1.65">Wir freuen uns sehr über das Interesse an unseren handgefertigten Produkten.</p>', '<p style="font-size:16px;line-height:1.65">Wir freuen uns über deinen Tortenwunsch. Folgende Angaben haben wir erhalten:</p>'+summary+'<p style="font-size:15px;line-height:1.6">Bitte antworte einfach auf diese E-Mail, wenn du Angaben ergänzen oder korrigieren möchtest.</p>');
     acknowledgement=acknowledgement.replace("Wir freuen uns sehr über das Interesse an unseren handgefertigten Produkten.","Wir freuen uns über deinen Tortenwunsch. Bitte antworte einfach auf diese E-Mail, wenn du Angaben ergänzen oder korrigieren möchtest.");
     // Reply-by-email worksheet: email clients do not reliably support editable form controls.
     const missingFields=[
      !customerName?["Name","Dein Name"]:null,
      !phoneMatch?["Telefonnummer","Deine Telefonnummer"]:null,
      !dateValue?["Abholdatum","Gewünschtes Abholdatum"]:null,
      !colorMatch?["Farbe / Gestaltung","Dein Farbwunsch"]:null,
      !flavorMatch?["Geschmack","Dein Geschmackswunsch"]:null,
      !peopleMatch?["Personenanzahl","Für wie viele Personen"]:null
     ].filter(Boolean) as string[][];
     if(missingFields.length){
      const replyLines=missingFields.map(([label,hint])=>label+": ____________________").join("\\n");
      const replyRows=missingFields.map(([label,hint])=>'<tr><td style="padding:10px;border-bottom:1px solid #f1dce2;color:#75545d;width:42%">'+esc(label)+'</td><td style="padding:10px;border-bottom:1px solid #f1dce2;color:#999">________________________</td></tr>').join("");
      acknowledgement+="\\n\\nDamit wir deine Anfrage vervollständigen können, ergänze bitte direkt in deiner Antwort:\\n\\n"+replyLines+"\\n\\nEinfach diese E-Mail beantworten und die Zeilen ausfüllen – vielen Dank!";
      acknowledgementHtml=acknowledgementHtml.replace('</table><p style="font-size:15px;line-height:1.6">Bitte antworte einfach auf diese E-Mail, wenn du Angaben ergänzen oder korrigieren möchtest.</p>','</table><h2 style="font-size:17px;color:#a84f66;text-align:left;margin:22px 0 8px">Bitte direkt in deiner Antwort ergänzen</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid #efd5dd">'+replyRows+'</table><p style="font-size:15px;line-height:1.6">Einfach auf „Antworten“ klicken, die freien Zeilen ergänzen und senden. Es ist kein weiteres Formular nötig.</p>');
     }
    }
    try{
     const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"judith-ack-"+stored.id},body:JSON.stringify({from,to:[senderAddress],subject:"Wir haben die Anfrage erhalten",text:acknowledgement,html:acknowledgementHtml,reply_to:"office@judithwalli.at"})});
     const result=sent.ok?await sent.json().catch(()=>({})):{};
     await db.from("judith_ai_mail_acknowledgements").update(sent.ok?{status:"sent",sent_at:new Date().toISOString(),provider_message_id:result.id||null,error_code:null}:{status:"failed",error_code:"provider_"+sent.status}).eq("message_id",stored.id);

     // Internal control copy: only after successful customer acknowledgement.
     if(sent.ok&&cakeInquiry){
      try{
       const controlText="Neue Tortenanfrage – automatische Kundenantwort versendet.\n\nKundenname: "+(customerName||"Nicht angegeben")+"\nKunden-E-Mail: "+senderAddress+"\nTelefonnummer: "+(phoneMatch?.[1]?.trim()||(phoneKnown?"Vorhanden – bitte Originalnachricht prüfen":askPhone?"Fehlt – nachgefragt":"Noch zu prüfen"))+"\nBetreff: "+subject+"\n\nOriginalnachricht:\n"+body.slice(0,20000)+"\n\nVersendete Kundenantwort:\n"+acknowledgement+"\n\nAufgabe: Termin und Tortenwunsch prüfen. Keine Bestellung bestätigt.";
       const controlEsc=(x:string)=>String(x||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
       const controlName=customerName||"Nicht angegeben";
       const controlDate=parseRequestedDate(subject+" "+body)||"Offen";
       const controlPeople=(subject+" "+body).match(/\b\d{1,3}\s*(?:personen|person|pax|gäste|stücke|portionen|kinder|erwachsene)\b/i)?.[0]||"Offen";
       const controlColor=(subject+" "+body).match(/\b(rosa|pink|weiß|weiss|rot|blau|grün|gruen|gelb|lila|violett|gold|silber|schwarz)\b/i)?.[0]||"Offen";
       const controlCakeMatch=(subject+" "+body).match(/\b(batman|spiderman|einhor[nr]|paw\s*patrol)\s*(?:-\s*)?torte\b/i)|| (subject+" "+body).match(/\b(sponsion(?:sfeier)?|matura|promotion|hochzeit|geburtstag|taufe|kommunion|firmung)\b/i)|| (subject+" "+body).match(/\b(hochzeitstorte|geburtstagstorte|sachertorte|tauftorte|kommunionstorte|firmungstorte|motivtorte|torte)\b/i);
       const controlCake=controlCakeMatch?.[0]||"Bitte prüfen";
       const controlFlavor=(subject+" "+body).match(/\b(sacher(?:torte)?|schokolade|vanille|erdbeer(?:e)?|himbeer(?:e)?|zitrone|mohn|nuss|haselnuss|marille|apfel|topfen)\b/i)?.[0]||"Offen";
       const controlPhone=phoneMatch?.[1]?.trim()||(phoneKnown?"Vorhanden – Originalnachricht/Kundenstamm prüfen":askPhone?"Fehlt – beim Kunden nachgefragt":"Noch zu prüfen");
       const cell=(label,value)=>'<tr><td style="padding:9px 10px;border-bottom:1px solid #f1dce2;color:#75545d;width:38%;vertical-align:top">'+controlEsc(label)+'</td><td style="padding:9px 10px;border-bottom:1px solid #f1dce2;color:#44383b">'+controlEsc(value)+'</td></tr>';
       const controlRows=cell("Kundenname",controlName)+cell("Kunden-E-Mail",senderAddress)+cell("Telefonnummer",controlPhone)+cell("Abholdatum",controlDate)+cell("Tortenwunsch",controlCake)+cell("Farbe",controlColor)+cell("Geschmack",controlFlavor)+cell("Personenanzahl",controlPeople);
       const controlHtml='<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff;font-family:Arial,sans-serif;color:#444"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;border:8px solid #f7dce2;border-radius:20px;background:#fff"><tr><td align="center" style="padding:28px 20px"><img src="https://judithwalli.at/wp-content/uploads/2019/09/judithunddietorten300px-300x300.png" width="120" height="120" alt="Judith und die Torten" style="display:block;border:0;margin:0 auto"><p style="font-size:11px;letter-spacing:2px;color:#ae6879;margin:20px 0">MEISTERKONDITOREI · BADEN BEI WIEN</p><div style="border-top:1px solid #e9b9c4"></div><h1 style="font-size:22px;color:#a84f66;margin:25px 0 10px">Neue Tortenanfrage</h1><p style="display:inline-block;background:#fcf1f5;border:1px solid #efd5dd;border-radius:6px;padding:9px 14px;color:#a84f66;font-weight:bold">KI-KONTROLLE · BITTE BEARBEITEN</p><p style="font-size:15px;line-height:1.6">Die automatische Kundenantwort wurde versendet. Bitte Anfrage prüfen und persönlich weiterbearbeiten.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fcf1f5;border:1px solid #efd5dd"><tr><td colspan="2" style="padding:13px 10px;color:#a84f66;font-weight:bold;font-size:17px">Kundendaten & Tortenwunsch</td></tr>'+controlRows+'</table><h2 style="font-size:17px;color:#a84f66;text-align:left;margin:24px 0 8px">Versendete Kundenantwort</h2><div style="white-space:pre-wrap;text-align:left;background:#fcf1f5;border:1px solid #efd5dd;border-radius:8px;padding:14px;font-size:14px;line-height:1.55">controlEsc(acknowledgement)</div><h2 style="font-size:17px;color:#a84f66;text-align:left;margin:24px 0 8px">Originalnachricht</h2><div style="white-space:pre-wrap;text-align:left;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:14px;font-size:14px;line-height:1.55">'+controlEsc(body.slice(0,12000))+'</div><p style="font-size:14px;line-height:1.6;text-align:left;margin-top:20px"><strong>Aufgabe:</strong> Abholdatum, Verfügbarkeit und Tortenwunsch prüfen. Fehlende Angaben beim Kunden erfragen. Keine Bestellung oder Preiszusage bestätigt.</p><div style="border-top:1px solid #e9b9c4;margin-top:22px"></div><p style="font-size:13px;line-height:1.8;color:#a84f66">Judith Walli & Team<br>02252 266066 · office@judithwalli.at<br>www.judithwalli.at</p></td></tr></table></td></tr></table></body></html>';
       const control=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"judith-control-"+stored.id},body:JSON.stringify({from,to:["office@markusruess.at"],subject:"KI-KONTROLLE · Neue Tortenanfrage",text:controlText,html:controlHtml,reply_to:senderAddress})});
       if(!control.ok)console.error("Internal control delivery failed",control.status);
      }catch{console.error("Internal control delivery uncertain")}
     }
    }catch{
     // Uncertain delivery: do NOT retry automatically, to prevent duplicate acknowledgements.
     await db.from("judith_ai_mail_acknowledgements").update({status:"reserved",error_code:"network_uncertain"}).eq("message_id",stored.id);
    }
   }else if(claimError.code!=="23505"){console.error("Acknowledgement ledger unavailable",claimError.code)}
  }else console.error("Acknowledgement sender not configured");
 }
 return reply({ok:true,stored:true,attachments_saved:attachmentCount});
});
