-- Additive Friedrich-only automation. Existing capture/audit/conflict rules stay authoritative.
create or replace function gp_stock_private.auto_purchase() returns trigger
language plpgsql security definer set search_path='' as $$
declare l public.gp_f_stock_lines%rowtype; x jsonb; q numeric; n numeric; g numeric; tax numeric; u text; cat text; iid uuid; total numeric; expected numeric;
begin
 if new.business_id<>'6a5484d1-daf6-4263-897d-24cdf536aa29' or new.document_type<>'invoice' or new.status not in ('reviewed','auto_imported') then return new; end if;
 if nullif(trim(new.invoice_number),'') is null or nullif(trim(new.supplier),'') is null or new.document_date is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('f-auto:'||lower(new.supplier),0));
 expected:=gp_stock_private.number(new.extracted_data->'gross_total');
 select sum(gp_stock_private.number(v->'line_gross')) into total from jsonb_array_elements(coalesce(new.extracted_data->'purchase_items','[]')) v;
 for l in select * from public.gp_f_stock_lines where document_id=new.id and source_kind='delivery' and state='review' for update loop
 x:=l.raw_data; cat:=x->>'category';
 if cat in ('cleaning','consumables','packaging','equipment','nonfood') or x->>'line_kind' in ('deposit','transport') then
 update public.gp_f_stock_lines set state='excluded',note='Betriebsbedarf / Verbrauchsmaterial; kein Lebensmittel-Wareneinsatz.',confirmed_at=now() where id=l.id; continue; end if;
 if cat not in ('food','beverage','drinks','coffee','merchandise') or cat is null or coalesce(x->>'review_required','false')<>'false' then continue; end if;
 if expected is null or total is null or abs(total-expected)>.03 or exists(select 1 from jsonb_array_elements(new.extracted_data->'purchase_items') v where gp_stock_private.number(v->'line_gross') is null) then continue; end if;
 q:=gp_stock_private.number(x->'total_base_quantity');u:=x->>'base_unit';
 if q is null and x->>'unit' in ('Stück','Flasche','Dose','Packung') then q:=gp_stock_private.number(x->'quantity');u:='Stück';end if;
 g:=gp_stock_private.number(x->'line_gross');tax:=gp_stock_private.number(x->'tax_rate');n:=gp_stock_private.number(x->'line_net');
 if n is null and tax in (0,10,13,20) then n:=g/(1+tax/100);end if;
 if q is null or q=0 or u not in ('l','g','Stück') or n is null or n/q<0 or l.delivery_date is null or tax is null or abs(n*(1+tax/100)-g)>.03 then continue;end if;
 select i.id into iid from public.gp_inventory_items i join public.gp_f_stock_products p on p.item_id=i.id where i.business_id=new.business_id and i.name=l.name and p.base_unit=u;
 if iid is null then
 insert into public.gp_inventory_items(business_id,name,category,unit,quantity,net_unit_price,counted_at)
 values(new.business_id,l.name,case when cat='food' then 'Lebensmittel' else 'Getränke' end,u,0,n/q,now()) on conflict(business_id,name) do nothing returning id into iid;
 if iid is null then continue;end if;
 insert into public.gp_f_stock_products(item_id,base_unit,legacy_factor,note) values(iid,u,1,'Automatischer belegter Zugang; Anfangsbestand unbekannt.');
 end if;
 update public.gp_f_stock_lines set item_id=iid,base_quantity=q,base_price=n/q,state='confirmed',note='Automatisch: eindeutige Position, Einheit, Steuer und Belegsumme geprüft. Anfangsbestand bleibt unbekannt.',confirmed_at=now() where id=l.id;
 end loop;
 return new;
end $$;
revoke all on function gp_stock_private.auto_purchase() from public,anon,authenticated;
create trigger zz_friedrich_auto_purchase after insert or update of extracted_data,status on public.documents
for each row when(new.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29') execute function gp_stock_private.auto_purchase();

create table public.gp_f_stock_period_checks (
 business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29' check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 inventory_month date not null check(extract(day from inventory_month)=1), purchases_complete boolean not null default false,
 checked_at timestamptz not null default now(), primary key(business_id,inventory_month)
);
alter table public.gp_f_stock_period_checks enable row level security;
revoke all on public.gp_f_stock_period_checks from public,anon,authenticated;
create policy owner_access on public.gp_f_stock_period_checks for all to authenticated
using(exists(select 1 from public.business_members m where m.business_id=gp_f_stock_period_checks.business_id and m.user_id=(select auth.uid()) and m.role='owner'))
with check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and exists(select 1 from public.business_members m where m.business_id=gp_f_stock_period_checks.business_id and m.user_id=(select auth.uid()) and m.role='owner'));
grant select,insert,update on public.gp_f_stock_period_checks to authenticated;
grant all on public.gp_f_stock_period_checks to service_role;
