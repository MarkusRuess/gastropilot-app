begin;
do $$
declare
 j uuid:='87889eaf-f865-4e3a-8f9a-cd01db483e0e'; other_business uuid;
 ingredient uuid:=gen_random_uuid(); second_ingredient uuid:=gen_random_uuid(); doc uuid:=gen_random_uuid(); olddoc uuid:=gen_random_uuid(); bad uuid:=gen_random_uuid(); unreviewed uuid:=gen_random_uuid(); foreigndoc uuid:=gen_random_uuid();
 label text:='QA Price '||gen_random_uuid(); u uuid; draft uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); order_id uuid:=gen_random_uuid(); n integer;
begin
 insert into public.gp_ingredient_catalog(id,business_id,name,canonical_unit) values(ingredient,j,label,'kg');
 insert into public.documents(id,business_id,document_type,document_date,status,extracted_data)
 values(doc,j,'invoice',current_date,'reviewed',jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','g','unit_price_net',0.002,'quantity',1000,'line_net',2))));
 assert (select current_price_net=2 from public.gp_ingredient_catalog where id=ingredient),'unit normalization failed';
 assert (select status='matched' from public.judith_price_invoice_links where document_id=doc),'invoice match missing';
 perform gp_price_private.process_invoice(doc);
 assert (select count(*)=1 from public.gp_ingredient_price_history where document_id=doc and ingredient_id=ingredient),'duplicate price history';
 insert into public.documents(id,business_id,document_type,document_date,status,extracted_data)
 values(olddoc,j,'invoice',current_date-1,'reviewed',jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',1))));
 assert (select current_price_net=2 from public.gp_ingredient_catalog where id=ingredient),'old invoice overwrote newer price';
 assert (select status='matched_historical' from public.judith_price_invoice_links where document_id=olddoc),'historical classification failed';
 insert into public.documents(id,business_id,document_type,document_date,status,extracted_data)
 values(bad,j,'invoice',current_date,'reviewed',jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','Karton','unit_price_net',5))));
 assert (select status='review_unit' from public.judith_price_invoice_links where document_id=bad),'unknown package accepted';
 update public.documents set extracted_data=jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',3))) where id=bad;
 assert (select status='review_same_date_conflict' from public.judith_price_invoice_links where document_id=bad),'same-date conflict accepted';
 update public.documents set extracted_data=jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',2,'quantity',2,'line_net',100))) where id=bad;
 assert (select status='review_totals' from public.judith_price_invoice_links where document_id=bad),'inconsistent totals accepted';
 insert into public.documents(id,business_id,document_type,document_date,status,extracted_data)
 values(unreviewed,j,'invoice',current_date,'auto_review',jsonb_build_object('needs_review',true,'purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',100))));
 assert (select status='review_source' from public.judith_price_invoice_links where document_id=unreviewed),'unreviewed source accepted';
 update public.documents set extracted_data=jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',2,'quantity','unlesbar'))) where id=bad;
 assert (select status='review_totals' from public.judith_price_invoice_links where document_id=bad),'invalid OCR quantity was accepted';
 insert into public.gp_ingredient_catalog(id,business_id,name,canonical_unit) values(second_ingredient,j,label||' second','kg');
 insert into public.gp_ingredient_aliases(business_id,ingredient_id,alias) values(j,second_ingredient,label);
 perform gp_price_private.process_invoice(doc);
 assert (select status='review_ambiguous' from public.judith_price_invoice_links where document_id=doc),'ambiguous alias accepted';
 select id into other_business from public.businesses where id<>j limit 1;
 insert into public.documents(id,business_id,document_type,document_date,status,extracted_data)
 values(foreigndoc,other_business,'invoice',current_date,'reviewed',jsonb_build_object('purchase_items',jsonb_build_array(jsonb_build_object('name',label,'unit','kg','unit_price_net',999))));
 assert not exists(select 1 from public.judith_price_invoice_links where document_id=foreigndoc),'Friedrich invoice entered Judith processing';
 assert (select current_price_net=2 from public.gp_ingredient_catalog where id=ingredient),'Friedrich price changed Judith ingredient';
 select user_id into u from public.judith_ai_access where active limit 1;
 insert into public.judith_ai_price_drafts(id,user_id) values(draft,u);
 insert into public.judith_ai_customers(id,name) values(customer,'QA rollback only');
 insert into public.judith_ai_inquiries(id,customer_id,occasion,details,status) values(order_id,customer,'QA','Vereinbarter Preis brutto: 123 EUR','confirmed');
 insert into public.judith_ai_price_opinions(business_id,source_key,user_id,amount_gross) values(j,'draft:'||draft,u,150);
 insert into public.judith_ai_price_calculations(business_id,source_key,user_id,fingerprint,result) values(j,'draft:'||draft,u,gen_random_uuid()::text,'{"recommended_gross":150,"status":"estimate"}');
 assert not public.judith_price_attach_draft(draft,order_id,u),'unrelated order attached';
 update public.judith_ai_inquiries set price_draft_id=draft where id=order_id;
 assert public.judith_price_attach_draft(draft,order_id,u),'attachment failed';
 assert (select inquiry_id=order_id from public.judith_ai_price_opinions where source_key='order:'||order_id),'opinion lost';
 assert (select inquiry_id=order_id from public.judith_ai_price_calculations where source_key='order:'||order_id),'recommendation lost';
 insert into public.judith_ai_price_opinions(business_id,source_key,user_id,amount_gross) values(j,'draft:'||draft,u,180);
 assert (select count(*)=2 from public.judith_ai_price_opinions where source_key='order:'||order_id),'concurrent late opinion stayed at draft';
 assert (select details='Vereinbarter Preis brutto: 123 EUR' from public.judith_ai_inquiries where id=order_id),'agreed price changed';
end $$;
select '19 database assertions passed; all synthetic rows rolled back' as verification;
rollback;
