import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const url=Deno.env.get('SUPABASE_URL')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const JUDITH='87889eaf-f865-4e3a-8f9a-cd01db483e0e';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://markusruess.github.io','Vary':'Origin'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,OPTIONS'}});
 if(req.method!=='GET')return reply({error:'Method not allowed'},405);
 try{
  const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return reply({error:'Nicht angemeldet'},401);
  const auth=createClient(url,publicKey,{global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return reply({error:'Nicht angemeldet'},401);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:access,error:accessError}=await admin.from('judith_ai_access').select('user_id').eq('user_id',user.id).eq('active',true).limit(1);
  if(accessError||!access?.length)return reply({error:'Keine Berechtigung'},403);
  const month=new URL(req.url).searchParams.get('month')||'';
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return reply({error:'Ungültiger Monat'},400);
  const start=month+'-01';const [year,mon]=month.split('-').map(Number);
  const end=new Date(Date.UTC(year,mon,1)).toISOString().slice(0,10);
  const {data,error}=await admin.from('bank_transactions')
    .select('booking_date,payee,description,amount')
    .eq('business_id',JUDITH).gt('amount',0)
    .gte('booking_date',start).lt('booking_date',end)
    .order('booking_date',{ascending:false}).limit(2000);
  if(error)throw error;
  const items=(data||[]).flatMap(x=>{
    const name=String(x.payee||'').trim();
    const detail=String(x.description||'');
    if(['PAYONE','Mollie','AMAZON','PayLife','Klarna','SB Beheb','SB Ein'].some(v=>name.toLowerCase().includes(v.toLowerCase())))return [];
    const candidates=detail.match(/125[0-9 ]{6,12}/g)||[];
    const numbers=[...new Set(candidates.map(v=>v.replaceAll(' ','')).filter(v=>/^125[0-9]{6,9}$/.test(v)))];
    if(numbers.length!==1)return [];
    return [{date:x.booking_date,name,amount:Number(x.amount),invoiceNumber:numbers[0]}];
  });
  return reply({items});
 }catch(_e){return reply({error:'Zahlungseingänge nicht verfügbar'},500)}
});
