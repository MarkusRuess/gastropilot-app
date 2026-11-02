-- Judith only: new derived records and hooks. Existing shared import functions stay unchanged.
create schema if not exists gp_price_private;
revoke all on schema gp_price_private from public,anon,authenticated;
create table public.judith_ai_price_drafts (
 id uuid primary key, user_id uuid not null references auth.users(id),
 inquiry_id uuid references public.judith_ai_inquiries(id), created_at timestamptz not null default now()
);
alter table public.judith_ai_inquiries add column price_draft_id uuid unique references public.judith_ai_price_drafts(id);
create table public.judith_ai_price_calculations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) check(business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid),
 source_key text not null, inquiry_id uuid references public.judith_ai_inquiries(id),
 user_id uuid not null references auth.users(id), fingerprint text not null unique,
 result jsonb not null, created_at timestamptz not null default now()
);
create index judith_ai_price_calculations_source on public.judith_ai_price_calculations(business_id,source_key,created_at desc);
create table public.judith_price_invoice_links (
 business_id uuid not null default '87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid check(business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid),
 document_id uuid not null references public.documents(id), line_no integer not null,
 ingredient_id uuid references public.gp_ingredient_catalog(id), status text not null,
 source_hash text not null, updated_at timestamptz not null default now(), primary key(document_id,line_no)
);
alter table public.judith_ai_price_drafts enable row level security;
alter table public.judith_ai_price_calculations enable row level security;
alter table public.judith_price_invoice_links enable row level security;
revoke all on public.judith_ai_price_drafts,public.judith_ai_price_calculations,public.judith_price_invoice_links from public,anon,authenticated;
grant select,insert,update on public.judith_ai_price_drafts,public.judith_ai_price_calculations,public.judith_price_invoice_links to service_role;
-- Only columns of isolated opinions are changed during an association; no order/customer price writes.
grant update on public.judith_ai_price_opinions to service_role;
create function public.judith_price_attach_draft(p_draft_id uuid,p_inquiry_id uuid,p_user_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare d public.judith_ai_price_drafts%rowtype; o public.judith_ai_inquiries%rowtype;
begin
 select * into d from public.judith_ai_price_drafts where id=p_draft_id for update;
 if not found or d.user_id<>p_user_id then return false; end if;
 if d.inquiry_id is not null then return d.inquiry_id=p_inquiry_id; end if;
 select * into o from public.judith_ai_inquiries where id=p_inquiry_id;
 if not found or o.price_draft_id is distinct from p_draft_id then return false; end if;
 update public.judith_ai_price_drafts set inquiry_id=p_inquiry_id where id=p_draft_id;
 update public.judith_ai_price_opinions set inquiry_id=p_inquiry_id,source_key='order:'||p_inquiry_id where business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' and source_key='draft:'||p_draft_id;
 update public.judith_ai_price_calculations set inquiry_id=p_inquiry_id,source_key='order:'||p_inquiry_id where business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' and source_key='draft:'||p_draft_id;
 return true;
end $$;
revoke all on function public.judith_price_attach_draft(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.judith_price_attach_draft(uuid,uuid,uuid) to service_role;
-- Serialize recommendation/opinion writes with photo attachment to close the save/calculate race.
create function gp_price_private.canonical_price_source() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.judith_ai_price_drafts%rowtype; target uuid;
begin
 if new.source_key like 'draft:%' then
  select * into d from public.judith_ai_price_drafts where id=substring(new.source_key from 7)::uuid for update;
  if not found or d.user_id<>new.user_id then raise exception 'Invalid draft owner';end if;
  if d.inquiry_id is not null then new.inquiry_id:=d.inquiry_id;new.source_key:='order:'||d.inquiry_id;end if;
 elsif new.source_key like 'mail:%' then
  select id into target from public.judith_ai_inquiries where message_id=substring(new.source_key from 6)::uuid;
  if target is not null then new.inquiry_id:=target;new.source_key:='order:'||target;end if;
 end if;
 return new;
end $$;
revoke all on function gp_price_private.canonical_price_source() from public,anon,authenticated;
create trigger judith_price_opinion_source before insert on public.judith_ai_price_opinions for each row execute function gp_price_private.canonical_price_source();
create trigger judith_price_calculation_source before insert on public.judith_ai_price_calculations for each row execute function gp_price_private.canonical_price_source();
create function gp_price_private.attach_mail_prices() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.message_id is null then return new;end if;
 update public.judith_ai_price_opinions set inquiry_id=new.id,source_key='order:'||new.id where business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' and source_key='mail:'||new.message_id;
 update public.judith_ai_price_calculations set inquiry_id=new.id,source_key='order:'||new.id where business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' and source_key='mail:'||new.message_id;
 return new;
end $$;
revoke all on function gp_price_private.attach_mail_prices() from public,anon,authenticated;
create trigger judith_price_attach_mail after insert or update of message_id on public.judith_ai_inquiries for each row when(new.message_id is not null) execute function gp_price_private.attach_mail_prices();
create function gp_price_private.norm_name(v text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(lower(trim(coalesce(v,''))),'[^[:alnum:]]','','g')
$$;
create function gp_price_private.unit(v text) returns text language sql immutable set search_path='' as $$
 select case lower(trim(coalesce(v,''))) when 'kg' then 'kg' when 'g' then 'g' when 'l' then 'l' when 'liter' then 'l' when 'ml' then 'ml' when 'stück' then 'piece' when 'stk' then 'piece' when 'st' then 'piece' when 'st.' then 'piece' else null end
$$;
create function gp_price_private.process_invoice(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.documents%rowtype; item jsonb; i integer:=0; n integer; ingredient uuid; canonical text;
 price numeric; normalized numeric; source_unit text; target_unit text; v_status text; h text; candidate_ids uuid[];
 last_date date; last_price numeric; last_source text;
begin
 select * into d from public.documents where id=p_id and business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' for update;
 if not found or d.document_type not in ('invoice','other') then return;end if;
 if jsonb_typeof(d.extracted_data->'purchase_items') is distinct from 'array' then return;end if;
 update public.judith_price_invoice_links set status='superseded',updated_at=now() where document_id=d.id;
 for item in select value from jsonb_array_elements(d.extracted_data->'purchase_items') loop
  i:=i+1;ingredient:=null;normalized:=null;price:=null;h:=md5(item::text);v_status:='review_source';
  if d.status in ('reviewed','auto_imported') and coalesce(d.extracted_data->>'needs_review','false')<>'true'
   and coalesce(d.extracted_data->>'duplicate_note','')='' and coalesce(d.extracted_data->>'duplicate_candidate_expense_id','')=''
   and (d.document_type='invoice' or d.extracted_data->>'price_basis'='net_user_confirmed')
   and coalesce(item->>'unit_prices_gross','false')<>'true' and d.document_date is not null and d.document_date<=current_date then
   select array_agg(distinct c.id) into candidate_ids from public.gp_ingredient_catalog c
   left join public.gp_ingredient_aliases a on a.ingredient_id=c.id and a.business_id=c.business_id
   where c.business_id=d.business_id and (gp_price_private.norm_name(c.name)=gp_price_private.norm_name(item->>'name') or gp_price_private.norm_name(a.alias)=gp_price_private.norm_name(item->>'name'));
   n:=coalesce(array_length(candidate_ids,1),0);
   if n<>1 then v_status:=case when n=0 then 'review_unmatched' else 'review_ambiguous' end;
   else
    ingredient:=candidate_ids[1];
    select canonical_unit,price_date,current_price_net,price_source into canonical,last_date,last_price,last_source from public.gp_ingredient_catalog where id=ingredient and business_id=d.business_id for update;
    source_unit:=gp_price_private.unit(item->>'unit');target_unit:=gp_price_private.unit(canonical);
    if coalesce(item->>'unit_price_net','')~'^[0-9]+([.][0-9]+)?$' then price:=(item->>'unit_price_net')::numeric;end if;
    v_status:='review_price';
    if price>0 then
     v_status:='review_unit';
     if source_unit=target_unit then normalized:=price;
     elsif source_unit='g' and target_unit='kg' then normalized:=price*1000;
     elsif source_unit='kg' and target_unit='g' then normalized:=price/1000;
     elsif source_unit='ml' and target_unit='l' then normalized:=price*1000;
     elsif source_unit='l' and target_unit='ml' then normalized:=price/1000;end if;
     if normalized is not null then
      v_status:='matched';
      -- If totals contradict unit price, never overwrite a known ingredient cost.
      if (item ? 'quantity' and (case when coalesce(item->>'quantity','')~'^[0-9]+([.][0-9]+)?$' then (item->>'quantity')::numeric<=0 else true end)) or (item ? 'line_net' and coalesce(item->>'line_net','')!~'^[0-9]+([.][0-9]+)?$') then v_status:='review_totals';
      elsif coalesce(item->>'quantity','')~'^[0-9]+([.][0-9]+)?$' and coalesce(item->>'line_net','')~'^[0-9]+([.][0-9]+)?$'
       and abs((item->>'quantity')::numeric*price-(item->>'line_net')::numeric)>0.05 then v_status:='review_totals';
      elsif last_date=d.document_date and last_price is not null and abs(last_price-normalized)>0.000001 and coalesce(last_source,'')<>'judith_invoice:'||d.id then v_status:='review_same_date_conflict';
      else
       insert into public.gp_ingredient_price_history(business_id,ingredient_id,supplier,price_net,unit,document_date,document_id)
        select d.business_id,ingredient,d.supplier,normalized,canonical,d.document_date,d.id
        where not exists(select 1 from public.gp_ingredient_price_history where business_id=d.business_id and ingredient_id=ingredient and document_id=d.id and price_net=normalized and unit=canonical);
       if last_date is null or d.document_date>=last_date then
        update public.gp_ingredient_catalog set current_price_net=normalized,price_date=d.document_date,price_supplier=d.supplier,price_source='judith_invoice:'||d.id where id=ingredient and business_id=d.business_id;
       else v_status:='matched_historical';end if;
       update public.gp_recipe_ingredients ri set matched_ingredient_id=ingredient from public.gp_recipes r
        where r.id=ri.recipe_id and r.business_id=d.business_id and ri.matched_ingredient_id is null
        and (gp_price_private.norm_name(ri.ingredient_name)=gp_price_private.norm_name(item->>'name') or gp_price_private.norm_name(ri.ingredient_name)=gp_price_private.norm_name((select name from public.gp_ingredient_catalog where id=ingredient)));
      end if;
     end if;
    end if;
   end if;
  end if;
  insert into public.judith_price_invoice_links(document_id,line_no,ingredient_id,status,source_hash)
   values(d.id,i,ingredient,v_status,h) on conflict(document_id,line_no) do update set ingredient_id=excluded.ingredient_id,status=excluded.status,source_hash=excluded.source_hash,updated_at=now();
 end loop;
end $$;
revoke all on function gp_price_private.process_invoice(uuid) from public,anon,authenticated;
create function gp_price_private.invoice_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin perform gp_price_private.process_invoice(new.id);return new;end $$;
revoke all on function gp_price_private.invoice_trigger() from public,anon,authenticated;
create trigger judith_price_invoice_process after insert or update of status,extracted_data,document_date,supplier,business_id,document_type on public.documents for each row
 when(new.business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid and new.document_type in ('invoice','other')) execute function gp_price_private.invoice_trigger();
-- Existing Judith documents are assessed without changing their review state. No Friedrich rows are touched.
do $$ declare d record;begin for d in select id from public.documents where business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e' and document_type in ('invoice','other') loop perform gp_price_private.process_invoice(d.id);end loop;end $$;
