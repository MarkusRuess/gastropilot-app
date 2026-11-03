import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"https://markusruess.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"GET,DELETE,PATCH,OPTIONS","Vary":"Origin"};
Deno.serve(async(req:Request)=>{
 const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET"&&req.method!=="DELETE"&&req.method!=="PATCH")return send({error:"Method not allowed"},405);
 const token=req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return send({error:"Authentication required"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return send({error:"Backend unavailable"},503);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user)return send({error:"Invalid session"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:staff,error:staffError}=await db.from("judith_ai_access").select("active").eq("user_id",user.id).maybeSingle();
 if(staffError)return send({error:"Access check unavailable"},503);
 if(!staff?.active)return send({error:"Forbidden"},403);
 // Dedicated backlist read: no attachment signing or retention side effects.
 if(req.method==="GET"&&new URL(req.url).searchParams.get("view")==="backlist"){
  const params=new URL(req.url).searchParams,start=params.get("start")||"",end=params.get("end")||"";
  const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if(!valid(start)||!valid(end)||new Date(start).getUTCDay()!==1||Date.parse(end)-Date.parse(start)!==6*86400000)return send({error:"Ungültige Kalenderwoche"},400);
  const inquiries:any[]=[],customers=new Map<string,any>();let cursor="";
  for(;;){
   let query=db.from("judith_ai_inquiries").select("id,customer_id,occasion,requested_date,details,status,fulfillment_status,customer:judith_ai_customers(id,name)").in("status",["confirmed","picked_up"]).or(`and(requested_date.gte.${start},requested_date.lte.${end}),requested_date.is.null`).order("id",{ascending:true}).limit(500);
   if(cursor)query=query.gt("id",cursor);
   const {data:page,error:pageError}=await query;
   if(pageError||!page)return send({error:"Backliste konnte nicht vollständig geladen werden"},503);
   for(const row of page){const {customer,...order}=row;inquiries.push(order);if(customer?.id)customers.set(customer.id,customer);}
   if(page.length<500)break;
   const last=page[page.length-1]?.id;if(!last||last===cursor)return send({error:"Backliste konnte nicht vollständig geladen werden"},503);cursor=last;
  }
  return send({ok:true,inquiries,customers:[...customers.values()]});
 }
 if(req.method==="DELETE"&&new URL(req.url).searchParams.get("view")==="customer"){
  let body:any;try{body=await req.json()}catch{return send({error:"Ungültige Anfrage"},400)}
  const id=body?.customer_id;if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return send({error:"Ungültiger Kunde"},400);
  const {data:customer,error:ce}=await db.from("judith_ai_customers").select("id,email").eq("id",id).maybeSingle();
  if(ce||!customer)return send({error:"Kunde nicht gefunden"},404);
  const {count,error:ie}=await db.from("judith_ai_inquiries").select("id",{count:"exact",head:true}).eq("customer_id",id);
  if(ie)return send({error:"Aufträge konnten nicht geprüft werden"},503);
  if(count&&count>0)return send({error:"Kunde hat gespeicherte Anfragen oder Aufträge. Löschen gesperrt, damit keine Auftragsdaten verloren gehen."},409);
  const {error:be}=await db.from("judith_ai_excluded_customer_emails").upsert({email:customer.email.toLowerCase()});
  if(be)return send({error:"Löschsperre konnte nicht gespeichert werden"},503);
  const {error:de}=await db.from("judith_ai_customers").delete().eq("id",id);
  if(de)return send({error:"Kunde konnte nicht gelöscht werden"},503);
  return send({ok:true,deleted:true});
 }
 if(req.method==="PATCH"){
  let body:any;try{body=await req.json()}catch{return send({error:"Ungültige Daten"},400)}
  if(body?.action==="edit_customer"){
   const id=body?.customer_id,p=body?.changes||{};
   if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return send({error:"Ungültiger Kunde"},400);
   const changes:any={};
   if(typeof p.name==="string"&&p.name.trim())changes.name=p.name.trim().slice(0,180);
   if(typeof p.phone==="string")changes.phone=p.phone.trim().slice(0,80)||null;
   if(typeof p.email==="string"){
    const email=p.email.trim().toLowerCase();
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send({error:"Ungültige E-Mail-Adresse"},400);
    if(email)changes.email=email;
   }
   if(!Object.keys(changes).length)return send({error:"Keine Änderungen"},400);
   const {data:updated,error:ue}=await db.from("judith_ai_customers").update(changes).eq("id",id).select("id,name,email,phone").single();
   if(ue)return send({error:ue.code==="23505"?"Diese E-Mail ist bereits einem anderen Kunden zugeordnet":"Kunde konnte nicht gespeichert werden"},409);
   return send({ok:true,customer:updated});
  }
  const id=body?.inquiry_id,action=body?.action;
  if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||!["confirm","pickup","delete_images","edit","set_status"].includes(action))return send({error:"Ungültige Anfrage"},400);
  const {data:existing,error:ee}=await db.from("judith_ai_inquiries").select("id,status,picked_up_at,fulfillment_status").eq("id",id).maybeSingle();
  if(ee||!existing)return send({error:"Anfrage nicht gefunden"},404);
  if(action==="edit"){
   const p=body?.changes||{};
   const updates:any={};
   if(typeof p.occasion==="string")updates.occasion=p.occasion.trim().slice(0,180);
   if(typeof p.details==="string")updates.details=p.details.trim().slice(0,12000);
   if(typeof p.requested_date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(p.requested_date)&&!Number.isNaN(Date.parse(p.requested_date)))updates.requested_date=p.requested_date;
   if(p.guests!==undefined&&Number.isInteger(p.guests)&&p.guests>=0&&p.guests<=10000)updates.guests=p.guests;
   if(!Object.keys(updates).length)return send({error:"Keine gültigen Änderungen"},400);
   const {data:updated,error:ue}=await db.from("judith_ai_inquiries").update(updates).eq("id",id).select("id,occasion,requested_date,guests,details,status").single();
   if(ue)return send({error:"Änderungen konnten nicht gespeichert werden"},503);
   return send({ok:true,inquiry:updated});
  }
  if(action==="delete_images"){
   if(existing.status!=="picked_up")return send({error:"Nur abgeholte Aufträge können bereinigt werden"},409);
   const {data:files,error:fe}=await db.from("judith_ai_attachments").select("id,storage_path").eq("inquiry_id",id).is("deleted_at",null);
   if(fe)return send({error:"Anhänge nicht abrufbar"},503);
   if(files?.length){
    const {error:removeError}=await db.storage.from("judith-ai-attachments").remove(files.map(x=>x.storage_path));
    if(removeError)return send({error:"Dateien konnten nicht gelöscht werden"},503);
    await db.from("judith_ai_attachments").update({deleted_at:new Date().toISOString()}).in("id",files.map(x=>x.id));
   }
   return send({ok:true,deleted:files?.length||0});
  }
  if(action==='set_status'||action==='pickup'||action==='confirm'){
   const target=action==='pickup'?'picked_up':action==='confirm'?'confirmed':body.status;
   if(!['confirmed','in_progress','ready','picked_up'].includes(target))return send({error:'Ungültiger Status'},400);
   const current=existing.status==='picked_up'?'picked_up':existing.status==='confirmed'?(existing.fulfillment_status||'confirmed'):'inquiry';
   if(body.expected_status!==undefined&&body.expected_status!==current)return send({error:'Status wurde inzwischen geändert. Bitte neu laden.'},409);
   if(target==='picked_up'&&existing.status==='inquiry')return send({error:'Bitte zuerst den Auftrag beauftragen'},409);
   if(current===target)return send({ok:true,inquiry:existing});
   const updates:any=target==='picked_up'
    ?{status:'picked_up',picked_up_at:new Date().toISOString(),picked_up_by:user.id}
    :{status:'confirmed',fulfillment_status:target==='confirmed'?null:target,picked_up_at:null,picked_up_by:null};
   let query=db.from('judith_ai_inquiries').update(updates).eq('id',id).eq('status',existing.status);
   query=existing.fulfillment_status===null?query.is('fulfillment_status',null):query.eq('fulfillment_status',existing.fulfillment_status);
   query=existing.picked_up_at===null?query.is('picked_up_at',null):query.eq('picked_up_at',existing.picked_up_at);
   const {data:updated,error:ue}=await query.select('id,status,fulfillment_status,picked_up_at').maybeSingle();
   if(ue)return send({error:'Status konnte nicht gespeichert werden'},503);
   if(!updated)return send({error:'Status wurde inzwischen geändert. Bitte neu laden.'},409);
   return send({ok:true,inquiry:updated});
  }
 }
 if(req.method==="GET"){
  // Retention is enforced whenever an authorized staff member opens the inbox or customer area.
  const cutoff=new Date(Date.now()-30*86400000).toISOString();
  const {data:expired,error:expiryError}=await db.from("judith_ai_attachments").select("id,storage_path,judith_ai_inquiries!inner(picked_up_at,status)").is("deleted_at",null).eq("judith_ai_inquiries.status","picked_up").lt("judith_ai_inquiries.picked_up_at",cutoff).limit(100);
  if(!expiryError&&expired?.length){
   const paths=expired.map(f=>f.storage_path);
   const {error:storageError}=await db.storage.from("judith-ai-attachments").remove(paths);
   if(!storageError)await db.from("judith_ai_attachments").update({deleted_at:new Date().toISOString()}).in("id",expired.map(f=>f.id));
  }
 }
 if(req.method==="GET"&&new URL(req.url).searchParams.get("view")==="customers"){
  const {data:customers,error:ce}=await db.from("judith_ai_customers").select("id,name,email,phone,created_at").order("name",{ascending:true}).limit(200);
  if(ce)return send({error:"Kunden konnten nicht geladen werden"},503);
  const {data:inquiries,error:ie}=await db.from("judith_ai_inquiries").select("id,customer_id,occasion,requested_date,guests,details,status,fulfillment_status,picked_up_at,created_at").order("created_at",{ascending:false}).limit(500);
  if(ie)return send({error:"Anfragen konnten nicht geladen werden"},503);
  const {data:files}=await db.from("judith_ai_attachments").select("id,message_id,inquiry_id,filename,mime_type,byte_size,storage_path").is("deleted_at",null).limit(1000);
  const signedFiles=files?.length?(await db.storage.from("judith-ai-attachments").createSignedUrls(files.map(f=>f.storage_path),600)).data||[]:[];
  const signedByPath=new Map<string,string>();for(const item of signedFiles)if(item.path&&item.signedUrl)signedByPath.set(item.path,item.signedUrl);
  const attachments=(files||[]).flatMap(f=>{const signedUrl=signedByPath.get(f.storage_path);return signedUrl?[{id:f.id,message_id:f.message_id,inquiry_id:f.inquiry_id,filename:f.filename,mime_type:f.mime_type,url:signedUrl}]:[]})
  return send({ok:true,customers:customers||[],inquiries:inquiries||[],attachments});
 }
 if(req.method==="DELETE"){let payload:unknown;try{payload=await req.json()}catch{return send({error:"Invalid request"},400)}const id=(payload as {message_id?:unknown})?.message_id;if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return send({error:"Invalid message ID"},400);const {data:removed,error:removeError}=await db.from("judith_ai_mail_messages").delete().eq("id",id).eq("direction","inbound").select("id").maybeSingle();if(removeError)return send({error:"Endgültiges Löschen fehlgeschlagen"},503);if(!removed)return send({error:"E-Mail nicht gefunden"},404);return send({ok:true,deleted:true});}
 const {data:storedFiles}=await db.from("judith_ai_attachments").select("id,message_id,filename,mime_type,storage_path").is("deleted_at",null).limit(500);
 const signedFiles=storedFiles?.length?(await db.storage.from("judith-ai-attachments").createSignedUrls(storedFiles.map(f=>f.storage_path),600)).data||[]:[];
 const signedByPath=new Map<string,string>();for(const item of signedFiles)if(item.path&&item.signedUrl)signedByPath.set(item.path,item.signedUrl);
 const attachments=(storedFiles||[]).flatMap(f=>{const signedUrl=signedByPath.get(f.storage_path);return signedUrl?[{id:f.id,message_id:f.message_id,filename:f.filename,mime_type:f.mime_type,url:signedUrl}]:[]})
 const {data,error:dbError}=await db.from("judith_ai_mail_messages").select("id,sender_email,recipient_email,subject,body_text,received_at").eq("direction","inbound").is("deleted_at",null).order("received_at",{ascending:false}).limit(30);
 if(dbError)return send({error:"Inbox unavailable"},503);
 const keys=["Name","E-Mail-Adresse","Wunschtermin","Anlass","Gäste","Kommentar oder Nachricht","Gesendet von"];
 let synchronized=0;
 for(const msg of data||[]){
  const body=String(msg.body_text||"").replaceAll("\\n"," ").replaceAll("\n"," ");
  const found=keys.map(k=>({key:k,at:body.indexOf(k+" ")})).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at);
  const fields:Record<string,string>={};
  for(let i=0;i<found.length;i++){const x=found[i];fields[x.key]=body.slice(x.at+x.key.length+1,i+1<found.length?found[i+1].at:body.length).trim();}
  const email=fields["E-Mail-Adresse"]?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}/i)?.[0]?.toLowerCase();
  if(!email||!fields["Name"]||!fields["Wunschtermin"]||!fields["Kommentar oder Nachricht"]){
   const sender=String(msg.sender_email||"").trim().toLowerCase();
   const valid=/^[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}$/.test(sender);
   const blocked=sender.endsWith("@judithwalli.at")||sender==="support+baptiste@crisp.chat"||sender==="buchhaltung@anna-gold.at"||sender==="wknoe@wknoe.at"||/^(no-reply|noreply|mailer-daemon|postmaster|newsletter|info|office|verkauf|support|service|booking|reservierung)@/i.test(sender);
   if(!valid||blocked)continue;
   const {data:excluded}=await db.from("judith_ai_excluded_customer_emails").select("email").eq("email",sender).maybeSingle();if(excluded)continue;
   const local=sender.split("@")[0];const readable=local.replace(/[._-]+/g," ").replace(/[0-9]+/g," ").trim();
   const display=readable&&readable.length>=3?readable.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "):sender;
   const {error:se}=await db.from("judith_ai_customers").upsert({email:sender,name:display},{onConflict:"email",ignoreDuplicates:true});
   if(se){console.error("Sender sync",msg.id,se.code);continue;}
   synchronized++;continue;
  }
  const dateParts=fields["Wunschtermin"].match(/^(\\d{2})[.](\\d{2})[.](\\d{4})/);
  const date=dateParts?dateParts[3]+"-"+dateParts[2]+"-"+dateParts[1]:null;
  const guests=Number.parseInt(fields["Gäste"]||"",10);
  const {data:excludedForm}=await db.from("judith_ai_excluded_customer_emails").select("email").eq("email",email).maybeSingle();if(excludedForm)continue;
  const {data:customer,error:ce}=await db.from("judith_ai_customers").upsert({email,name:fields["Name"].slice(0,180),updated_at:new Date().toISOString()},{onConflict:"email"}).select("id").single();
  if(ce||!customer){console.error("Customer sync",msg.id,ce?.code);continue;}
  const {error:ie}=await db.from("judith_ai_inquiries").upsert({message_id:msg.id,customer_id:customer.id,occasion:(fields["Anlass"]||"").slice(0,180),requested_date:date,guests:Number.isFinite(guests)?guests:null,details:fields["Kommentar oder Nachricht"].split("Gesendet von")[0].slice(0,3000)},{onConflict:"message_id",ignoreDuplicates:true});
  if(ie){console.error("Inquiry sync",msg.id,ie.code);continue;}synchronized++;
 }
 const messages=(data||[]).map(m=>{const first=String(m.body_text||"").split(/(?:\\n|\n)(?:Von:|From:|Am .{5,100} schrieb|On .{5,100} wrote|-----Original Message-----)/i)[0].slice(0,1500);const yes=/(?:hiermit|gerne|wie besprochen|wie vereinbart|verbindlich).{0,55}(?:bestell|bestätig|auftrag)|(?:ich|wir) (?:bestätige|bestätigen|nehme|nehmen|bestelle|bestellen)|(?:das|der) (?:angebot|preis) (?:passt|ist in ordnung)|(?:ja,? (?:bitte|gerne)|wir nehmen (?:die|das))/i.test(first);const no=/(?:nicht|keine|doch nicht|stornier|absag).{0,45}(?:bestell|auftrag|bestätig|nehmen)/i.test(first);return {...m,acceptance_suspected:yes&&!no}}); 
 return send({ok:true,read_only:true,count:data?.length??0,messages,attachments,form_inquiries_synchronized:synchronized});
});
