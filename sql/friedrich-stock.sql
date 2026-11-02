-- Friedrich only. Additive storage; legacy counts and other tenants are untouched.
create schema if not exists gp_stock_private;
revoke all on schema gp_stock_private from public, anon, authenticated;

create table public.gp_f_stock_products (
 item_id uuid primary key references public.gp_inventory_items(id),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 base_unit text not null check(base_unit in ('l','g','Stück')),
 legacy_factor numeric not null check(legacy_factor>0),
 pack_size numeric check(pack_size>0), pack_label text,
 reserve_percent numeric not null default 0 check(reserve_percent between 0 and 200),
 note text not null default '', updated_at timestamptz not null default now(),
 check(item_id<>'4c1c36d5-f7c2-4298-87ca-24ceecbe80ce' or (base_unit='l' and pack_size=50 and legacy_factor=1)),
 check(item_id<>'e4e19947-6ee2-4671-a8ca-b2fa52cac6d5' or (base_unit='g' and pack_size=1500 and legacy_factor=1500))
);
create table public.gp_f_stock_counts (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 item_id uuid not null references public.gp_f_stock_products(item_id),
 quantity numeric not null check(quantity>=0), counted_at timestamptz not null check(counted_at<=now()),
 day_complete boolean not null default false,
 note text not null default '', request_id uuid not null unique,
 created_at timestamptz not null default clock_timestamp(), created_by uuid default auth.uid()
);
create index on public.gp_f_stock_counts(item_id,counted_at desc,created_at desc);
create table public.gp_f_stock_rules (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 article_number text not null, item_id uuid not null references public.gp_f_stock_products(item_id),
 per_sale numeric not null check(per_sale>0), note text not null,
 unique(article_number,item_id)
);
create table public.gp_f_stock_lines (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 source_key text not null unique, document_id uuid not null,
 foreign key(document_id,business_id) references public.documents(id,business_id),
 supplier text, article_number text, name text not null, raw_data jsonb not null, candidate_data jsonb,
 source_kind text not null check(source_kind in ('delivery','count')),
 delivery_date date, item_id uuid references public.gp_f_stock_products(item_id),
 base_quantity numeric, base_price numeric check(base_price>=0),
 state text not null default 'review' check(state in ('review','confirmed','excluded','conflict')),
 note text not null default '', confirmed_by uuid, confirmed_at timestamptz,
 created_at timestamptz not null default now()
);
create index on public.gp_f_stock_lines(item_id,delivery_date);
create table public.gp_f_stock_supplier_rules (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 supplier text not null, article_number text not null,
 item_id uuid not null references public.gp_f_stock_products(item_id),
 input_unit text not null, factor numeric not null check(factor>0), packaging jsonb not null default '{}',
 unique(supplier,article_number)
);
create table public.gp_f_stock_losses (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 item_id uuid not null references public.gp_f_stock_products(item_id),
 quantity numeric not null check(quantity>0), occurred_at timestamptz not null,
 reason text not null check(length(trim(reason))>0), request_id uuid not null unique,
 created_at timestamptz not null default now()
);
create table public.gp_f_stock_closings (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 inventory_month date not null check(extract(day from inventory_month)=1),
 revision integer not null check(revision>0), reason text not null,
 payload jsonb not null, created_at timestamptz not null default now(),
 created_by uuid default auth.uid(), unique(inventory_month,revision)
);
-- Owner access matches financial app. SELECT never authorizes another tenant.
do $block$ declare t text; begin
 foreach t in array array['gp_f_stock_products','gp_f_stock_counts','gp_f_stock_rules','gp_f_stock_lines','gp_f_stock_supplier_rules','gp_f_stock_losses','gp_f_stock_closings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using (business_id=''6a5484d1-daf6-4263-897d-24cdf536aa29'' and exists(select 1 from public.business_members m where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.role=''owner''))',t,t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check (business_id=''6a5484d1-daf6-4263-897d-24cdf536aa29'' and exists(select 1 from public.business_members m where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.role=''owner''))',t,t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['gp_f_stock_products','gp_f_stock_rules','gp_f_stock_lines','gp_f_stock_supplier_rules'] loop
 execute format('create policy owner_update on public.%I for update to authenticated using (exists(select 1 from public.business_members m where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.role=''owner'')) with check(business_id=''6a5484d1-daf6-4263-897d-24cdf536aa29'' and exists(select 1 from public.business_members m where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.role=''owner''))',t,t,t);
 execute format('grant update on public.%I to authenticated',t);
 end loop;
end $block$;
create policy same_business_product on public.gp_f_stock_products as restrictive for all to authenticated
using (exists(select 1 from public.gp_inventory_items i where i.id=item_id and i.business_id=gp_f_stock_products.business_id))
with check (exists(select 1 from public.gp_inventory_items i where i.id=item_id and i.business_id=gp_f_stock_products.business_id));

-- Existing units are preserved, only conversion metadata is added.
insert into public.gp_f_stock_products(item_id,base_unit,legacy_factor,pack_size,pack_label,note)
select id,
 case when name like 'Illy Kaffee%' then 'g' when unit='Liter' or name ~ '0,7' then 'l' else 'Stück' end,
 case when name like 'Illy Kaffee%' then 1500 when unit like 'Flasche à 0,7%' then 0.7 when unit='Liter' then 1 else 1 end,
 case when name like 'Illy Kaffee%' then 1500 when name like 'Bierfass 50%' then 50 when name ~ '0,75l' then 1 when unit like 'Flasche à 0,7%' then 0.7 else null end,
 case when name like 'Illy Kaffee%' then 'Dose à 1,5 kg' when name like 'Bierfass 50%' then 'Fass à 50 l' when name ~ '0,75l' then 'Flasche à 0,75 l' when unit like 'Flasche à 0,7%' then 'Flasche à 0,7 l' else null end,
 'Übernommene Stammdaten; alte Nullmenge bleibt unbekannt.'
from public.gp_inventory_items where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29';

-- Rules backed by supplied serving sizes; decaf is never matched by a broad coffee regex.
insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
select '2000',item_id,0.33,'Betreiber: 0,33 l je Villacher, auch wenn Bonit 0,3 druckt.'
from public.gp_f_stock_products where item_id='4c1c36d5-f7c2-4298-87ca-24ceecbe80ce';
insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
select n,'e4e19947-6ee2-4671-a8ca-b2fa52cac6d5'::uuid,case when n='1401' then 16 else 8 end,'Betreiber: einfacher Bezug 8 g; Espresso groß 16 g. Milch/Zutaten separat offen.'
from unnest(array['1400','1401','1402','1403','1404','1406','1410','1413']) n;
insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
values ('3018','829bea07-8d63-42ba-9c9c-be0503e166c7',0.125,'Weißer Spritzer: 1/8 l Hauswein; Soda gesondert, keine erfundene Einkaufseinheit.'),
 ('3056','829bea07-8d63-42ba-9c9c-be0503e166c7',0.125,'Hauswein 1/8 l.');

create or replace function gp_stock_private.number(v jsonb) returns numeric
language plpgsql immutable set search_path='' as $$ begin
 if jsonb_typeof(v)='number' then return (v#>>'{}')::numeric; end if;
 return null; end $$;

-- Capture source positions without losing packages, returns or raw evidence.
-- The trigger is narrowly privileged to capture lines even for the existing service importer.
create or replace function gp_stock_private.capture_document() returns trigger
language plpgsql security definer set search_path='' as $$
declare x jsonb; n bigint; k text; oldrow public.gp_f_stock_lines%rowtype; r public.gp_f_stock_supplier_rules%rowtype; q numeric; p numeric; d date; kind text;
begin
 if new.business_id<>'6a5484d1-daf6-4263-897d-24cdf536aa29' or new.status not in ('reviewed','auto_imported') then return new; end if;
 kind:=case when jsonb_typeof(new.extracted_data->'inventory_counts')='array' and jsonb_array_length(new.extracted_data->'inventory_counts')>0 then 'count' else 'delivery' end;
 if kind='delivery' and new.document_type<>'invoice' then return new; end if;
 -- Missing invoice identity is kept for review, never automatically delivered.
 k:=case when nullif(trim(new.invoice_number),'') is not null and nullif(trim(new.supplier),'') is not null
 then lower(regexp_replace(new.supplier,'[^[:alnum:]]','','g'))||':'||lower(regexp_replace(new.invoice_number,'[^[:alnum:]]','','g')) else 'document:'||new.id end;
 for x,n in select value,ordinality from jsonb_array_elements(case when kind='count' then new.extracted_data->'inventory_counts' else coalesce(new.extracted_data->'purchase_items','[]') end) with ordinality loop
  if nullif(trim(x->>'name'),'') is null then continue; end if;
  select * into oldrow from public.gp_f_stock_lines where source_key=k||':'||kind||':'||n;
  if found then
   if oldrow.raw_data is distinct from x then
    -- An applied source cannot silently change stock on re-extraction.
    update public.gp_f_stock_lines set state='conflict',candidate_data=x,note='Erneut ausgelesene Position weicht ab. Original bleibt erhalten; Zuordnung prüfen.' where id=oldrow.id;
   end if;
   continue;
  end if;
  -- An additional/reordered page of a second copy must not become a new receipt.
  if exists(select 1 from public.gp_f_stock_lines l where l.source_key like k||':'||kind||':%' and l.document_id<>new.id) then continue; end if;
  select * into r from public.gp_f_stock_supplier_rules where supplier=lower(trim(new.supplier)) and article_number=x->>'article_number' and input_unit=x->>'unit'
   and packaging=jsonb_build_object('pack_size',x->'pack_size','pack_unit',x->'pack_unit','units_per_pack',x->'units_per_pack','quantity_basis',x->'quantity_basis');
  q:=gp_stock_private.number(x->'quantity'); p:=gp_stock_private.number(x->'line_net');
  d:=new.document_date;
  if coalesce(x->>'delivery_date',new.extracted_data->>'delivery_date','') ~ '^\d{4}-\d{2}-\d{2}$' then d:=coalesce(x->>'delivery_date',new.extracted_data->>'delivery_date')::date; end if;
  insert into public.gp_f_stock_lines(source_key,document_id,supplier,article_number,name,raw_data,source_kind,delivery_date,item_id,base_quantity,base_price,state,note)
  values(k||':'||kind||':'||n,new.id,new.supplier,x->>'article_number',x->>'name',x,kind,d,
   case when kind='delivery' then r.item_id end,
   case when kind='delivery' then q*r.factor end,
   case when q<>0 and p is not null and p/q>=0 then p/q/r.factor end,
   case when kind='delivery' and r.item_id is not null and q is not null and d is not null and k not like 'document:%' and coalesce(x->>'line_kind','goods')='goods' then 'confirmed' else 'review' end,
   case when r.item_id is null then 'Artikel/Gebinde bestätigen; keine geschätzte Menge.' else 'Bestätigte Lieferanten-Artikelnummer und Einheit.' end);
 end loop;
 return new;
end $$;
revoke all on function gp_stock_private.capture_document() from public,anon,authenticated;
create trigger friedrich_stock_capture after insert or update of extracted_data,status on public.documents
for each row when(new.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29') execute function gp_stock_private.capture_document();

-- Additional protection for repeat expense inserts; serializes each invoice identity.
create or replace function gp_stock_private.guard_expense() returns trigger
language plpgsql security invoker set search_path='' as $$
declare d public.documents%rowtype; k text;
begin
 if new.business_id<>'6a5484d1-daf6-4263-897d-24cdf536aa29' or new.document_id is null then return new; end if;
 select * into d from public.documents where id=new.document_id and business_id=new.business_id;
 if d.document_type<>'invoice' then return new; end if;
 if nullif(trim(d.invoice_number),'') is null or nullif(trim(d.supplier),'') is null then
 raise exception 'Friedrich: Rechnungsnummer oder Lieferant fehlt. Kostenbuchung zur Prüfung offen; keine unsichere Doppelbuchung.'; end if;
 k:=coalesce(nullif(lower(regexp_replace(d.supplier,'[^[:alnum:]]','','g')),'')||':'||nullif(lower(regexp_replace(d.invoice_number,'[^[:alnum:]]','','g')),''),d.id::text);
 perform pg_advisory_xact_lock(hashtextextended('f-expense:'||k,0));
 if exists(select 1 from public.expenses e left join public.documents x on x.id=e.document_id and x.business_id=e.business_id
 where e.business_id=new.business_id and (e.document_id=new.document_id or
 (d.supplier is not null and d.invoice_number is not null and lower(regexp_replace(x.supplier,'[^[:alnum:]]','','g'))=lower(regexp_replace(d.supplier,'[^[:alnum:]]','','g')) and lower(regexp_replace(x.invoice_number,'[^[:alnum:]]','','g'))=lower(regexp_replace(d.invoice_number,'[^[:alnum:]]','','g'))))) then
 raise exception 'Friedrich: Rechnung bereits als Ausgabe vorhanden. Keine zweite Kostenbuchung.' using errcode='23505'; end if;
 return new;
end $$;
revoke all on function gp_stock_private.guard_expense() from public,anon,authenticated;
create trigger friedrich_stock_expense_guard before insert on public.expenses for each row
when(new.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29') execute function gp_stock_private.guard_expense();

-- One complete source batch per Z/day. Repeated article numbers within a report
-- (e.g. gratis rows) remain additive. Archive duplicates never supplement a real Z.
create view public.gp_f_stock_sales with(security_invoker=true) as
with batches as (
 select closing_date,z_number,regexp_replace(source_key,'[:-][0-9]+$','') batch,
 max(imported_at) latest, bool_or(coalesce(raw_data->>'verified','false')='true') verified
 from public.bonit_article_sales where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 group by 1,2,3
), ranked as (
 select *,row_number() over(partition by closing_date,coalesce(z_number,'archive') order by verified desc,latest desc,batch) rn from batches
)
select s.* from public.bonit_article_sales s join ranked b on b.closing_date=s.closing_date and b.z_number is not distinct from s.z_number and b.batch=regexp_replace(s.source_key,'[:-][0-9]+$','') and b.rn=1
where s.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
and (s.z_number is not null or not exists(select 1 from batches real where real.closing_date=s.closing_date and real.z_number is not null));
revoke all on public.gp_f_stock_sales from public,anon,authenticated;
grant select on public.gp_f_stock_sales to authenticated,service_role;

create or replace function public.gp_f_stock_state(p_at timestamptz default now()) returns jsonb
language sql stable security invoker set search_path='' as $$
with base as (
 select p.*,i.name,i.category,i.net_unit_price/p.legacy_factor legacy_price,
 c.quantity count_quantity,c.counted_at count_time,c.day_complete,
 case when c.id is not null then c.quantity when i.quantity>0 and i.counted_at<=p_at then i.quantity*p.legacy_factor end baseline,
 case when c.id is not null then c.counted_at when i.quantity>0 and i.counted_at<=p_at then i.counted_at end baseline_at
 from public.gp_f_stock_products p join public.gp_inventory_items i on i.id=p.item_id and i.business_id=p.business_id
 left join lateral (select * from public.gp_f_stock_counts c where c.item_id=p.item_id and c.counted_at<=p_at order by c.counted_at desc,c.created_at desc,c.id desc limit 1)c on true
),calc as (
 select b.*,
 coalesce((select sum(l.base_quantity) from public.gp_f_stock_lines l where l.item_id=b.item_id and l.state='confirmed' and l.source_kind='delivery'
 and (l.delivery_date::timestamp at time zone 'Europe/Vienna')>b.baseline_at and (l.delivery_date::timestamp at time zone 'Europe/Vienna')<=p_at),0) received,
 coalesce((select sum(s.quantity*r.per_sale) from public.gp_f_stock_sales s join public.gp_f_stock_rules r on r.article_number=s.article_number and r.item_id=b.item_id
 where (((s.closing_date+1)::timestamp at time zone 'Europe/Vienna')-interval '1 microsecond')>b.baseline_at and (((s.closing_date+1)::timestamp at time zone 'Europe/Vienna')-interval '1 microsecond')<=p_at
 and not(coalesce(b.day_complete,false) and s.closing_date=(b.baseline_at at time zone 'Europe/Vienna')::date)),0) consumed,
 coalesce((select sum(l.quantity) from public.gp_f_stock_losses l where l.item_id=b.item_id and l.occurred_at>b.baseline_at and l.occurred_at<=p_at),0) lost,
 coalesce((select l.base_price from public.gp_f_stock_lines l where l.item_id=b.item_id and l.state='confirmed' and l.source_kind='delivery' and l.base_price is not null
 and (l.delivery_date::timestamp at time zone 'Europe/Vienna')<=p_at order by l.delivery_date desc,l.created_at desc limit 1),b.legacy_price) price,
 exists(select 1 from public.gp_f_stock_lines l where l.item_id=b.item_id and l.state='conflict') source_conflict
 from base b
)
select coalesce(jsonb_agg(jsonb_build_object(
 'item_id',item_id,'name',name,'category',category,'unit',base_unit,'pack_size',pack_size,'pack_label',pack_label,'reserve_percent',reserve_percent,
 'quantity',case when source_conflict or (not coalesce(day_complete,false) and (exists(select 1 from public.gp_f_stock_sales s where s.closing_date=(baseline_at at time zone 'Europe/Vienna')::date) or exists(select 1 from public.gp_f_stock_lines l where l.item_id=calc.item_id and l.state='confirmed' and l.source_kind='delivery' and l.delivery_date=(baseline_at at time zone 'Europe/Vienna')::date))) then null else baseline+received-consumed-lost end,
 'baseline',baseline,'counted_at',baseline_at,'received',received,'consumed',consumed,'loss',lost,'net_unit_price',price,
 'value_net',case when source_conflict or (not coalesce(day_complete,false) and (exists(select 1 from public.gp_f_stock_sales s where s.closing_date=(baseline_at at time zone 'Europe/Vienna')::date) or exists(select 1 from public.gp_f_stock_lines l where l.item_id=calc.item_id and l.state='confirmed' and l.source_kind='delivery' and l.delivery_date=(baseline_at at time zone 'Europe/Vienna')::date))) then null else (baseline+received-consumed-lost)*price end,
 'source_conflict',source_conflict,'count_kind',case when count_time is not null then 'gezählt' when baseline is not null then 'übernommene Zählung' else 'unbekannt' end,
 'timing_warning',baseline_at is not null and not coalesce(day_complete,false),
 'missing_days',(select coalesce(jsonb_agg(d::date),'[]'::jsonb) from generate_series((baseline_at at time zone 'Europe/Vienna')::date+1,(p_at at time zone 'Europe/Vienna')::date-1,interval '1 day') d where extract(isodow from d) in (4,5,6,7) and not exists(select 1 from public.gp_f_stock_sales s where s.closing_date=d::date)),
 'note',note
) order by name),'[]'::jsonb) from calc
$$;
revoke all on function public.gp_f_stock_state(timestamptz) from public,anon;
grant execute on function public.gp_f_stock_state(timestamptz) to authenticated,service_role;

create or replace function public.gp_f_stock_close(p_month date,p_reason text default '') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare rev integer; data jsonb; cutoff timestamptz;
begin
 if extract(day from p_month)<>1 then raise exception 'Monatsersten wählen'; end if;
 cutoff:=((p_month+interval '1 month')::timestamp at time zone 'Europe/Vienna');
 if cutoff>now() then raise exception 'Monat ist noch nicht abgeschlossen'; end if;
 perform pg_advisory_xact_lock(hashtextextended('f-stock-close:'||p_month,0));
 select coalesce(max(revision),0)+1 into rev from public.gp_f_stock_closings where inventory_month=p_month;
 if rev>1 and length(trim(p_reason))<5 then raise exception 'Korrekturgrund erforderlich; alter Monatsstand bleibt erhalten'; end if;
 data:=jsonb_build_object('as_of',cutoff-interval '1 microsecond','items',public.gp_f_stock_state(cutoff-interval '1 microsecond'),'calculated',true,'warning','Rechnerische Fortschreibung; unbekannte Mengen/Preise und fehlende Bonit-Tage beachten.');
 insert into public.gp_f_stock_closings(inventory_month,revision,reason,payload) values(p_month,rev,p_reason,data);
 return jsonb_build_object('revision',rev,'payload',data);
end $$;
revoke all on function public.gp_f_stock_close(date,text) from public,anon;
grant execute on function public.gp_f_stock_close(date,text) to authenticated,service_role;
