create temporary table qa_bonit_actor as select user_id from public.business_members where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' limit 1;
create temporary table qa_bonit_doc(id uuid);
with d as (insert into public.documents(business_id,document_type,document_date,status,extracted_data) values('6a5484d1-daf6-4263-897d-24cdf536aa29','cash_report','2001-01-01','pending','{"gross_total":12,"sales_items":[]}') returning id) insert into qa_bonit_doc select id from d;
grant select on qa_bonit_doc,qa_bonit_actor to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from qa_bonit_actor),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare d uuid; rows jsonb:='[{"article_number":"1400","name":"QA Kaffee","quantity":3,"unit_price":4,"gross_amount":12},{"article_number":"1400","name":"QA Kaffee","quantity":1,"unit_price":0,"gross_amount":0}]'; r jsonb; begin
 select id into d from qa_bonit_doc;
 r:=public.gp_f_import_bonit_articles(d,'999991',rows);
 if r->>'inserted'<>'2' then raise exception 'FAIL first import';end if;
 r:=public.gp_f_import_bonit_articles(d,'999991',rows);
 if r->>'inserted'<>'0' or r->>'reused'<>'2' then raise exception 'FAIL repeat import';end if;
 begin
 perform public.gp_f_import_bonit_articles(d,'999991',jsonb_set(rows,'{0,name}','"Different article same total"'));
 raise exception 'FAIL changed identity accepted';
 exception when others then if sqlerrm='FAIL changed identity accepted' then raise;end if;end;
 begin
 perform public.gp_f_import_bonit_articles(d,'999991',jsonb_set(rows,'{0,gross_amount}','13'));
 raise exception 'FAIL mismatch accepted';
 exception when others then if sqlerrm='FAIL mismatch accepted' then raise;end if;end;
 if(select count(*) from public.bonit_article_sales where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and closing_date='2001-01-01')<>2 then raise exception 'FAIL duplicate rows';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
 perform public.gp_f_import_bonit_articles((select id from qa_bonit_doc),'999991','[{"name":"QA","article_number":"1400","quantity":3,"unit_price":4,"gross_amount":12}]');
 raise exception 'FAIL unauthorized accepted';
 exception when others then if sqlerrm='FAIL unauthorized accepted' then raise;end if;end;
end $$;
reset role;
select 'Bonit atomic import, replay, equal-total identity conflict and unauthorized access passed' as result;
