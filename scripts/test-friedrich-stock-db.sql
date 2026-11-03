-- Execute after schema inside one BEGIN / ROLLBACK. No test accounts, no retained data.
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create temporary table qa_original_items as select id,to_jsonb(i) value from public.gp_inventory_items i where name not in ('Aperol','Vino Frizzante (Produktzuordnung offen)','Sodawasser (hausgemacht)','Höllinger Naturtrüb Steirischer Apfelsaft 1 l','Crodino 0,175l');
create temporary table qa_actor as select user_id from public.business_members where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' and role='owner' limit 1;
select pg_temp.assert_true(exists(select 1 from qa_actor),'Existing owner available without test account');
do $$ declare
 beer uuid:='4c1c36d5-f7c2-4298-87ca-24ceecbe80ce'; coffee uuid:='e4e19947-6ee2-4671-a8ca-b2fa52cac6d5';
 doc uuid; doc2 uuid; line uuid; v_supplier text:='QA Stock '||gen_random_uuid(); j jsonb; v numeric; n integer; batch text:='qa-multi-'||gen_random_uuid();
begin
 perform pg_temp.assert_true((select (x->>'quantity') is null from jsonb_array_elements(public.gp_f_stock_state()) x where x->>'item_id'='82884fda-827b-422f-9012-2871d467f8f4'),'Legacy zero is unknown');
 perform pg_temp.assert_true((select (x->>'baseline')::numeric=7500 from jsonb_array_elements(public.gp_f_stock_state()) x where x->>'item_id'=coffee::text),'Coffee legacy 5 cans = 7500 grams');
 perform pg_temp.assert_true((select per_sale=0.33 from public.gp_f_stock_rules where article_number='2000'),'Beer 0.33');
 perform pg_temp.assert_true((select per_sale=16 from public.gp_f_stock_rules where article_number='1401'),'Double coffee 16 g');
 perform pg_temp.assert_true((select per_sale=8 from public.gp_f_stock_rules where article_number='1400'),'Single coffee 8 g');
 perform pg_temp.assert_true(not exists(select 1 from public.gp_f_stock_rules where article_number='DECAF-QA'),'Decaf never automatically mapped');
 insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,request_id) values(beer,100,'2020-01-01 22:00Z',true,gen_random_uuid());
 insert into public.bonit_article_sales(business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29','qa-stock-'||gen_random_uuid()||':1','2020-01-02','QA-STOCK-Z','2000','Villacher QA',10,0);
 select id into doc from public.documents where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' limit 1;
 insert into public.gp_f_stock_lines(source_key,document_id,name,raw_data,source_kind,delivery_date,item_id,base_quantity,state)
 values('qa-delivery-'||gen_random_uuid(),doc,'QA', '{}','delivery','2020-01-02',beer,50,'confirmed'),
 ('qa-late-'||gen_random_uuid(),doc,'QA earlier', '{}','delivery','2019-12-31',beer,999,'confirmed');
 select (x->>'quantity')::numeric into v from jsonb_array_elements(public.gp_f_stock_state('2020-01-03 01:00Z')) x where x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=146.7,'Delivery + sale; late pre-count delivery excluded');
 insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,request_id) values(beer,40,'2020-01-03 22:00Z',true,gen_random_uuid());
 select (x->>'quantity')::numeric into v from jsonb_array_elements(public.gp_f_stock_state('2020-01-04 01:00Z')) x where x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=40,'New count resets only this article and ignores older movements');
 insert into public.gp_f_stock_lines(source_key,document_id,name,raw_data,source_kind,delivery_date,item_id,base_quantity,state)
 values('qa-return-'||gen_random_uuid(),doc,'QA return', '{}','delivery','2020-01-04',beer,-50,'confirmed');
 select (x->>'quantity')::numeric into v from jsonb_array_elements(public.gp_f_stock_state('2020-01-05 01:00Z')) x where x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=-10,'Returns remain signed; shortages not clamped to zero');
 insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,request_id) values(beer,0,'2020-01-05 22:00Z',true,gen_random_uuid());
 select (x->>'quantity')::numeric into v from jsonb_array_elements(public.gp_f_stock_state('2020-01-06 01:00Z')) x where x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=0,'Explicit confirmed zero remains zero');
 j:=public.gp_f_stock_close('2020-01-01','');
 perform pg_temp.assert_true((j->>'revision')::integer=1,'First closing');
 perform pg_temp.assert_true(exists(select 1 from jsonb_array_elements(j#>'{payload,items}') x where x->>'item_id'=beer::text and (x->>'quantity')::numeric=0),'Closing contains confirmed zero');
 begin perform public.gp_f_stock_close('2020-01-01','');raise exception 'FAIL no reason accepted';exception when raise_exception then if sqlerrm='FAIL no reason accepted' then raise;end if; end;
 perform public.gp_f_stock_close('2020-01-01','QA correction');
 perform pg_temp.assert_true((select count(*)=2 from public.gp_f_stock_closings where inventory_month='2020-01-01'),'Correction appends revision');
 perform pg_temp.assert_true((select payload=j->'payload' from public.gp_f_stock_closings where inventory_month='2020-01-01' and revision=1),'Original closing remains identical');
 insert into public.bonit_article_sales(business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29',batch||':1','2020-01-06','QA-MULTI-Z','2000','Villacher QA',2,0),
 ('6a5484d1-daf6-4263-897d-24cdf536aa29',batch||':2','2020-01-06','QA-MULTI-Z','2000','Villacher gratis QA',3,0);
 perform pg_temp.assert_true((select sum(quantity)=5 from public.gp_f_stock_sales where z_number='QA-MULTI-Z'),'Repeated article rows within one report remain additive');
 insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,request_id) values(beer,10,'2020-01-06 12:00Z',false,gen_random_uuid());
 perform pg_temp.assert_true((select x->>'quantity' is null from jsonb_array_elements(public.gp_f_stock_state('2020-01-07 01:00Z')) x where x->>'item_id'=beer::text),'Intraday count cannot incorrectly subtract full daily sales');
 insert into public.gp_f_stock_counts(item_id,quantity,counted_at,day_complete,request_id) values(beer,10,'2020-01-06 22:00Z',true,gen_random_uuid());
 select (x->>'quantity')::numeric into v from jsonb_array_elements(public.gp_f_stock_state('2020-01-07 01:00Z')) x where x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=10,'End-of-day confirmed count already includes daily sales');
 insert into public.gp_f_stock_lines(source_key,document_id,name,raw_data,source_kind,delivery_date,item_id,base_quantity,state)
 values('qa-boundary-'||gen_random_uuid(),doc,'QA next month', '{}','delivery','2020-02-01',beer,999,'confirmed');
 perform public.gp_f_stock_close('2020-01-01','QA month boundary');
 select (x->>'received')::numeric into v from public.gp_f_stock_closings c cross join lateral jsonb_array_elements(c.payload->'items') x where c.inventory_month='2020-01-01' and c.revision=3 and x->>'item_id'=beer::text;
 perform pg_temp.assert_true(v=0,'Next-month deliveries excluded from previous month snapshot');
 -- Real document path; any related legacy triggers also stay within this rollback.
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29',(select user_id from qa_actor),'invoice','2020-02-01',v_supplier,'QA-1','reviewed',
 '{"inventory_counts":[],"purchase_items":[{"name":"QA bottles","article_number":"QA-X","quantity":1,"unit":"Karton","units_per_pack":6,"pack_size":0.75,"pack_unit":"l","quantity_basis":"cartons","line_net":45}]}') returning id into doc;
 select id into line from public.gp_f_stock_lines where document_id=doc;
 perform pg_temp.assert_true(line is not null,'Invoice with empty inventory_counts captures delivery');
 perform public.gp_f_stock_confirm(line,beer,4.5,10,'2020-02-01','QA verified cartons',true,false);
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data)
 select business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data from public.documents where id=doc returning id into doc2;
 perform pg_temp.assert_true((select count(*)=1 from public.gp_f_stock_lines where supplier=v_supplier and article_number='QA-X'),'Repeated invoice does not duplicate delivery');
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data)
 select business_id,uploaded_by,document_type,document_date,supplier,'QA-2',status,jsonb_set(extracted_data,'{purchase_items,0,quantity}','2') from public.documents where id=doc returning id into doc2;
 perform pg_temp.assert_true((select base_quantity=9 and state='confirmed' from public.gp_f_stock_lines where document_id=doc2),'Learned carton conversion 2 * 6 * .75, exactly once');
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data)
 select business_id,uploaded_by,document_type,document_date,supplier,'QA-3',status,jsonb_set(extracted_data,'{purchase_items,0,units_per_pack}','12') from public.documents where id=doc returning id into doc2;
 perform pg_temp.assert_true((select state='review' from public.gp_f_stock_lines where document_id=doc2),'Changed package requires review');
 insert into public.documents(business_id,uploaded_by,document_type,document_date,supplier,invoice_number,status,extracted_data)
 select business_id,uploaded_by,document_type,document_date,supplier,'QA-4',status,jsonb_set(extracted_data,'{purchase_items,0,line_kind}','"deposit"') from public.documents where id=doc returning id into doc2;
 perform pg_temp.assert_true((select state in ('review','excluded') from public.gp_f_stock_lines where document_id=doc2),'Deposit not automatically stocked');
 update public.documents set extracted_data=jsonb_set(extracted_data,'{purchase_items,0,quantity}','3') where id=doc;
 perform pg_temp.assert_true((select state='conflict' and base_quantity=4.5 from public.gp_f_stock_lines where id=line),'Re-extraction cannot silently overwrite applied quantities');
 perform pg_temp.assert_true(exists(select 1 from public.gp_f_stock_line_audit where line_id=line),'Line corrections audited');
 insert into public.expenses(business_id,document_id,expense_date,accounting_month,category,gross_amount,payment_status)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29',doc,'2020-02-01','2020-02-01','drinks',45,'open');
 begin
 insert into public.expenses(business_id,document_id,expense_date,accounting_month,category,gross_amount,payment_status)
 values('6a5484d1-daf6-4263-897d-24cdf536aa29',doc,'2020-02-01','2020-02-01','drinks',45,'open');
 raise exception 'FAIL duplicate expense accepted';exception when unique_violation then null;end;
 perform pg_temp.assert_true(not exists(select 1 from qa_original_items b join public.gp_inventory_items i on i.id=b.id where to_jsonb(i)<>b.value),'All original inventory rows unchanged');
end $$;
-- No fake account: an unassigned JWT subject must see no stock and may not write.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(public.gp_f_stock_state()='[]','Unassigned subject cannot read Friedrich');
do $$ begin
 begin insert into public.gp_f_stock_counts(item_id,quantity,counted_at,request_id) values('4c1c36d5-f7c2-4298-87ca-24ceecbe80ce',0,now(),gen_random_uuid());raise exception 'FAIL unauthorized insert';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from qa_actor),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.gp_f_stock_state())>=27,'Existing Friedrich owner can read stock through RLS');
reset role;
select pg_temp.assert_true(not has_function_privilege('anon','public.gp_f_stock_state(timestamptz)','execute'),'Anon RPC blocked');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.gp_f_stock_counts','update'),'Counts append-only');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.gp_f_stock_closings','update'),'Month revisions append-only');
select 'Friedrich stock database assertions passed; caller must ROLLBACK' as result;
