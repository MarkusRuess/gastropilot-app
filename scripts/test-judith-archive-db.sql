BEGIN;
DO $$
DECLARE cid uuid:=gen_random_uuid(); inquiry_id uuid:=gen_random_uuid(); before_json jsonb; after_json jsonb;
BEGIN
 INSERT INTO public.judith_ai_customers(id,name,email) VALUES(cid,'Synthetic archive rollback',cid::text||'@example.invalid');
 INSERT INTO public.judith_ai_inquiries(id,customer_id,status,requested_date,details,fulfillment_status) VALUES(inquiry_id,cid,'confirmed','2026-11-12','Archive rollback price 250 EUR','ready');
 SELECT to_jsonb(t)-'archived_at'-'archived_by' INTO before_json FROM public.judith_ai_inquiries t WHERE id=inquiry_id;
 UPDATE public.judith_ai_inquiries SET archived_at=now() WHERE id=inquiry_id;
 ASSERT NOT EXISTS(SELECT 1 FROM public.judith_ai_inquiries WHERE id=inquiry_id AND archived_at IS NULL),'Archived order still active';
 ASSERT EXISTS(SELECT 1 FROM public.judith_ai_customers WHERE id=cid),'Customer lost';
 UPDATE public.judith_ai_inquiries SET archived_at=null,archived_by=null WHERE id=inquiry_id;
 SELECT to_jsonb(t)-'archived_at'-'archived_by' INTO after_json FROM public.judith_ai_inquiries t WHERE id=inquiry_id;
 ASSERT before_json=after_json,'Order fields changed';
 ASSERT NOT has_table_privilege('anon','public.judith_ai_inquiries','UPDATE'),'Anonymous write enabled';
 ASSERT NOT has_table_privilege('authenticated','public.judith_ai_inquiries','UPDATE'),'Direct staff write enabled';
 ASSERT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid='public.judith_ai_inquiries'::regclass),'RLS disabled';
END $$;
ROLLBACK;
