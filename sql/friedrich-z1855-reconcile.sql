-- Targeted, replay-safe data correction for Z1855. No schema or count changes.
-- Run in a transaction. Audit stays with this closing; no receipts in Git.
create temporary table z1855_before_data on commit drop as
select jsonb_build_object(
 'articles',(select md5(coalesce(string_agg(to_jsonb(a)::text,'' order by id),'')) from public.bonit_article_sales a where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 'counts',(select md5(coalesce(string_agg(to_jsonb(c)::text,'' order by id),'')) from public.gp_f_stock_counts c),
 'items',(select md5(coalesce(string_agg(to_jsonb(i)::text,'' order by id),'')) from public.gp_inventory_items i),
 'snapshots',(select md5(coalesce(string_agg(to_jsonb(s)::text,'' order by id),'')) from public.gp_inventory_snapshots s),
 'monthly_closings',(select md5(coalesce(string_agg(to_jsonb(c)::text,'' order by id),'')) from public.gp_f_stock_closings c),
 'summaries',(select md5(coalesce(string_agg(jsonb_build_array(id,closing_date,z_number,gross_amount,net_amount,cash_amount,card_amount,receipt_count)::text,'' order by id),'')) from public.bonit_daily_closings)
) fingerprint;
select pg_advisory_xact_lock(hashtextextended('friedrich-z1855-rule-correction',0));
create temporary table z1855_changes(before_row jsonb,after_row jsonb) on commit drop;
-- Explicit operator recipe: 8 g single, 16 g double; 1500-g Illy can.
with before as materialized (
 select r.* from public.gp_f_stock_rules r join public.gp_f_stock_products p on p.item_id=r.item_id
 where r.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and r.article_number='1400'
 and r.item_id='e4e19947-6ee2-4671-a8ca-b2fa52cac6d5' and r.per_sale=0.8 and p.base_unit='g' and p.pack_size=1500
), changed as (
 update public.gp_f_stock_rules r set per_sale=8,note='Betreiber: 8 g je einfachem Kaffee, 16 g doppelt; Illy-Dose 1500 g. Z1855-Kontrolle 2026-11-04; vorheriger Stand im Abschluss-Audit.' from before b where r.id=b.id returning r.*
) insert into z1855_changes select to_jsonb(b),to_jsonb(c) from before b join changed c using(id);
-- Existing bottle-fraction rules were not converted with their product profiles.
-- Only inspected Z1855 rules with the original migration provenance are touched.
with before as materialized (
 select r.*,p.legacy_factor from public.gp_f_stock_rules r join public.gp_f_stock_products p on p.item_id=r.item_id
 where r.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and p.base_unit='l' and p.pack_size=0.75 and p.legacy_factor=0.75
 and r.article_number in('3010','3012','3020','3021','3022','3040','3050','3052','4013','4017','4019')
 and r.note='Bestehender BONit-Artikel: Flasche bzw. 1/8 l bei 0,75-l-Flasche; keine Reserve enthalten.'
 and (r.per_sale=1 or abs(r.per_sale-1.0/6)<0.000001 or abs(r.per_sale-0.1/0.75)<0.000001)
),changed as (
 update public.gp_f_stock_rules r set per_sale=round(b.per_sale*b.legacy_factor,6),note='2026-11-04: vorhandene bestätigte 0,75-l-Stammdaten; alte Flaschenfraktion einmalig in Liter umgerechnet. Glas 0,1 l bzw. 1/8 l laut BONit. Vorheriger Stand im Z1855-Audit.' from before b where r.id=b.id returning r.*
) insert into z1855_changes select to_jsonb(b)-'legacy_factor',to_jsonb(c) from before b join changed c using(id);
-- New mappings only to existing products; no invented inventory or packaging.
with candidate as (
 select v.code,p.item_id,v.qty,v.proof from (values
 ('1512','Sodawasser (hausgemacht)',0.25::numeric,'BONit 1512: reines Sodawasser 0,25 l; vorhandener Soda-Artikel.'),
 ('1513','Sodawasser (hausgemacht)',0.5::numeric,'BONit 1513: reines Sodawasser 1/2 l; vorhandener Soda-Artikel.'),
 ('3049','Pfaffl Grüner Veltliner 0,75l',0.75::numeric,'BONit 3049 und vorhandener Artikelstamm: dieselbe 0,75-l-Flasche; Gratiszeile ebenfalls Mengenverbrauch.'),
 ('4014','Neumeister Grauburgunder Straden 0,75l',0.75::numeric,'BONit 4014 und vorhandener Artikelstamm: dieselbe 0,75-l-Flasche.'),
 ('3057','Hauswein Weißwein – Hofer',0.125::numeric,'Vorhandene gp_ingredient_links: Sommerspritzer, Grüner Veltliner 125 ml. Nur belegter Weinanteil; Soda/Eis/Zitrone weiter offen.'),
 ('1519','Sodawasser (hausgemacht)',0.125::numeric,'Vorhandene gp_ingredient_links: Crodino, 125 ml Soda laut Betreiberrezept; Flaschenanteil bereits separat zugeordnet.')
 )v(code,name,qty,proof) join public.gp_inventory_items i on i.name=v.name and i.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' join public.gp_f_stock_products p on p.item_id=i.id and p.base_unit='l'
),inserted as (
 insert into public.gp_f_stock_rules(article_number,item_id,per_sale,note)
 select code,item_id,qty,proof||' Z1855-Prüfung 2026-11-04.' from candidate
 on conflict(article_number,item_id) do nothing returning *
) insert into z1855_changes select null,to_jsonb(i) from inserted i;
-- Retain original rule values. Replay never replaces this audit.
update public.bonit_daily_closings c set raw_data=raw_data||jsonb_build_object('z1855_rule_corrections',jsonb_build_object('checked_at',now(),'changes',(select jsonb_agg(jsonb_build_object('before',before_row,'after',after_row)) from z1855_changes)))
where c.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and c.z_number='1855' and exists(select 1 from z1855_changes);
create temporary table z1855_after_data on commit drop as
select jsonb_build_object(
 'articles',(select md5(coalesce(string_agg(to_jsonb(a)::text,'' order by id),'')) from public.bonit_article_sales a where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'),
 'counts',(select md5(coalesce(string_agg(to_jsonb(c)::text,'' order by id),'')) from public.gp_f_stock_counts c),
 'items',(select md5(coalesce(string_agg(to_jsonb(i)::text,'' order by id),'')) from public.gp_inventory_items i),
 'snapshots',(select md5(coalesce(string_agg(to_jsonb(s)::text,'' order by id),'')) from public.gp_inventory_snapshots s),
 'monthly_closings',(select md5(coalesce(string_agg(to_jsonb(c)::text,'' order by id),'')) from public.gp_f_stock_closings c),
 'summaries',(select md5(coalesce(string_agg(jsonb_build_array(id,closing_date,z_number,gross_amount,net_amount,cash_amount,card_amount,receipt_count)::text,'' order by id),'')) from public.bonit_daily_closings)
) fingerprint;
do $$ begin
 if(select fingerprint from z1855_before_data) is distinct from(select fingerprint from z1855_after_data) then raise exception 'Existing articles/counts/inventory/monthly snapshots or revenue changed';end if;
 if not exists(select 1 from public.gp_f_stock_products where item_id='829bea07-8d63-42ba-9c9c-be0503e166c7' and pack_size=1 and base_unit='l') then raise exception 'HOFER house wine must remain 1 litre';end if;
 if not exists(select 1 from public.gp_f_stock_products where item_id='e4e19947-6ee2-4671-a8ca-b2fa52cac6d5' and pack_size=1500 and base_unit='g') then raise exception 'Illy can must remain 1500g';end if;
 if exists(select 1 from public.gp_f_stock_rules where item_id='e4e19947-6ee2-4671-a8ca-b2fa52cac6d5' and per_sale<>case when article_number='1401' then 16 else 8 end) then raise exception 'Coffee portions incorrect';end if;
 if(select sum(s.quantity*r.per_sale) from public.gp_f_stock_sales s join public.gp_f_stock_rules r on r.article_number=s.article_number where s.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and s.z_number='1855' and r.item_id='e4e19947-6ee2-4671-a8ca-b2fa52cac6d5')<>504 then raise exception 'Z1855 coffee must be 504 grams including free coffees';end if;
 if(select count(*) from public.gp_f_stock_sales where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and z_number='1855')<>73 then raise exception '73 source lines required';end if;
end $$;
select jsonb_build_object('corrected_rules',(select count(*) from z1855_changes where before_row is not null),'new_rules',(select count(*) from z1855_changes where before_row is null),'preserved_fingerprint',(select fingerprint from z1855_after_data)) result;
