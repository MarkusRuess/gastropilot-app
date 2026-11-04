create or replace function public.gp_f_import_bonit_articles(p_document uuid,p_z text,p_sales jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.documents%rowtype; incoming jsonb; existing jsonb; n integer; total numeric;
begin
 if p_z is null or p_z !~ '^\d{3,8}$' or jsonb_typeof(p_sales)<>'array' or jsonb_array_length(p_sales)=0 then raise exception 'Artikel/Z-Nummer ungültig'; end if;
 select * into d from public.documents where id=p_document and business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and document_type='cash_report' for update;
 if not found or not exists(select 1 from public.business_members where business_id=d.business_id and user_id=auth.uid()) then raise exception 'Kein berechtigter Friedrich-Beleg';end if;
 perform pg_advisory_xact_lock(hashtextextended('f-bonit:'||d.business_id||':'||d.document_date,0));
 if exists(select 1 from jsonb_array_elements(p_sales) x where jsonb_typeof(x->'quantity') is distinct from 'number' or jsonb_typeof(x->'unit_price') is distinct from 'number' or jsonb_typeof(x->'gross_amount') is distinct from 'number' or nullif(trim(x->>'name'),'') is null or coalesce(x->>'article_number','') !~ '^\d+$' or abs((x->>'quantity')::numeric*(x->>'unit_price')::numeric-(x->>'gross_amount')::numeric)>.02) then raise exception 'Artikelzeile unvollständig';end if;
 select count(*),sum((x->>'gross_amount')::numeric),jsonb_agg(jsonb_build_array(x->>'article_number',trim(x->>'name'),(x->>'quantity')::numeric,(x->>'gross_amount')::numeric) order by x->>'article_number',trim(x->>'name'),(x->>'quantity')::numeric,(x->>'gross_amount')::numeric) into n,total,incoming from jsonb_array_elements(p_sales)x;
 if d.extracted_data->>'gross_total' is null or total is null or abs(total-(d.extracted_data->>'gross_total')::numeric)>.03 then raise exception 'Artikelgesamtsumme weicht ab';end if;
 if exists(select 1 from public.bonit_article_sales where business_id=d.business_id and closing_date=d.document_date and z_number is distinct from p_z) then raise exception 'Andere oder ungeklärte Artikelquelle vorhanden; keine Doppelbuchung';end if;
 select jsonb_agg(jsonb_build_array(article_number,article_name,quantity,gross_amount) order by article_number,article_name,quantity,gross_amount) into existing from public.bonit_article_sales where business_id=d.business_id and closing_date=d.document_date and z_number=p_z;
 if existing is not null then
 if incoming<>existing then raise exception 'Gespeicherte Einzelartikel weichen ab; Originaldaten erhalten';end if;
 return jsonb_build_object('inserted',0,'reused',n);end if;
 insert into public.bonit_article_sales(business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount,raw_data)
 select d.business_id,'upload:'||d.business_id||':'||p_z||':'||ord,d.document_date,p_z,x->>'article_number',trim(x->>'name'),(x->>'quantity')::numeric,(x->>'gross_amount')::numeric,x||jsonb_build_object('verified',true,'source','photo-upload','document_id',d.id) from jsonb_array_elements(p_sales) with ordinality t(x,ord);
 return jsonb_build_object('inserted',n,'reused',0);
end $$;
revoke all on function public.gp_f_import_bonit_articles(uuid,text,jsonb) from public,anon;
grant execute on function public.gp_f_import_bonit_articles(uuid,text,jsonb) to authenticated;
