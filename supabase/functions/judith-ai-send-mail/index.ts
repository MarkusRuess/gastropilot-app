import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"https://markusruess.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const token=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return reply({error:"Anmeldung erforderlich"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return reply({error:"Backend nicht verfügbar"},503);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return reply({error:"Sitzung ungültig"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:staff,error:accessError}=await db.from("judith_ai_access").select("active").eq("user_id",user.id).maybeSingle();
 if(accessError||!staff?.active)return reply({error:"Keine Judith-AI-Berechtigung"},403);
 let p:any;try{p=await req.json()}catch{return reply({error:"Ungültige Anfrage"},400)}
 const to=String(p.recipient_email||"").trim().toLowerCase(),subject=String(p.subject||"").trim(),body=String(p.body_text||"").trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||!subject||!body||subject.length>300||body.length>20000)return reply({error:"Empfänger, Betreff oder Nachricht ungültig"},400);
 const messageId=p.message_id;
 if(messageId!=null){if(typeof messageId!=="string"||!/^[0-9a-f-]{36}$/i.test(messageId))return reply({error:"Ungültige Nachrichten-ID"},400);const {data:mail}=await db.from("judith_ai_mail_messages").select("sender_email").eq("id",messageId).eq("direction","inbound").is("deleted_at",null).maybeSingle();if(!mail||mail.sender_email?.trim().toLowerCase()!==to)return reply({error:"Empfänger passt nicht zur Anfrage"},403)}
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("JUDITH_MAIL_FROM");
 if(!key||!from)return reply({error:"Direktversand noch nicht konfiguriert: verifizierte Absenderadresse oder Versand-Schlüssel fehlt"},503);
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(user.id+"|"+to+"|"+subject+"|"+body));
 const hash=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");
 let response:Response;try{response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"judith-"+hash.slice(0,48)},body:JSON.stringify({from,to:[to],subject,text:body,reply_to:"office@judithwalli.at"})})}catch{return reply({error:"Versanddienst nicht erreichbar"},502)}
 if(!response.ok){console.error("Resend send failed",response.status);return reply({error:response.status===403?"Absenderdomain nicht verifiziert":"Versanddienst hat die Nachricht abgelehnt",provider_status:response.status},502)}
 const sent=await response.json().catch(()=>({}));
 return reply({ok:true,provider_message_id:sent.id||null});
});