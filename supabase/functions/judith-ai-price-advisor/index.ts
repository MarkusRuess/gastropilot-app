import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {calculate,costRates,extract,number,similarOrders} from './engine.mjs';
const JUDITH='87889eaf-f865-4e3a-8f9a-cd01db483e0e';
const cors={'Access-Control-Allow-Origin':'https://markusruess.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
Deno.serve(async(req:Request)=>{
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return send({error:'Method not allowed'},405);
 try{
  const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return send({error:'Anmeldung erforderlich'},401);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:ue}=await auth.auth.getUser(token);if(ue||!user||user.is_anonymous)return send({error:'Anmeldung erforderlich'},401);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:access,error:ae}=await db.from('judith_ai_access').select('active').eq('user_id',user.id).eq('active',true).maybeSingle();
  if(ae||!access)return send({error:'Keine Judith-AI-Berechtigung'},403);
  const raw=await req.text();if(raw.length>20000)return send({error:'Eingabe zu lang'},413);
  let b:any;try{b=JSON.parse(raw)}catch{return send({error:'Ungültige Eingabe'},400)}
  if(!['calculate','opinion'].includes(b.action))return send({error:'Unbekannte Aktion'},400);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let text=String(b.text||'').slice(0,12000),source='manual',inquiryId:string|null=null;
  if(b.inquiry_id){if(!uuid.test(b.inquiry_id))return send({error:'Ungültiger Auftrag'},400);const r=await db.from('judith_ai_inquiries').select('id,occasion,details,guests').eq('id',b.inquiry_id).maybeSingle();if(r.error||!r.data)return send({error:'Auftrag nicht verfügbar'},404);text=r.data.occasion+'\n'+r.data.details;if(!extract(text).portions&&r.data.guests)text+='\n'+r.data.guests+' Personen';inquiryId=r.data.id;source='order:'+inquiryId;}
  else if(b.message_id){if(!uuid.test(b.message_id))return send({error:'Ungültige E-Mail'},400);const r=await db.from('judith_ai_mail_messages').select('id,subject,body_text').eq('id',b.message_id).eq('direction','inbound').is('deleted_at',null).maybeSingle();if(r.error||!r.data)return send({error:'E-Mail nicht verfügbar'},404);text=(r.data.subject+'\n'+r.data.body_text).slice(0,12000);source='mail:'+r.data.id;}
  else{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));source='text:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');}
  if(b.action==='opinion'){
   const amount=number(b.amount);if(amount===null||amount<=0||amount>1000000)return send({error:'Preiseinschätzung bitte prüfen'},400);
   const {error}=await db.from('judith_ai_price_opinions').insert({business_id:JUDITH,source_key:source,inquiry_id:inquiryId,user_id:user.id,amount_gross:amount,note:String(b.note||'').slice(0,1000)});
   return error?send({error:'Einschätzung konnte nicht gespeichert werden'},503):send({ok:true});
  }
  const parsed=extract(text), input={...parsed,text,portions:b.portions??parsed.portions,cakes:b.cakes??1,customer_price:b.customer_price??parsed.customer_price,wedding:b.wedding??parsed.wedding,labor_minutes:b.labor_minutes};
  if(!input.portions)return send({ok:true,needs_input:true,fields:parsed,message:'Portionenzahl fehlt oder ist mehrdeutig. Bitte ergänzen.'});
  const start=new Date();start.setUTCMonth(start.getUTCMonth()-12);const from=start.toISOString().slice(0,10);
  const queries=[
   db.from('gp_ledger_monthly').select('month_start,metric_key,amount,verification_status').eq('business_id',JUDITH).gte('month_start',from),
   db.from('personnel_costs').select('accounting_month,total_costs').eq('business_id',JUDITH).gte('accounting_month',from),
   db.from('expenses').select('accounting_month,expense_date,category,net_amount').eq('business_id',JUDITH).gte('expense_date',from),
   db.from('gp_recipes').select('id,name,yield_qty,yield_unit,labor_minutes,setup_percent,packaging_net').eq('business_id',JUDITH),
   db.from('gp_ingredient_catalog').select('id,canonical_unit,current_price_net').eq('business_id',JUDITH),
   db.from('judith_ai_inquiries').select('id,occasion,details,requested_date').in('status',['confirmed','picked_up']).order('created_at',{ascending:false}).limit(200),
   db.from('judith_ai_price_opinions').select('amount_gross,note,created_at').eq('business_id',JUDITH).eq('source_key',source).order('created_at',{ascending:false}).limit(20)
  ];
  const data=await Promise.all(queries);if(data.some(r=>r.error))return send({error:'Kostenbasis derzeit nicht vollständig abrufbar'},503);
  const [ledger,personnel,expenses,recipes,catalog,orders,opinions]=data.map(r=>r.data||[]);
  // Exact name mention only. Ambiguous recipe matches must not silently win.
  const matches=recipes.filter((r:any)=>text.toLowerCase().includes(r.name.toLowerCase()));const recipe=matches.length===1?matches[0]:null;
  let ingredients:any[]=[];if(recipe){const r=await db.from('gp_recipe_ingredients').select('ingredient_name,quantity,unit,fallback_price_net,matched_ingredient_id').eq('recipe_id',recipe.id);if(r.error)return send({error:'Rezeptur nicht verfügbar'},503);ingredients=r.data||[];}
  let result;try{result=calculate(input,{recipe,ingredients,catalog,rates:costRates(ledger,personnel,expenses)})}catch(e){return send({error:(e as Error).message},400)}
  // Strict allow-list: no raw costs, staff names, margins or financial statements in response.
  return send({ok:true,result,comparables:similarOrders(input,orders.filter((o:any)=>o.id!==inquiryId)),opinions});
 }catch{return send({error:'Preisberater vorübergehend nicht verfügbar'},503)}
});
