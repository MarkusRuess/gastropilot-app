do $$
declare d uuid; cnt int; b uuid:='6a5484d1-daf6-4263-897d-24cdf536aa29'; s text:='QA-AUTO-'||gen_random_uuid(); x jsonb;
begin
 x:='{"gross_total":12,"purchase_items":[{"name":"QA-auto-eindeutig","quantity":2,"unit":"Stück","total_base_quantity":2,"base_unit":"Stück","line_gross":12,"line_net":10,"tax_rate":20,"category":"food"}]}';
 insert into public.documents(business_id,document_type,document_date,supplier,invoice_number,status,extracted_data) values(b,'invoice','2020-01-02',s,'1','reviewed',x) returning id into d;
 if not exists(select 1 from public.gp_f_stock_lines where document_id=d and state='confirmed' and base_quantity=2 and base_price=5) then raise exception 'FAIL auto delivery';end if;
 update public.documents set extracted_data=x where id=d;
 if (select count(*) from public.gp_f_stock_lines where document_id=d)<>1 then raise exception 'FAIL idempotency';end if;
 update public.documents set extracted_data=jsonb_set(x,'{purchase_items,0,quantity}','3') where id=d;
 if not exists(select 1 from public.gp_f_stock_lines where document_id=d and state='conflict' and base_quantity=2) then raise exception 'FAIL conflict preservation';end if;
 x:=jsonb_set(x,'{purchase_items,0,category}','"cleaning"');
 insert into public.documents(business_id,document_type,document_date,supplier,invoice_number,status,extracted_data) values(b,'invoice','2020-01-02',s,'2','reviewed',x) returning id into d;
 if not exists(select 1 from public.gp_f_stock_lines where document_id=d and state='excluded') then raise exception 'FAIL operating supplies';end if;
 x:=jsonb_set(x,'{purchase_items,0,category}','"unknown"');
 insert into public.documents(business_id,document_type,document_date,supplier,invoice_number,status,extracted_data) values(b,'invoice','2020-01-02',s,'3','reviewed',x) returning id into d;
 if not exists(select 1 from public.gp_f_stock_lines where document_id=d and state='review') then raise exception 'FAIL unknown';end if;
 x:=jsonb_set(jsonb_set(x,'{purchase_items,0,category}','"food"'),'{gross_total}','13');
 insert into public.documents(business_id,document_type,document_date,supplier,invoice_number,status,extracted_data) values(b,'invoice','2020-01-02',s,'4','reviewed',x) returning id into d;
 if not exists(select 1 from public.gp_f_stock_lines where document_id=d and state='review') then raise exception 'FAIL sum mismatch';end if;
 select count(*) into cnt from public.gp_f_stock_lines;
 insert into public.documents(business_id,document_type,document_date,supplier,invoice_number,status,extracted_data) values('87889eaf-f865-4e3a-8f9a-cd01db483e0e','invoice','2020-01-02',s,'5','reviewed',x);
 if (select count(*) from public.gp_f_stock_lines)<>cnt then raise exception 'FAIL tenant isolation';end if;
end $$;
