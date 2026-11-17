-- Friedrich BONit Z 1866: only after visual comparison of the three originals.
-- The archive originals are retained; this block refuses any pre-existing closing or article rows.
-- Business date 2026-11-16; upload 2026-11-17. 66 lines: 26 + 40 + 0.
DO $reconcile$
DECLARE
 d public.documents%rowtype;
 v_rows jsonb;
 v_count integer;
 v_gross numeric;
 v_10 numeric;
 v_20 numeric;
BEGIN
 SELECT * INTO d FROM public.documents
 WHERE id='ab70f0fc-b2b7-421a-87f4-5cb489d13cac'
 AND business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 AND document_type='cash_report' AND document_date='2026-11-16'
 AND status='auto_review' FOR UPDATE;
 IF NOT FOUND OR (d.extracted_data->>'gross_total')::numeric<>1581.10
    OR jsonb_array_length(d.extracted_data->'original_files')<>3
    OR d.extracted_data->'original_files'<>jsonb_build_array(d.storage_path,'6a5484d1-daf6-4263-897d-24cdf536aa29/4aafabbf-3999-4528-a51d-4b142b37101d.jpg','6a5484d1-daf6-4263-897d-24cdf536aa29/5c10acba-2320-4697-a47b-39fe22ba0afc.jpg')
    OR (SELECT count(*) FROM public.documents WHERE id IN ('92267089-42b9-4e44-a193-dc4853191ff8','902dc3d0-3282-4e04-8439-978601ed6ef4') AND business_id=d.business_id AND status='reviewed' AND extracted_data->>'duplicate_of'=d.id::text)<>2
 THEN RAISE EXCEPTION 'Z 1866 archive precondition failed'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('f-bonit:'||d.business_id||':'||'2026-11-16',0));
 IF EXISTS(SELECT 1 FROM public.bonit_daily_closings
   WHERE business_id=d.business_id AND (closing_date='2026-11-16' OR z_number='1866'))
 OR EXISTS(SELECT 1 FROM public.bonit_article_sales
   WHERE business_id=d.business_id AND (closing_date='2026-11-16' OR z_number='1866'))
 THEN RAISE EXCEPTION 'Z 1866 already booked; originals unchanged'; END IF;
 WITH source AS (
  SELECT string_to_array(line,'|') a, ord FROM regexp_split_to_table(trim(both E'\n' from $rows$
109|Punschkrapferl|2|5.20|10
113|Esterhazy Schnitte|1|0|10
113|Esterhazy Schnitte|1|5.80|10
114|Kardinalschnitte|2|5.80|10
115|Cremeschnitte|3|5.80|10
117|Cheese Cake San Sebastian|1|4.80|10
129|Preiselbeerschnitte 1Stück|1|4.50|10
130|Maroniherz 1 Stück|5|4.80|10
133|Prinzess Torte 1Stück|2|6.50|10
181|Gugelhupf GLUTENFREI 1 Stück|1|15.50|10
189|Mozart Torte 1Stück|1|6.50|10
199|Sacher Torte 1Stück|2|5.80|10
204|Ei Aufstrich Brötchen|10|3.20|10
207|Räucherforelle Brötchen|1|3.20|10
212|Thunfisch Brötchen|3|3.20|10
215|Schinken Baguette 1Stück|6|5.20|10
216|Sacherwürstel 1 Paar|1|6.90|10
275|Friedrich Box 10 Brötchen|7|29.90|10
287|Käse Brötchen 1Stück|3|3.20|10
291|Käsefeuferl 1 Paar|1|6.90|10
292|Lachs Baguette 1Stück|10|5.20|10
307|Leberkäse Semmerl 1 Stück|2|4.90|10
309|Toast Schinken Käse|6|6.50|10
310|Bauerntoast Schwarzbrot XXL|2|12.50|10
313|Leber Pastete Brötchen|8|3.20|10
315|Humus Tomate Pikant|3|2.80|10
318|Roast Beef Baguette 1Stück|4|5.20|10
323|Gugelhupf 1Stück|1|0|10
1400|Espresso klein|12|3.10|20
1400|Espresso klein|1|0|20
1401|Espresso groß|1|4.20|20
1402|Espresso Macchiato|1|0|20
1402|Espresso Macchiato|1|3.10|20
1403|Verlängerter|5|3.90|20
1403|Verlängerter|1|0|20
1404|Melange|5|3.90|20
1405|Tee|7|4.80|20
1409|Heisse Schokolade|2|5.50|20
1410|Cappucino|3|3.90|20
1500|Coca Cola 0,33l|1|4.20|20
1501|Coca Cola Zero 0,33l|2|4.20|20
1502|Vöslauer Prickelnd 0,33l|5|3.80|20
1522|Soda Zitron 1/4|2|4.20|20
1524|Soda Zitrone 0,5l|1|5.50|20
1527|Hollunder Limo 0,25l|2|4.50|20
1528|Hollunder Limo 0,5l|1|4.80|20
2000|Villacher 0,3l Bier|44|4.80|20
2003|Bier Alkoholfrei 0,33l|1|4.80|20
3012|1/8 IBY Blaufränkisch BIO Wein|3|6|20
3015|1/8 Gross Gelber Muskateller|3|7.50|20
3016|1/8 Mayer Wien Gemischter Satz|2|5.90|20
3018|Weisser Spritzer Grüner Veltliner 0,25l|9|4.50|20
3020|1 Glas ProseccoValdobbiadene 0,1l|2|5.50|20
3021|Freixenet Italien Sparkling Rose 0,75l|3|41|20
3022|1 Glas Sparkling Rose Freixenet Italien 0,1l|12|5.80|20
3039|Torten und diverse Artikel|1|1|10
3042|Aperol Spritzer|1|6.90|20
3044|Tschermonegg 1/8 Sauvignon blanc|2|5.90|20
3049|Pfaffl Grüner Veltliner 0,75l|3|38|20
3050|1/8 Pfaffl Grüner Veltliner|6|5.90|20
3051|1/8 Rotgipfler vom Berg Alphart|2|5.90|20
3056|Hauswein Grüner Veltliner 1/8|6|4.50|20
4012|Muskateller Spritzer 0,25l|1|4.50|20
4024|Sarti Spritzer|2|6.90|20
5008|Tarte Citron|4|5.80|10
5012|Schokokuchen VEGAN|1|5.80|10
$rows$), E'\n') WITH ORDINALITY AS t(line,ord)
 ), parsed AS (
  SELECT ord, a[1] article_number,a[2] article_name,a[3]::numeric quantity,
         a[4]::numeric unit_price,a[5]::integer tax_rate,
         (a[3]::numeric*a[4]::numeric)::numeric(12,2) gross_amount
  FROM source
 )
 SELECT jsonb_agg(jsonb_build_object('article_number',article_number,'name',article_name,
   'quantity',quantity,'unit_price',unit_price,'tax_rate',tax_rate,
   'gross_amount',gross_amount,'source_page',CASE WHEN ord<=26 THEN 1 ELSE 2 END,
   'row_index',CASE WHEN ord<=26 THEN ord ELSE ord-26 END) ORDER BY ord),
   count(*),sum(gross_amount),sum(gross_amount) FILTER(WHERE tax_rate=10),
   sum(gross_amount) FILTER(WHERE tax_rate=20)
 INTO v_rows,v_count,v_gross,v_10,v_20 FROM parsed;
 IF v_count<>66 OR v_gross<>1581.10 OR v_10<>644.40 OR v_20<>936.70
 THEN RAISE EXCEPTION 'Z 1866 article totals mismatch'; END IF;
 INSERT INTO public.bonit_daily_closings
 (business_id,register_id,z_number,closing_date,gross_amount,net_amount,cash_amount,card_amount,receipt_count,raw_data)
 VALUES(d.business_id,'1','1866','2026-11-16',1581.10,1366.40,1125.10,456.00,70,
 jsonb_build_object('source_document_id',d.id,'source','original_three_page_photos_2026_11_17',
 'gross_10_percent',644.40,'net_10_percent',585.82,'vat_10_percent',58.58,
 'gross_20_percent',936.70,'net_20_percent',780.58,'vat_20_percent',156.12,
 'cash_receipts',53,'card_receipts',16,'staff_invitation_receipts',1,
 'article_import_status','complete_verified_original_photos','no_stock_posted',true));
 INSERT INTO public.bonit_article_sales
 (business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount,raw_data)
 SELECT d.business_id,'upload:'||d.business_id||':1866:'||ord,'2026-11-16','1866',
 x->>'article_number',x->>'name',(x->>'quantity')::numeric,(x->>'gross_amount')::numeric,
 x||jsonb_build_object('verified',true,'source','original_three_page_photos','document_id',d.id)
 FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(x,ord);
 UPDATE public.documents SET status='auto_imported',document_type='cash_report',document_date='2026-11-16',
 extracted_data=d.extracted_data || jsonb_build_object('original_auto_read_before_reconciliation',d.extracted_data,
 'original_files',jsonb_build_array(d.storage_path,'6a5484d1-daf6-4263-897d-24cdf536aa29/4aafabbf-3999-4528-a51d-4b142b37101d.jpg','6a5484d1-daf6-4263-897d-24cdf536aa29/5c10acba-2320-4697-a47b-39fe22ba0afc.jpg'),
 'date','2026-11-16','z_number','1866','gross_total',1581.10,'net_total',1366.40,'vat_total',214.70,
 'cash_total',1125.10,'card_total',456.00,'receipt_count',70,'paid_receipt_count',69,
 'free_receipt_count',1,'cash_count',53,'card_count',16,'free_count',1,'sales_items',v_rows,
 'tax_breakdown',jsonb_build_array(jsonb_build_object('rate',10,'gross',644.40,'net',585.82,'vat',58.58),
 jsonb_build_object('rate',20,'gross',936.70,'net',780.58,'vat',156.12)),
 'payment_methods',jsonb_build_object('cash',jsonb_build_object('count',53,'amount',1125.10),
 'card',jsonb_build_object('count',16,'amount',456.00)),
 'printed_payment_lines',jsonb_build_array(jsonb_build_object('label','BAR Rechnung','count',53,'amount',1125.10),
 jsonb_build_object('label','Kreditkarte','count',16,'amount',456.00),
 jsonb_build_object('label','Personal / Einladung mit 0','count',1,'amount',0)),
 'tax_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck'),
 'article_sales_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck',
 'pages_total',3,'source_original_files',jsonb_build_array(d.storage_path,'6a5484d1-daf6-4263-897d-24cdf536aa29/4aafabbf-3999-4528-a51d-4b142b37101d.jpg','6a5484d1-daf6-4263-897d-24cdf536aa29/5c10acba-2320-4697-a47b-39fe22ba0afc.jpg')),
 'receipt_count_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck'),
 'needs_review',false,'notes','Z 1866: 66 Artikelzeilen und Summen aus drei Originalfotos centgenau abgeglichen')
 WHERE id=d.id AND business_id=d.business_id;
 UPDATE public.documents SET document_type='other',document_date='2026-11-16',status='reviewed',
 extracted_data=extracted_data||jsonb_build_object('duplicate_of',d.id,'role','additional_page_of_bonit_daily_closing','business_date','2026-11-16')
 WHERE id IN ('92267089-42b9-4e44-a193-dc4853191ff8','902dc3d0-3282-4e04-8439-978601ed6ef4') AND business_id=d.business_id AND status='reviewed';
END $reconcile$;
-- Verify afterwards: exactly one closing and 66 article rows; both tax groups match the original.
