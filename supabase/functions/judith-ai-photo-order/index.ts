import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"https://markusruess.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve(async(req:Request)=>{
 const send=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return send({error:"Method not allowed"},405);
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return send({error:"Anmeldung erforderlich"},401);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const auth=createClient(url,anon,{auth:{persistSession:false}});const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user)return send({error:"Ungültige Anmeldung"},401);
 const db=createClient(url,secret,{auth:{persistSession:false}});
 const {data:access}=await db.from("judith_ai_access").select("active").eq("user_id",user.id).maybeSingle();
 if(!access?.active)return send({error:"Kein Judith-AI-Zugriff"},403);
 let body:any;try{body=await req.json()}catch{return send({error:"Ungültige Eingabe"},400)}
 if(body.action==="extract"){
  const mime=String(body.mime||"");const data=String(body.image||"");
  if(!["image/jpeg","image/png","image/webp"].includes(mime)||data.length>7500000||! /^[A-Za-z0-9+/=]+$/.test(data))return send({error:"Bitte JPEG/PNG/WebP unter 5 MB verwenden"},400);
  const key=Deno.env.get("OPENAI_API_KEY");if(!key)return send({error:"Foto-KI noch nicht konfiguriert. Manuelle Erfassung ist verfügbar."},503);
  const requestBody=JSON.stringify({model:"gpt-4o-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"Lies einen handschriftlichen deutschen Torten-Auftragszettel. Antworte ausschließlich mit JSON und den String-Feldern name,phone,email,date (YYYY-MM-DD oder leer),occasion,details,price,quantity,portions. quantity ist die Anzahl ganzer Torten, portions die gesamte Personen-/Portionenanzahl; niemals gleichsetzen. Preise nicht erraten. Nichts erfinden; unlesbare Werte leer lassen. Preis als Zahl ohne Währung, quantity als Zahl."},{role:"user",content:[{type:"text",text:"Bitte Daten des Auftragszettels extrahieren."},{type:"image_url",image_url:{url:"data:"+mime+";base64,"+data,detail:"high"}}]}]});
  let response:Response;
  for(let attempt=0;attempt<2;attempt++){
   response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:requestBody});
   if(response.status<500&&response.status!==429)break;
   if(attempt===0)await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!response.ok){
   let provider:any={};const raw=await response.text();try{provider=JSON.parse(raw)}catch{}
   const err=provider?.error||{};const providerCode=String(err.code||err.type||"").slice(0,80);const providerMessage=String(err.message||"").replace(/\s+/g," ").slice(0,240);
   console.error("judith-ai-photo-order: OpenAI request failed",{status:response.status,code:providerCode,message:providerMessage});
   if(response.status===401||response.status===403)return send({error:"Foto-KI-Zugang ungültig. OPENAI_API_KEY in Supabase prüfen."},503);
   if(response.status===429)return send({error:"Foto-KI-Limit erreicht. OpenAI-Limits und Abrechnung prüfen."},503);
   if(response.status>=500)return send({error:"Foto-KI vorübergehend nicht erreichbar. Bitte erneut versuchen."},503);
   if(response.status===400)return send({error:"Foto wurde von der Foto-KI abgelehnt. Bitte ein scharfes JPEG-, PNG- oder WebP-Foto aufnehmen."},422);
   return send({error:"Foto-KI-Fehler (HTTP "+response.status+"). Bitte später erneut versuchen."},503);
  }
  const result=await response.json();let parsed:any;try{parsed=JSON.parse(result.choices?.[0]?.message?.content||"{}")}catch{return send({error:"Foto konnte nicht gelesen werden"},422)}
  return send({ok:true,fields:parsed});
 }
 if(body.action==="save"){
  const draftId=body.price_draft_id;
  if(draftId){
   if(typeof draftId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId))return send({error:"Ungültiger Preisentwurf"},400);
   const {error:de}=await db.from("judith_ai_price_drafts").upsert({id:draftId,user_id:user.id},{onConflict:"id",ignoreDuplicates:true});
   const {data:draft,error:dr}=await db.from("judith_ai_price_drafts").select("user_id,inquiry_id").eq("id",draftId).maybeSingle();
   if(de||dr||!draft||draft.user_id!==user.id)return send({error:"Kein Zugriff auf diesen Preisentwurf"},403);
   if(draft.inquiry_id)return send({ok:true,id:draft.inquiry_id,price_linked:true});
  }

  const name=String(body.name||"").trim().slice(0,180),phone=String(body.phone||"").trim().slice(0,80),rawEmail=String(body.email||"").trim().toLowerCase().slice(0,200),email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)?rawEmail:"",date=String(body.date||"");
  const details=String(body.details||"").trim().slice(0,4000),occasion=String(body.occasion||"Tortenauftrag").trim().slice(0,180);
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!details)return send({error:"Name, Datum und Tortenbeschreibung sind erforderlich"},400);
  // Fehlende oder unleserliche Kontaktdaten dürfen den Auftrag nicht blockieren.
  
  const qty=Math.max(1,Math.min(100,Number.parseInt(String(body.quantity||"1"))||1));const price=String(body.price||"").trim();
  const description=details+(rawEmail&&!email?"\nE-Mail laut Foto (ungültig, bitte prüfen): "+rawEmail:"")+( !phone&&!email?"\nKontaktangaben fehlen – bitte nachtragen":"")+"\nStückzahl: "+qty+(price?"\nVereinbarter Preis brutto: "+price+" €":"")+"\nErfasst von: "+(user.email||user.id);
  let customerId:string|undefined;
  if(email){const {data:existing}=await db.from("judith_ai_customers").select("id").eq("email",email).maybeSingle();customerId=existing?.id;}
  if(!customerId&&phone){const {data:existing}=await db.from("judith_ai_customers").select("id").eq("phone",phone).maybeSingle();customerId=existing?.id;}
  if(!customerId){const {data:created,error:ce}=await db.from("judith_ai_customers").insert({name,phone:phone||null,email:email||null}).select("id").single();if(ce)return send({error:"Kunde konnte nicht gespeichert werden"},500);customerId=created.id;}
  const row:any={customer_id:customerId,requested_date:date,occasion,details:description,status:"confirmed"};
  if(draftId)row.price_draft_id=draftId;
  const query=db.from("judith_ai_inquiries");
  const {data:createdOrder,error:oe}=await (draftId?query.upsert(row,{onConflict:"price_draft_id",ignoreDuplicates:true}):query.insert(row)).select("id").maybeSingle();
  let order=createdOrder;
  if(!oe&&!order&&draftId){const found=await db.from("judith_ai_inquiries").select("id").eq("price_draft_id",draftId).maybeSingle();order=found.data;}

  if(oe||!order)return send({error:"Auftrag konnte nicht gespeichert werden"},500);
  let priceLinked=false;
  if(draftId){const linked=await db.rpc("judith_price_attach_draft",{p_draft_id:draftId,p_inquiry_id:order.id,p_user_id:user.id});priceLinked=!linked.error&&linked.data===true;}
  return send({ok:true,id:order.id,price_linked:priceLinked});
 }
 return send({error:"Unbekannte Aktion"},400);
});