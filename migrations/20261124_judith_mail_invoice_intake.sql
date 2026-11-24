-- Mail invoices are purchase sources only; no expenses or payments are created.
create table public.judith_mail_invoice_intake (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid
   check (business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid),
 attachment_id uuid not null unique references public.judith_ai_attachments(id),
 message_id uuid not null references public.judith_ai_mail_messages(id),
 original_sha256 text,
 invoice_key text,
 status text not null default 'processing' check (status in ('processing','review','verified','duplicate','imported','failed')),
 extracted_data jsonb,
 issue text,
 document_id uuid unique references public.documents(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$')
);
create index judith_mail_invoice_intake_key on public.judith_mail_invoice_intake(business_id,invoice_key);
create index judith_mail_invoice_intake_sha on public.judith_mail_invoice_intake(business_id,original_sha256);
alter table public.judith_mail_invoice_intake enable row level security;
revoke all on public.judith_mail_invoice_intake from public,anon,authenticated;
grant select,insert,update on public.judith_mail_invoice_intake to service_role;

-- A single transaction locks the business invoice key, checks earlier uploads and
-- imports the source document. Existing expenses and payment data are untouched.
create function public.judith_mail_invoice_commit(p_intake uuid,p_storage_path text,p_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.judith_mail_invoice_intake%rowtype; d uuid; supplier text; number text;
begin
 select * into v from public.judith_mail_invoice_intake where id=p_intake for update;
 if not found or v.status<>'verified' or v.invoice_key is null or v.original_sha256 is null then return null; end if;
 if not exists(select 1 from public.judith_ai_access where user_id=p_user and active) then raise exception 'Judith access required';end if;
 if p_storage_path !~ ('^'||v.business_id::text||'/[0-9a-f-]{36}[.]((pdf)|(png)|(jpg)|(webp))$') then raise exception 'Invalid original path';end if;
 perform pg_advisory_xact_lock(hashtextextended(v.invoice_key,0));
 if exists(select 1 from public.judith_mail_invoice_intake where id<>v.id and business_id=v.business_id and status='imported' and (invoice_key=v.invoice_key or original_sha256=v.original_sha256)) then
  update public.judith_mail_invoice_intake set status='duplicate',issue='Rechnung bereits aus E-Mail übernommen',updated_at=now() where id=v.id;return null;
 end if;
 supplier=v.extracted_data->>'supplier';number=v.extracted_data->>'invoice_number';
 if exists(select 1 from public.documents where business_id=v.business_id and document_type='invoice'
  and lower(regexp_replace(coalesce(supplier,''),'[^[:alnum:]]','','g'))=lower(regexp_replace(coalesce(documents.supplier,''),'[^[:alnum:]]','','g'))
  and lower(regexp_replace(coalesce(number,''),'[^[:alnum:]]','','g'))=lower(regexp_replace(coalesce(documents.invoice_number,''),'[^[:alnum:]]','','g'))) then
  update public.judith_mail_invoice_intake set status='duplicate',issue='Rechnung bereits in GastroPilot vorhanden',updated_at=now() where id=v.id;return null;
 end if;
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,storage_path,status,extracted_data)
 values(v.business_id,p_user,'invoice',(v.extracted_data->>'date')::date,supplier,number,p_storage_path,'reviewed',
  v.extracted_data || jsonb_build_object('original_files',jsonb_build_array(p_storage_path),'mail_attachment_id',v.attachment_id,'original_sha256',v.original_sha256,'source','judith_mail')) returning id into d;
 update public.judith_mail_invoice_intake set status='imported',document_id=d,updated_at=now() where id=v.id;
 return d;
end $$;
revoke all on function public.judith_mail_invoice_commit(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.judith_mail_invoice_commit(uuid,text,uuid) to service_role;
