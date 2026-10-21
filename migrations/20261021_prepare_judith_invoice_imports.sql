-- GastroPilot: prerequisites for separated, idempotent invoice imports.
-- Run before deploying the dashboard changes on the Judith branch.
begin;

alter table public.expenses
  add column if not exists source_invoice_key text;

create unique index if not exists expenses_business_invoice_key_unique
  on public.expenses (business_id, source_invoice_key);

-- A document linked to an expense must belong to the same business.
create unique index if not exists documents_id_business_unique
  on public.documents (id, business_id);

alter table public.expenses
  drop constraint if exists expenses_document_id_fkey;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.expenses'::regclass
      and conname = 'expenses_document_business_fkey'
  ) then
    alter table public.expenses
      add constraint expenses_document_business_fkey
      foreign key (document_id, business_id)
      references public.documents (id, business_id)
      on delete set null (document_id);
  end if;
end $;

create index if not exists expenses_document_business_idx
  on public.expenses (document_id, business_id);

-- Keep the archive private and preserve the existing photo/PDF MIME types.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]::text[]
where id = 'invoice-originals';

-- Trigger functions do not need public RPC execution.
revoke execute on function public.gp_detect_purchase_price_changes()
  from public, anon, authenticated;

commit;
