BEGIN;
DO $$
DECLARE cid uuid:=gen_random_uuid(); oid uuid:=gen_random_uuid(); rec record;
BEGIN
 INSERT INTO public.judith_ai_customers(id,name,email) VALUES(cid,'Synthetic calendar rollback',cid::text||'@example.invalid');
 INSERT INTO public.judith_ai_inquiries(id,customer_id,status,requested_date,details) VALUES(oid,cid,'confirmed','2026-11-06','Synthetic calendar rollback');
 UPDATE public.judith_ai_inquiries SET fulfillment_status='in_progress' WHERE id=oid;
 UPDATE public.judith_ai_inquiries SET fulfillment_status='ready' WHERE id=oid;
 UPDATE public.judith_ai_inquiries SET status='picked_up',picked_up_at=now() WHERE id=oid;
 UPDATE public.judith_ai_inquiries SET status='confirmed',fulfillment_status='ready',picked_up_at=null,picked_up_by=null WHERE id=oid;
 SELECT * INTO rec FROM public.judith_ai_inquiries WHERE id=oid;
 ASSERT rec.status='confirmed' AND rec.fulfillment_status='ready' AND rec.picked_up_at IS NULL,'Undo failed';
 BEGIN
  UPDATE public.judith_ai_inquiries SET fulfillment_status='invalid' WHERE id=oid;
  RAISE EXCEPTION 'Invalid stage accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 ASSERT NOT has_table_privilege('anon','public.judith_ai_inquiries','UPDATE'),'Anonymous write enabled';
 ASSERT NOT has_table_privilege('authenticated','public.judith_ai_inquiries','UPDATE'),'Direct staff write enabled';
 ASSERT (SELECT relrowsecurity FROM pg_class WHERE pg_class.oid='public.judith_ai_inquiries'::regclass),'RLS disabled';
 ASSERT has_table_privilege('service_role','public.judith_ai_inquiries','UPDATE'),'Server write disabled';
END $$;
ROLLBACK;
