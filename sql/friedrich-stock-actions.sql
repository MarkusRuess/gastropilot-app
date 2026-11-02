create or replace function public.gp_f_stock_add_product(p_name text,p_unit text,p_price numeric default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if p_unit not in ('l','g','Stück') or length(trim(p_name))<2 or p_price<0 then raise exception 'Artikel/Einheit/Preis ungültig'; end if;
 insert into public.gp_inventory_items(business_id,name,category,unit,quantity,net_unit_price,counted_at)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29',trim(p_name),'Lager',p_unit,0,p_price,now()) returning id into result;
 insert into public.gp_f_stock_products(item_id,base_unit,legacy_factor,note) values(result,p_unit,1,'Neuer Artikel; Bestand unbekannt bis zur Zählung.');
 return result;
end $$;
revoke all on function public.gp_f_stock_add_product(text,text,numeric) from public,anon;
grant execute on function public.gp_f_stock_add_product(text,text,numeric) to authenticated,service_role;

create table public.gp_f_stock_line_audit (
 id uuid primary key default gen_random_uuid(),business_id uuid not null default '6a5484d1-daf6-4263-897d-24cdf536aa29'
 check(business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 line_id uuid not null references public.gp_f_stock_lines(id), previous jsonb not null,
 changed_at timestamptz not null default now(), changed_by uuid default auth.uid()
);
alter table public.gp_f_stock_line_audit enable row level security;
revoke all on public.gp_f_stock_line_audit from public,anon,authenticated;
create policy owner_read on public.gp_f_stock_line_audit for select to authenticated using(exists(select 1 from public.business_members m where m.business_id=gp_f_stock_line_audit.business_id and m.user_id=(select auth.uid()) and m.role='owner'));
grant select on public.gp_f_stock_line_audit to authenticated;
grant all on public.gp_f_stock_line_audit to service_role;
create or replace function gp_stock_private.line_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if to_jsonb(old) is distinct from to_jsonb(new) then insert into public.gp_f_stock_line_audit(line_id,previous) values(old.id,to_jsonb(old)); end if;
 return new;
end $$;
revoke all on function gp_stock_private.line_audit() from public,anon,authenticated;
create trigger stock_line_audit before update on public.gp_f_stock_lines for each row execute function gp_stock_private.line_audit();

create or replace function public.gp_f_stock_confirm(p_line uuid,p_item uuid,p_quantity numeric,p_price numeric,p_date date,p_note text,p_remember boolean default false,p_exclude boolean default false,p_count_at timestamptz default null,p_day_complete boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
declare l public.gp_f_stock_lines%rowtype; q numeric;
begin
 select * into l from public.gp_f_stock_lines where id=p_line and business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' for update;
 if not found then raise exception 'Keine berechtigte Friedrich-Position'; end if;
 if l.state in ('confirmed','excluded') then return; end if;
 if l.state='conflict' and length(trim(p_note))<5 then raise exception 'Quellkonflikt: Korrekturgrund erforderlich'; end if;
 if p_exclude then
 update public.gp_f_stock_lines set state='excluded',note=p_note,confirmed_by=auth.uid(),confirmed_at=now() where id=l.id;return;end if;
 if p_quantity is null or p_date is null or p_price<0 or not exists(select 1 from public.gp_f_stock_products where item_id=p_item) then raise exception 'Menge, Datum oder Artikel fehlen'; end if;
 if l.source_kind='count' then
  if p_quantity<0 or p_count_at is null or p_count_at>now() then raise exception 'Zählmenge/Zählzeitpunkt ungültig'; end if;
  insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,note,request_id)
  values(p_item,p_quantity,p_count_at,p_day_complete,'Zählliste: '||l.name||' '||coalesce(p_note,''),gen_random_uuid());
 end if;
 l.raw_data:=coalesce(l.candidate_data,l.raw_data);
 update public.gp_f_stock_lines set item_id=p_item,base_quantity=p_quantity,base_price=p_price,delivery_date=p_date,state='confirmed',raw_data=l.raw_data,candidate_data=null,note=p_note,confirmed_at=now(),confirmed_by=auth.uid() where id=l.id;
 q:=case when jsonb_typeof(l.raw_data->'quantity')='number' then (l.raw_data->>'quantity')::numeric end;
 if p_remember and l.source_kind='delivery' then
  if q is null or q=0 or p_quantity/q<=0 or nullif(l.article_number,'') is null or nullif(l.supplier,'') is null or nullif(l.raw_data->>'unit','') is null then raise exception 'Lieferantenartikelnummer, positive Umrechnung und Rechnungseinheit erforderlich'; end if;
  insert into public.gp_f_stock_supplier_rules(supplier,article_number,item_id,input_unit,factor,packaging)
  values(lower(trim(l.supplier)),l.article_number,p_item,l.raw_data->>'unit',p_quantity/q,jsonb_build_object('pack_size',l.raw_data->'pack_size','pack_unit',l.raw_data->'pack_unit','units_per_pack',l.raw_data->'units_per_pack','quantity_basis',l.raw_data->'quantity_basis'))
  on conflict(supplier,article_number) do update set item_id=excluded.item_id,input_unit=excluded.input_unit,factor=excluded.factor,packaging=excluded.packaging;
 end if;
end $$;
revoke all on function public.gp_f_stock_confirm(uuid,uuid,numeric,numeric,date,text,boolean,boolean,timestamptz,boolean) from public,anon;
grant execute on function public.gp_f_stock_confirm(uuid,uuid,numeric,numeric,date,text,boolean,boolean,timestamptz,boolean) to authenticated,service_role;

-- Existing ingredient data reused. No prices, quantities or bigger purchase packs invented.
insert into public.gp_inventory_items(business_id,name,category,unit,quantity,net_unit_price,counted_at)
select '6a5484d1-daf6-4263-897d-24cdf536aa29',n,'Rezeptzutaten','Liter',0,null,now()
from unnest(array['Aperol','Vino Frizzante (Produktzuordnung offen)','Sodawasser (hausgemacht)','Höllinger Naturtrüb Steirischer Apfelsaft 1 l','Crodino 0,175l']) n
on conflict(business_id,name) do nothing;
insert into public.gp_f_stock_products(item_id,base_unit,legacy_factor,pack_size,pack_label,note)
select id,'l',1,case when name like '% 1 l' then 1 when name='Crodino 0,175l' then 0.175 end,
case when name like '% 1 l' then 'Flasche à 1 l' when name='Crodino 0,175l' then 'Flasche à 0,175 l' end,
'Vorhandene Rezeptzutat; Menge/Preis nicht bekannt; Produktidentität bei Lieferung prüfen.'
from public.gp_inventory_items where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
and name in ('Aperol','Vino Frizzante (Produktzuordnung offen)','Sodawasser (hausgemacht)','Höllinger Naturtrüb Steirischer Apfelsaft 1 l','Crodino 0,175l') on conflict do nothing;
-- Only existing recipe amounts, no assumptions for the other cocktails.
insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
select n,p.item_id,q,'Bestehende Rezeptur aus gp_ingredient_links; weitere Zutaten gesondert prüfen.'
from (values
('3042','Aperol',0.06),('3042','Vino Frizzante (Produktzuordnung offen)',0.09),('3042','Sodawasser (hausgemacht)',0.03),
('3018','Sodawasser (hausgemacht)',0.125),
('1519','Crodino 0,175l',0.175),
('1529','Höllinger Naturtrüb Steirischer Apfelsaft 1 l',0.125),('1529','Sodawasser (hausgemacht)',0.125),
('1515','Höllinger Naturtrüb Steirischer Apfelsaft 1 l',0.375),('1515','Sodawasser (hausgemacht)',0.125)
)v(n,name,q) join public.gp_inventory_items i on i.name=v.name and i.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' join public.gp_f_stock_products p on p.item_id=i.id;
-- Sarti's prosecco amount exists, but its spirit amount still needs source confirmation.
insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
select distinct s.article_number,p.item_id,0.09,'Bestehende Sarti-Rezeptur: 90 ml Frizzante. Sarti/Soda-Mengen noch offen.'
from public.bonit_article_sales s cross join public.gp_f_stock_products p join public.gp_inventory_items i on i.id=p.item_id
where s.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and s.article_name ilike '%Sarti%Spritz%' and s.article_number is not null and i.name='Vino Frizzante (Produktzuordnung offen)' on conflict do nothing;

-- Historical documents are staged read-only, without rerunning any shared document triggers.
insert into public.gp_f_stock_lines(source_key,document_id,supplier,article_number,name,raw_data,source_kind,delivery_date,note)
select coalesce(nullif(lower(regexp_replace(d.supplier,'[^[:alnum:]]','','g')),'')||':'||nullif(lower(regexp_replace(d.invoice_number,'[^[:alnum:]]','','g')),''),'document:'||d.id)||':delivery:'||x.n,
d.id,d.supplier,x.value->>'article_number',x.value->>'name',x.value,'delivery',d.document_date,'Bestehender Beleg: Zuordnung, Gebinde und tatsächlich gelieferte Menge bestätigen.'
from public.documents d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.extracted_data->'purchase_items')='array' then d.extracted_data->'purchase_items' else '[]' end) with ordinality x(value,n)
where d.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and d.document_type='invoice' and nullif(trim(x.value->>'name'),'') is not null
on conflict(source_key) do nothing;
