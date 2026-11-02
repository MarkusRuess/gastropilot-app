-- Guard non-numeric OCR quantities without interrupting an invoice import.
create or replace function gp_price_private.process_invoice(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
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
