BEGIN;
DO $$
DECLARE cid uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); n integer;
BEGIN
 INSERT INTO public.judith_ai_customers(id,name,email) VALUES(cid,'Synthetic backlist rollback',cid::text||'@example.invalid');
 INSERT INTO public.judith_ai_inquiries(id,customer_id,status,requested_date,details) VALUES
 (a,cid,'confirmed','2026-11-12',E'Vereinbarter Preis brutto: 95 €\nBackliste: 2 | 24 cm | Vanille | Erdbeercreme + Schokoladencreme'),
 (b,cid,'confirmed','2026-11-12',E'Backliste: 1 | 30 cm | Sacher | Keine');
 ASSERT (SELECT count(*) FROM public.judith_ai_inquiries WHERE customer_id=cid)=2,'Distinct cakes of same customer collapsed';
 SELECT sum(trim(split_part(split_part(line,':',2),'|',1))::integer) INTO n FROM public.judith_ai_inquiries i CROSS JOIN LATERAL regexp_split_to_table(i.details,E'\n') line WHERE i.customer_id=cid AND line LIKE 'Backliste:%';
 ASSERT n=3,'Explicit cake quantities did not round-trip';
 UPDATE public.judith_ai_inquiries SET details=E'Vereinbarter Preis brutto: 95 €\nBackliste: 4 | 24 cm | Vanille | Erdbeercreme + Schokoladencreme' WHERE id=a;
 ASSERT (SELECT details LIKE '%95 €%' FROM public.judith_ai_inquiries WHERE id=a),'Customer price text changed';
 UPDATE public.judith_ai_inquiries SET fulfillment_status='in_progress' WHERE id=a;
 ASSERT (SELECT count(*) FROM public.judith_ai_inquiries WHERE customer_id=cid AND status='confirmed' AND requested_date BETWEEN '2026-11-09' AND '2026-11-15')=2,'In-progress excluded from confirmed production';
 UPDATE public.judith_ai_inquiries SET status='picked_up',picked_up_at=now() WHERE id=b;
 ASSERT (SELECT count(*) FROM public.judith_ai_inquiries WHERE customer_id=cid AND status='confirmed' AND picked_up_at IS NULL)=1,'Pickup stayed in production';
 UPDATE public.judith_ai_inquiries SET requested_date='2026-11-16' WHERE id=a;
 ASSERT (SELECT count(*) FROM public.judith_ai_inquiries WHERE customer_id=cid AND status='confirmed' AND requested_date BETWEEN '2026-11-09' AND '2026-11-15')=0,'Date change stayed in previous week';
 ASSERT (SELECT count(*) FROM public.judith_ai_inquiries WHERE customer_id=cid)=2,'Orders deleted';
 ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.judith_ai_inquiries'::regclass),'RLS disabled';
 ASSERT NOT has_table_privilege('anon','public.judith_ai_inquiries','UPDATE'),'Anonymous write enabled';
 ASSERT NOT has_table_privilege('authenticated','public.judith_ai_inquiries','UPDATE'),'Direct staff write enabled';
END $$;
ROLLBACK;
