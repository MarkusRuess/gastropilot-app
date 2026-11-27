import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import {guardedPaidFetch} from '../_shared/enterprise-ai-guard.mjs';
const JUDITH='87889eaf-f865-4e3a-8f9a-cd01db483e0e';
const cors={'Access-Control-Allow-Origin':'https://markusruess.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const valid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const clean=(v:unknown)=>String(v||'').trim();
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*100)/100:null;
const norm=(v:string)=>v.toLocaleLowerCase('de').replace(/[^a-z0-9äöüß]/g,'');
const output=(r:any)=>(r.output||[]).flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
const base64=(data:Uint8Array)=>{let result='';for(let i=0;i<data.length;i+=32768)result+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(result)};
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&new Date(v).toISOString().slice(0,10)===v?v:null;
const sum=(rows:any[])=>Math.round(rows.reduce((n,r)=>n+r.line_net,0)*100)/100;
function verify(read:any){
 const supplier=clean(read.supplier).slice(0,180),invoice_number=clean(read.invoice_number).slice(0,120);
 const items=Array.isArray(read.purchase_items)?read.purchase_items.map((r:any)=>({name:clean(r.name).slice(0,240),article_number:clean(r.article_number)||null,quantity:number(r.quantity),unit:clean(r.unit).slice(0,40),unit_price_net:number(r.unit_price_net),line_net:number(r.line_net)})):[];
 const net=number(read.net_total),vat=number(read.vat_total),gross=number(read.gross_total),day=date(read.date);
 const errors:string[]=[];
 if(!supplier||!invoice_number||!day)errors.push('Lieferant, Rechnungsnummer oder Datum fehlen');
 if(items.length===0||items.length>250||items.some(r=>!r.name||!r.unit||r.quantity===null||r.quantity<=0||r.unit_price_net===null||r.unit_price_net<0||r.line_net===null||r.line_net<0||Math.abs(r.quantity*r.unit_price_net-r.line_net)>Math.max(.05,r.quantity*.005+.01)))errors.push('Artikel, Menge, Einheit oder Netto-Einzelpreis unvollständig');
 if(net===null||vat===null||gross===null||Math.abs(net+vat-gross)>.03||items.some(r=>r.line_net===null)||net!==null&&Math.abs(sum(items)-net)>.05)errors.push('Positionen und Rechnungssumme stimmen nicht überein');
 if(!['EUR','€'].includes(clean(read.currency).toUpperCase()))errors.push('Währung nicht eindeutig EUR');
 return {data:{document_type:'invoice',supplier,invoice_number,date:day,net_total:net,vat_total:vat,gross_total:gross,currency:'EUR',purchase_items:items,needs_review:errors.length>0},errors};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','POST'].includes(req.method))return response({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!service||!anon)return response({error:'Backend unavailable'},503);
 const bearer=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]||'';
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 let actor:string|null=null;
 if(bearer!==service){
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await auth.auth.getUser(bearer);if(!user)return response({error:'Authentication required'},401);
  const access=await db.from('judith_ai_access').select('active').eq('user_id',user.id).maybeSingle();
  if(access.error||!access.data?.active)return response({error:'Forbidden'},403);actor=user.id;
 }
 if(req.method==='GET'){
  const ids=(new URL(req.url)).searchParams.get('message_ids')?.split(',').filter(valid).slice(0,30)||[];
  if(!ids.length)return response({ok:true,invoices:[]});
  const {data,error}=await db.from('judith_mail_invoice_intake').select('id,attachment_id,message_id,status,issue,extracted_data,document_id').in('message_id',ids).order('created_at',{ascending:false}).limit(100);
  return error?response({error:'Invoice status unavailable'},503):response({ok:true,invoices:data});
 }
 let body:any;try{body=await req.json()}catch{return response({error:'Invalid request'},400)}
 const attachmentId=body?.attachment_id;
 if(!valid(attachmentId))return response({error:'Invalid attachment'},400);
 const {data:file,error:fe}=await db.from('judith_ai_attachments').select('id,message_id,storage_path,filename,mime_type,deleted_at').eq('id',attachmentId).maybeSingle();
 if(fe||!file||file.deleted_at)return response({error:'Original not found'},404);
 const {data:mail,error:me}=await db.from('judith_ai_mail_messages').select('id,direction,subject,body_text,sender_email,recipient_email').eq('id',file.message_id).maybeSingle();
 if(me||mail?.direction!=='inbound')return response({error:'Message not found'},404);
 const {data:mailFiles,error:groupError}=await db.from('judith_ai_attachments').select('id,storage_path,mime_type,filename,byte_size,created_at').eq('message_id',mail.id).is('deleted_at',null).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(30);
 if(groupError)return response({error:'Invoice attachments unavailable'},503);
 // Several image attachments in one invoice mail are consecutive invoice pages.
 // A PDF is already multi-page and remains a separate document.
 const images=(mailFiles||[]).filter(f=>['image/jpeg','image/png','image/webp'].includes(f.mime_type)&&!/(?:logo|signatur|signature|footer|icon|pixel|banner)/i.test(String(f.filename||'')));
 const group=file.mime_type==='application/pdf'?[file]:images;
 if(!group.length||group.length>12)return response({error:'Too many invoice pages'},422);
 const primary=group[0];
 if(file.id!==primary.id)return response({ok:true,grouped_with:primary.id});
 if(body?.action==='commit'){
  if(!actor)return response({error:'Staff session required'},403);
  const {data:stage}=await db.from('judith_mail_invoice_intake').select('*').eq('attachment_id',file.id).maybeSingle();
  if(!stage||stage.status!=='verified')return response({error:'Rechnung nicht vollständig geprüft'},409);
  const ext=({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[file.mime_type];if(!ext)return response({error:'Format nicht unterstützt'},422);
  const paths:string[]=[];
  for(const page of group){const copy=await db.storage.from('judith-ai-attachments').download(page.storage_path);if(copy.error||!copy.data)return response({error:'Originalseite fehlt'},422);
   const pageExt=({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[page.mime_type];
   const location=JUDITH+'/'+page.id+'.'+pageExt;const upload=await db.storage.from('invoice-originals').upload(location,copy.data,{contentType:page.mime_type,upsert:false});
   if(upload.error&&!String(upload.error.message).includes('already exists'))return response({error:'Original konnte nicht gesichert werden'},503);paths.push(location)}
  const path=paths[0];
  await db.from('judith_mail_invoice_intake').update({extracted_data:{...stage.extracted_data,original_files:paths}}).eq('id',stage.id);
  const {data:id,error}=await db.rpc('judith_mail_invoice_commit',{p_intake:stage.id,p_storage_path:path,p_user:actor});
  if(error)return response({error:'Einkaufsübernahme fehlgeschlagen'},503);
  return response({ok:true,status:id?'imported':'duplicate',document_id:id});
 }
 if(body?.action!=='analyze')return response({error:'Invalid action'},400);
 const category=/(rechnung|invoice|faktura|lieferschein|gutschrift|beleg)/i.test(String(mail.subject||'')+' '+String(file.filename||'')+' '+String(mail.body_text||'').slice(0,300));
 if(!category)return response({ok:true,ignored:true});
 const mime=file.mime_type;
 if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime))return response({error:'Unsupported file format'},422);
 const existing=await db.from('judith_mail_invoice_intake').select('id,status,issue,document_id,updated_at').eq('attachment_id',primary.id).maybeSingle();
 if(existing.data&&!['failed','processing'].includes(existing.data.status))return response({ok:true,existing:true,...existing.data});
 if(existing.data?.status==='processing'&&Date.now()-Date.parse(existing.data.updated_at)<300000)return response({ok:true,existing:true,...existing.data});
 const created=existing.data?await db.from('judith_mail_invoice_intake').update({status:'processing',issue:null,updated_at:new Date().toISOString()}).eq('id',existing.data.id).eq('updated_at',existing.data.updated_at).select('id').maybeSingle():await db.from('judith_mail_invoice_intake').insert({attachment_id:primary.id,message_id:mail.id}).select('id').maybeSingle();
 if(created.error||!created.data)return response({error:'Processing already started'},409);
 const stage=created.data.id;
 const fail=async(issue:string)=>{await db.from('judith_mail_invoice_intake').update({status:'failed',issue,updated_at:new Date().toISOString()}).eq('id',stage);return response({ok:false,error:issue},422)};
 const pageBytes:Uint8Array[]=[];let totalBytes=0;
 for(const page of group){const original=await db.storage.from('judith-ai-attachments').download(page.storage_path);
  if(original.error||!original.data)return fail('Originalanhang fehlt');
  const bytes=new Uint8Array(await original.data.arrayBuffer());totalBytes+=bytes.length;
  if(!bytes.length||bytes.length>10*1024*1024||totalBytes>25*1024*1024)return fail('Originaldatei leer oder Seitengruppe zu groß');
  if(page.mime_type==='application/pdf'&&String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')return fail('Datei ist kein gültiger PDF-Anhang');
  pageBytes.push(bytes);
 }
 const pageHashes=await Promise.all(pageBytes.map(bytes=>crypto.subtle.digest('SHA-256',bytes).then(d=>[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join(''))));
 const groupHash=new TextEncoder().encode(pageHashes.join(':'));
 const sha=group.length===1?pageHashes[0]:[...new Uint8Array(await crypto.subtle.digest('SHA-256',groupHash))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const duplicate=await db.from('judith_mail_invoice_intake').select('id').eq('business_id',JUDITH).eq('original_sha256',sha).eq('status','imported').limit(1);
 if(duplicate.data?.length){await db.from('judith_mail_invoice_intake').update({status:'duplicate',original_sha256:sha,issue:'Original bereits übernommen'}).eq('id',stage);return response({ok:true,status:'duplicate'})}
 const key=Deno.env.get('OPENAI_API_KEY');if(!key)return fail('OCR-Schlüssel nicht eingerichtet');
 const content:any[]=[{type:'input_text',text:'Lies NUR die angehängte Einkaufsrechnung vollständig. Gib JSON mit supplier, invoice_number, date (YYYY-MM-DD), currency, net_total, vat_total, gross_total, purchase_items:[{name,article_number,quantity,unit,unit_price_net,line_net}] aus. Alle gedruckten Artikel einschließlich Versand und Pfand als eigene Zeile; keine Summenzeilen als Artikel. KT=Karton, PK=Packung; Mengen und Netto-Einzelpreise exakt wie gedruckt, keine Gebindegrößen oder Preise erfinden. Unlesbare Werte null. Rechnungsnummer niemals aus E-Mail-Betreff erfinden. Keine Zahlung oder Buchhaltung.'}];
 for(let i=0;i<group.length;i++){const page=group[i],b64=base64(pageBytes[i]);content.push({type:'input_text',text:`Originalseite ${i+1} von ${group.length}`});content.push(page.mime_type==='application/pdf'?{type:'input_file',filename:'invoice.pdf',file_data:'data:application/pdf;base64,'+b64}:{type:'input_image',image_url:'data:'+page.mime_type+';base64,'+b64,detail:'high'})}
 try{
  const ai=await guardedPaidFetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',store:false,max_output_tokens:12000,text:{format:{type:'json_object'}},input:[{role:'user',content}]})});
  if(!ai.ok)return fail('OCR-Anfrage fehlgeschlagen ('+ai.status+')');
  const result=await ai.json();if(result.status==='incomplete')return fail('Rechnungsauswertung unvollständig');
  const {data,errors}=verify(JSON.parse(output(result).replace(/^```(?:json)?\s*|\s*```$/g,'')));
  data.source_attachment_ids=group.map(page=>page.id);
  const invoiceKey=norm(data.supplier)+':'+norm(data.invoice_number);
  const duplicates=await db.from('judith_mail_invoice_intake').select('id').eq('business_id',JUDITH).eq('invoice_key',invoiceKey).eq('status','imported').limit(1);
  const legacy=await db.from('documents').select('id,supplier,invoice_number').eq('business_id',JUDITH).eq('document_type','invoice').limit(500);
  const already=!!duplicates.data?.length||!!legacy.data?.some((d:any)=>norm(d.supplier)===norm(data.supplier)&&norm(d.invoice_number)===norm(data.invoice_number));
  const status=already?'duplicate':errors.length?'review':'verified';
  const updated=await db.from('judith_mail_invoice_intake').update({status,original_sha256:sha,invoice_key:invoiceKey,extracted_data:data,issue:already?'Rechnung bereits in GastroPilot vorhanden':errors.join('; ')||null,updated_at:new Date().toISOString()}).eq('id',stage);
  if(updated.error)return fail('Ergebnis konnte nicht gespeichert werden');
  // Only complete, arithmetically reconciled invoices transfer automatically.
  if(status==='verified'){
   const owner=await db.from('judith_ai_access').select('user_id').eq('role','owner').eq('active',true).limit(1).maybeSingle();
   if(owner.data?.user_id){
    const paths:string[]=[];
    for(let i=0;i<group.length;i++){const page=group[i];const ext=({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[page.mime_type];const path=JUDITH+'/'+page.id+'.'+ext;
     const copy=await db.storage.from('invoice-originals').upload(path,pageBytes[i],{contentType:page.mime_type,upsert:false});
     if(copy.error&&!String(copy.error.message).includes('already exists'))break;paths.push(path)}
    if(paths.length===group.length){
     await db.from('judith_mail_invoice_intake').update({extracted_data:{...data,original_files:paths}}).eq('id',stage);
     const imported=await db.rpc('judith_mail_invoice_commit',{p_intake:stage,p_storage_path:paths[0],p_user:owner.data.user_id});
     if(!imported.error)return response({ok:true,status:imported.data?'imported':'duplicate',document_id:imported.data});
    }
   }
   return response({ok:true,status:'verified',issue:'Automatische Übernahme nicht abgeschlossen; im Postfach erneut auslösen'});
  }
  return response({ok:true,status,issues:errors});
 }catch{return fail('Rechnungsdaten konnten nicht sicher ausgelesen werden')}
});
