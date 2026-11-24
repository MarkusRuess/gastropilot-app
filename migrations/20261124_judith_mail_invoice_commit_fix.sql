create or replace function public.judith_mail_invoice_commit(p_intake uuid,p_storage_path text,p_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.judith_mail_invoice_intake%rowtype; d uuid; v_supplier text; v_number text;
begin
 select * into v from public.judith_mail_invoice_intake where id=p_intake for update;
 if not found or v.status<>'verified' or v.invoice_key is null or v.original_sha256 is null then return null; end if;
 if not exists(select 1 from public.judith_ai_access where user_id=p_user and active) then raise exception 'Judith access required';end if;
 if p_storage_path !~ ('^'||v.business_id::text||'/[0-9a-f-]{36}[.]((pdf)|(png)|(jpg)|(webp))$') then raise exception 'Invalid original path';end if;
 perform pg_advisory_xact_lock(hashtextextended(v.original_sha256,0));
 perform pg_advisory_xact_lock(hashtextextended(v.invoice_key,0));
 if exists(select 1 from public.judith_mail_invoice_intake where id<>v.id and business_id=v.business_id and status='imported' and (invoice_key=v.invoice_key or original_sha256=v.original_sha256)) then
  update public.judith_mail_invoice_intake set status='duplicate',issue='Rechnung bereits aus E-Mail übernommen',updated_at=now() where id=v.id;return null;
 end if;
 v_supplier=v.extracted_data->>'supplier';v_number=v.extracted_data->>'invoice_number';
 if exists(select 1 from public.documents where business_id=v.business_id and document_type='invoice'
  and lower(regexp_replace(coalesce(v_supplier,''),'[^[:alnum:]]','','g'))=lower(regexp_replace(coalesce(documents.supplier,''),'[^[:alnum:]]','','g'))
  and lower(regexp_replace(coalesce(v_number,''),'[^[:alnum:]]','','g'))=lower(regexp_replace(coalesce(documents.invoice_number,''),'[^[:alnum:]]','','g'))) then
  update public.judith_mail_invoice_intake set status='duplicate',issue='Rechnung bereits in GastroPilot vorhanden',updated_at=now() where id=v.id;return null;
 end if;
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,storage_path,status,extracted_data)
 values(v.business_id,p_user,'invoice',(v.extracted_data->>'date')::date,v_supplier,v_number,p_storage_path,'reviewed',
  v.extracted_data || jsonb_build_object('original_files',jsonb_build_array(p_storage_path),'mail_attachment_id',v.attachment_id,'original_sha256',v.original_sha256,'source','judith_mail')) returning id into d;
 update public.judith_mail_invoice_intake set status='imported',document_id=d,updated_at=now() where id=v.id;
 return d;
end $$;
