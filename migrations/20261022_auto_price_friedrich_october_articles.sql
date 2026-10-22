create or replace function private.auto_price_friedrich_october_article_price()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_price_count bigint;
  v_unit_price numeric;
begin
  if new.business_id <> '6a5484d1-daf6-4263-897d-24cdf536aa29'::uuid
     or new.closing_date < date '2026-10-01'
     or new.closing_date >= date '2026-11-01'
     or new.gross_amount is not null
     or new.quantity is null
     or new.quantity = 0
     or nullif(btrim(new.article_name), '') is null then
    return new;
  end if;

  select count(distinct p.unit_price), min(p.unit_price)
    into v_price_count, v_unit_price
    from (
      select round(s.gross_amount / nullif(s.quantity, 0), 4) as unit_price
        from public.bonit_article_sales s
       where s.business_id = new.business_id
         and s.article_name = new.article_name
         and (new.article_number is null or s.article_number = new.article_number)
         and s.closing_date >= date '2026-10-01'
         and s.closing_date < date '2026-11-01'
         and s.id is distinct from new.id
         and s.gross_amount > 0
         and s.quantity > 0
    ) p;

  if coalesce(v_price_count, 0) = 0 then
    v_unit_price := case
      when new.article_number = '3005' and new.article_name = 'Gross Gelber Muskateller 0,75l' then 45.00
      when new.article_number = '1600' and new.article_name = 'Averna 2cl' then 4.50
      when new.article_number = '1607' and new.article_name = 'Hendricks Gin Tonic 4cl Fever Tree Mediteranne' then 12.50
      when new.article_number = '3001' and new.article_name = 'Weingut Christtian Steiner Rose  0,75l' then 35.00
      when new.article_number = '3030' and new.article_name = 'Gisperg Chardonnay 0,75l' then 38.00
      when new.article_number = '3052' and new.article_name = 'Alphart Rotgipferl vom Berg 0,75l' then 38.00
      when new.article_number = '3032' and new.article_name = 'MIRAVAL Rose 0,75l' then 48.00
      else null
    end;
    if v_unit_price is not null then
      v_price_count := 1;
    end if;
  end if;

  if v_price_count = 1 and v_unit_price > 0 then
    new.gross_amount := round(new.quantity * v_unit_price, 2);
    new.raw_data := coalesce(new.raw_data, '{}'::jsonb) ||
      jsonb_build_object(
        'gross_amount_source', 'same_october_unit_price',
        'gross_amount_unit_price', v_unit_price
      );
  end if;

  return new;
end;
$function$;

revoke all on function private.auto_price_friedrich_october_article_price() from public;

drop trigger if exists auto_price_friedrich_october_article_price on public.bonit_article_sales;

create trigger auto_price_friedrich_october_article_price
before insert or update on public.bonit_article_sales
for each row execute function private.auto_price_friedrich_october_article_price();