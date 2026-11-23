-- Prefer all original rows when their combined amount matches the Z close.
-- Otherwise select one verified source batch and keep every original row.
create or replace view public.gp_f_stock_sales with (security_invoker=true) as
with batches as (
 select closing_date,z_number,regexp_replace(source_key,'[:-][0-9]+$','') batch,
 max(imported_at) latest,bool_or(coalesce(raw_data->>'verified','false')='true') verified
 from public.bonit_article_sales where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 group by 1,2,3
), ranked as (
 select *,row_number() over(partition by closing_date,coalesce(z_number,'archive') order by verified desc,latest desc,batch) rn from batches
), complete_days as (
 select s.closing_date from public.bonit_article_sales s
 join public.bonit_daily_closings c on c.business_id=s.business_id and c.closing_date=s.closing_date
 where s.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 group by s.closing_date,c.gross_amount having abs(sum(s.gross_amount)-c.gross_amount)<=0.03
)
select s.id,s.business_id,s.source_key,s.closing_date,s.z_number,s.article_number,s.article_name,s.quantity,s.gross_amount,s.raw_data,s.imported_at
from public.bonit_article_sales s join ranked b on b.closing_date=s.closing_date and b.z_number is not distinct from s.z_number and b.batch=regexp_replace(s.source_key,'[:-][0-9]+$','')
where s.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
and (exists(select 1 from complete_days d where d.closing_date=s.closing_date)
 or (b.rn=1 and (s.z_number is not null or not exists(select 1 from batches real where real.closing_date=s.closing_date and real.z_number is not null))));
revoke all on public.gp_f_stock_sales from public,anon,authenticated;
grant select on public.gp_f_stock_sales to authenticated,service_role;
