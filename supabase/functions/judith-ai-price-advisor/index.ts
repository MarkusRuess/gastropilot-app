import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {calculate,costRates,extract,number,similarOrders,currentMail,matchRecipe} from './engine.mjs';
const JUDITH='87889eaf-f865-4e3a-8f9a-cd01db483e0e';
const cors={'Access-Control-Allow-Origin':'https://markusruess.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function digest(value:unknown){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async(req:Request)=>{
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return send({error:'Method not allowed'},405);
 try{
  const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return send({error:'Anmeldung erforderlich'},401);
  const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:ue}=await auth.auth.getUser(token);if(ue||!user||user.is_anonymous)return send({error:'Anmeldung erforderlich'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:access,error:ae}=await db.from('judith_ai_access').select('active').eq('user_id',user.id).eq('active',true).maybeSingle();
  if(ae||!access)return send({error:'Keine Judith-AI-Berechtigung'},403);
  const raw=await req.text();if(raw.length>20000)return send({error:'Eingabe zu lang'},413);
  let b:any;try{b=JSON.parse(raw)}catch{return send({error:'Ungültige Eingabe'},400)}
  if(!b||!['calculate','opinion','attach'].includes(b.action))return send({error:'Unbekannte Aktion'},400);
  for(const k of ['inquiry_id','message_id','draft_id'])if(b[k]&&!uuid.test(b[k]))return send({error:'Ungültige Zuordnung'},400);
  if(b.action==='attach'){
   if(!b.draft_id||!b.inquiry_id)return send({error:'Zuordnung fehlt'},400);
   const {data,error}=await db.rpc('judith_price_attach_draft',{p_draft_id:b.draft_id,p_inquiry_id:b.inquiry_id,p_user_id:user.id});
   return error||!data?send({error:'Entwurf gehört nicht zu diesem Auftrag'},409):send({ok:true});
  }
  let text=String(b.text||'').slice(0,12000),source='',inquiryId:string|null=null,agreedPrice:number|null=null,portionConflict=false;
  if(b.draft_id){
   const {error}=await db.from('judith_ai_price_drafts').upsert({id:b.draft_id,user_id:user.id},{onConflict:'id',ignoreDuplicates:true});
   if(error)return send({error:'Entwurf konnte nicht gesichert werden'},503);
   const {data:d,error:de}=await db.from('judith_ai_price_drafts').select('user_id,inquiry_id').eq('id',b.draft_id).maybeSingle();
   if(de||!d||d.user_id!==user.id)return send({error:'Kein Zugriff auf diesen Entwurf'},403);
   if(d.inquiry_id){if(b.inquiry_id&&b.inquiry_id!==d.inquiry_id)return send({error:'Widersprüchliche Zuordnung'},409);b.inquiry_id=d.inquiry_id;}
   source='draft:'+b.draft_id;
  }
  if(b.message_id&&!b.inquiry_id){
   const {data:m,error:me}=await db.from('judith_ai_mail_messages').select('id,subject,body_text').eq('id',b.message_id).eq('direction','inbound').is('deleted_at',null).maybeSingle();
   if(me||!m)return send({error:'E-Mail nicht verfügbar'},404);
   text=m.subject+'\n'+currentMail(m.body_text);source='mail:'+m.id;
   const linked=await db.from('judith_ai_inquiries').select('id').eq('message_id',m.id).maybeSingle();
   if(linked.error)return send({error:'Auftragszuordnung nicht eindeutig'},409);
   if(linked.data)b.inquiry_id=linked.data.id;
  }
  if(b.inquiry_id){
   const {data:o,error:oe}=await db.from('judith_ai_inquiries').select('id,occasion,details,guests,message_id').eq('id',b.inquiry_id).maybeSingle();
   if(oe||!o)return send({error:'Auftrag nicht verfügbar'},404);
   if(b.message_id&&o.message_id!==b.message_id)return send({error:'E-Mail gehört nicht zum Auftrag'},409);
   text=o.occasion+'\n'+o.details;const facts=extract(text);agreedPrice=facts.customer_price;portionConflict=!!(facts.portions&&o.guests>0&&facts.portions!==Number(o.guests));if(!facts.portions&&!facts.portions_ambiguous&&o.guests)text+='\n'+o.guests+' Personen';inquiryId=o.id;source='order:'+o.id;
  }
  if(!source)source='text:'+await digest(text);
  if(b.action==='opinion'){
   const amount=number(b.amount);if(amount===null||amount<=0||amount>1000000)return send({error:'Preiseinschätzung bitte prüfen'},400);
   const {error}=await db.from('judith_ai_price_opinions').insert({business_id:JUDITH,source_key:source,inquiry_id:inquiryId,user_id:user.id,amount_gross:amount,note:String(b.note||'').slice(0,1000)});
   return error?send({error:'Einschätzung konnte nicht gespeichert werden'},503):send({ok:true,inquiry_id:inquiryId});
  }
  const parsed=extract(text),input={...parsed,text,portions:b.portions??parsed.portions,cakes:b.cakes??1,customer_price:agreedPrice??b.customer_price??parsed.customer_price,wedding:b.wedding??parsed.wedding,labor_minutes:b.labor_minutes,portion_conflict:portionConflict};
  if(!input.portions){const ops=await db.from('judith_ai_price_opinions').select('amount_gross,note,created_at').eq('business_id',JUDITH).eq('source_key',source).order('created_at',{ascending:false}).limit(20);if(ops.error)return send({error:'Einschätzungen nicht abrufbar'},503);return send({ok:true,needs_input:true,fields:parsed,inquiry_id:inquiryId,opinions:ops.data||[],message:'Portionenzahl fehlt oder ist mehrdeutig. Bitte ergänzen.'});}
  const start=new Date();start.setUTCMonth(start.getUTCMonth()-12);const from=start.toISOString().slice(0,10);
  const queries=[
   db.from('gp_ledger_monthly').select('month_start,metric_key,amount,verification_status').eq('business_id',JUDITH).gte('month_start',from),
   db.from('personnel_costs').select('accounting_month,total_costs,gross_salary,employer_costs').eq('business_id',JUDITH).gte('accounting_month',from),
   db.from('expenses').select('accounting_month,expense_date,category,net_amount,gross_amount').eq('business_id',JUDITH).gte('expense_date',from),
   db.from('gp_recipes').select('id,name,yield_qty,yield_unit,labor_minutes,setup_percent,packaging_net').eq('business_id',JUDITH),
   db.from('gp_ingredient_catalog').select('id,canonical_unit,current_price_net,price_source').eq('business_id',JUDITH),
   db.from('judith_ai_inquiries').select('id,occasion,details,requested_date').in('status',['confirmed','picked_up']).order('created_at',{ascending:false}).limit(200),
   db.from('judith_ai_price_opinions').select('amount_gross,note,created_at').eq('business_id',JUDITH).eq('source_key',source).order('created_at',{ascending:false}).limit(20),
   db.from('bank_fixed_costs').select('booking_date,category,amount').eq('business_id',JUDITH).gte('booking_date',from),
   db.from('judith_price_invoice_links').select('document_id,ingredient_id,status').eq('business_id',JUDITH)
  ];
  const data=await Promise.all(queries);if(data.some(r=>r.error))return send({error:'Kostenbasis derzeit nicht vollständig abrufbar'},503);
  const [ledger,personnel,expenses,recipes,catalog,orders,opinions,bankFixed,invoiceLinks]=data.map(r=>r.data||[]);
  // Link table contains Judith records only (enforced by the private invoice hook).
  const unresolved=invoiceLinks.some((l:any)=>l.status.startsWith('review_'));
  for(const c of catalog){if(c.price_source?.startsWith('judith_invoice:')&&!invoiceLinks.some((l:any)=>l.document_id===c.price_source.slice(15)&&l.ingredient_id===c.id&&l.status==='matched'))c.current_price_net=null;}
  const recipe=matchRecipe(text,recipes);
  let ingredients:any[]=[];if(recipe){const r=await db.from('gp_recipe_ingredients').select('ingredient_name,quantity,unit,fallback_price_net,matched_ingredient_id').eq('recipe_id',recipe.id);if(r.error)return send({error:'Rezeptur nicht verfügbar'},503);ingredients=r.data||[];}
  const rates=costRates(ledger,personnel,expenses,new Date(),bankFixed);let result;
  try{result=calculate(input,{recipe,ingredients,catalog,rates,unresolvedInvoices:unresolved})}catch(e){return send({error:(e as Error).message},400)}
  const {calculated_at,...stableResult}=result;
  const fingerprint=await digest({source,input,rates,recipe,ingredients,catalog,stableResult});
  const saved=await db.from('judith_ai_price_calculations').upsert({business_id:JUDITH,source_key:source,inquiry_id:inquiryId,user_id:user.id,fingerprint,result},{onConflict:'fingerprint',ignoreDuplicates:true});
  if(saved.error)return send({error:'Empfehlung konnte nicht dauerhaft gespeichert werden'},503);
  const history=await db.from('judith_ai_price_calculations').select('id,result,created_at').eq('business_id',JUDITH).eq('source_key',source).order('created_at',{ascending:false}).limit(10);
  if(history.error)return send({error:'Gespeicherte Empfehlungen nicht abrufbar'},503);
  // No internal rates, raw costs, salaries or invoice data leave this endpoint.
  return send({ok:true,result,inquiry_id:inquiryId,agreed_price_locked:agreedPrice!==null,persisted:true,comparables:similarOrders(input,orders.filter((o:any)=>o.id!==inquiryId)),opinions,history:(history.data||[]).map((h:any)=>({id:h.id,created_at:h.created_at,recommended_gross:h.result.recommended_gross,status:h.result.status}))});
 }catch{return send({error:'Preisberater vorübergehend nicht verfügbar'},503)}
});
