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
 return reply({ok:true,stored:true,attachments_saved:attachmentCount});
});
