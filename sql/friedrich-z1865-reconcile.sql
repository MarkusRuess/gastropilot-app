-- Friedrich BONit Z 1865: only after visual comparison of the three originals.
-- The archive originals are retained; this block refuses any pre-existing closing or article rows.
-- Business date 2026-11-14; upload 2026-11-15. 84 lines: 26 + 58 + 0.
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
 WHERE id='cddb232a-e435-4b15-83cb-d9c724f97f73'
 AND business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 AND document_type='cash_report' AND document_date='2026-11-14'
 AND status='auto_review' FOR UPDATE;
 IF NOT FOUND OR (d.extracted_data->>'gross_total')::numeric<>3286.50
    OR d.extracted_data->>'z_number' IS NOT NULL
    OR jsonb_array_length(d.extracted_data->'original_files')<>3
 THEN RAISE EXCEPTION 'Z 1865 archive precondition failed'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('f-bonit:'||d.business_id||':'||d.document_date,0));
 IF EXISTS(SELECT 1 FROM public.bonit_daily_closings
   WHERE business_id=d.business_id AND (closing_date=d.document_date OR z_number='1865'))
 OR EXISTS(SELECT 1 FROM public.bonit_article_sales
   WHERE business_id=d.business_id AND (closing_date=d.document_date OR z_number='1865'))
 THEN RAISE EXCEPTION 'Z 1865 already booked; originals unchanged'; END IF;
 WITH source AS (
  SELECT string_to_array(line,'|') a, ord FROM regexp_split_to_table(trim(both E'\n' from $rows$
109|Punschkrapferl|4|5.20|10
111|Linzerauge 1Stück|3|3.50|10
113|Esterhazy Schnitte|4|5.80|10
114|Kardinalschnitte|6|5.80|10
117|Cheese Cake San Sebastian|6|4.80|10
129|Preiselbeerschnitte 1Stück|4|4.50|10
130|Maroniherz 1 Stück|19|4.80|10
130|Maroniherz 1 Stück|1|0|10
133|Prinzess Torte 1Stück|5|6.50|10
181|Gugelhupf GLUTENFREI 1 Stück|1|15.50|10
189|Mozart Torte 1Stück|4|6.50|10
204|Ei Aufstrich Brötchen|14|3.20|10
207|Räucherforelle Brötchen|9|3.20|10
212|Thunfisch Brötchen|10|3.20|10
215|Schinken Baguette 1Stück|12|5.20|10
216|Sacherwürstel 1 Paar|4|6.90|10
275|Friedrich Box 10 Brötchen|12|29.90|10
277|Prosciutto Teller|3|16.50|10
291|Käsefeuferl 1 Paar|1|6.90|10
292|Lachs Baguette 1Stück|20|5.20|10
307|Leberkäse Semmerl 1 Stück|5|4.90|10
309|Toast Schinken Käse|3|6.50|10
310|Bauerntoast Schwarzbrot XXL|2|12.50|10
313|Leber Pastete Brötchen|7|3.20|10
318|Roast Beef Baguette 1Stück|15|5.20|10
319|Roast Beef Teller|2|16.50|10
325|Mini Kokoskuppel 1Stück|151|2|10
326|Mango Torte 1Stück|3|6.50|10
1400|Espresso klein|36|3.10|20
1401|Espresso groß|9|4.20|20
1402|Espresso Macchiato|1|3.10|20
1403|Verlängerter|2|0|20
1403|Verlängerter|10|3.90|20
1404|Melange|13|3.90|20
1405|Tee|6|4.80|20
1406|Kaffee Laté|2|4.80|20
1407|Chai Latte|1|5.50|20
1409|Heisse Schokolade|1|5.50|20
1410|Cappucino|31|3.90|20
1412|Portion Hafermilch|4|1|20
1413|Cafe Latte|3|5.10|20
1500|Coca Cola 0,33l|2|4.20|20
1501|Coca Cola Zero 0,33l|6|4.20|20
1502|Vöslauer Prickelnd 0,33l|7|3.80|20
1504|Red Bull 0,25l|1|5.50|20
1513|Sodawasser 1/2l|2|3|20
1519|Crodino|4|6.90|20
1521|Orangensaft 0,25l|1|4.50|20
1522|Soda Zitron 1/4|3|4.20|20
1524|Soda Zitrone 0,5l|2|5.50|20
1527|Hollunder Limo 0,25l|2|4.50|20
1529|Apfelsaft gespritzt 0,25l|2|4.20|20
1531|Eistee Waterlemon Mint|1|4.90|20
1532|Verjus Gespritzt 0,25l|2|4.80|20
1533|Eistee Wild Peach 0,25l|2|4.90|20
1612|Auersthaler Marillen Brand 0,2cl|2|3.80|20
1613|Auersthaler Williams Birne Brand 2cl|2|4.50|20
2000|Villacher 0,3l Bier|39|4.80|20
2001|Campari Spritz|3|6.90|20
2002|Stiegl Goldbräu 0,33l|3|3.80|20
2004|Gösser Radler Zitrone|2|4.80|20
3001|Weingut Christian Steiner Rose 0,75l|2|35|20
3005|Gross Gelber Muskateller 0,75l|1|45|20
3010|1/8 Aumann Harterberg Reserve 2021|1|9|20
3011|1/8 Weingut Christian Steiner Rose|14|5.80|20
3012|1/8 IBY Blaufränkisch BIO Wein|4|6|20
3015|1/8 Gross Gelber Muskateller|2|7.50|20
3016|1/8 Mayer Wien Gemischter Satz|10|5.90|20
3017|1/8 Chardonnay Gisperg|2|5.90|20
3018|Weisser Spritzer Grüner Veltliner 0,25l|18|4.50|20
3020|1 Glas ProseccoValdobbiadene 0,1l|17|5.50|20
3022|1 Glas Sparkling Rose Freixenet Italien 0,1l|27|5.80|20
3039|Torten und diverse Artikel|1|2|10
3039|Torten und diverse Artikel|3|6.50|10
3042|Aperol Spritzer|8|6.90|20
3044|Tschermonegg 1/8 Sauvignon blanc|1|5.90|20
3050|1/8 Pfaffl Grüner Veltliner|9|5.90|20
3056|Hauswein Grüner Veltliner 1/8|7|4.50|20
3057|Sommerspritzer / Eis / Zitrone Glas 0,25l|1|4.80|20
4012|Muskateller Spritzer 0,25l|1|4.50|20
4016|1/8 Alphart Neuburger Hausberg 2023|2|5.90|20
4024|Sarti Spritzer|7|6.90|20
5008|Tarte Citron|1|5.80|10
5012|Schokokuchen VEGAN|2|5.80|10
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
 IF v_count<>84 OR v_gross<>3286.50 OR v_10<>1578.90 OR v_20<>1707.60
 THEN RAISE EXCEPTION 'Z 1865 article totals mismatch'; END IF;
 INSERT INTO public.bonit_daily_closings
 (business_id,register_id,z_number,closing_date,gross_amount,net_amount,cash_amount,card_amount,receipt_count,raw_data)
 VALUES(d.business_id,'1','1865',d.document_date,3286.50,2858.36,1845.40,1441.10,141,
 jsonb_build_object('source_document_id',d.id,'source','original_three_page_photos_2026_11_15',
 'gross_10_percent',1578.90,'net_10_percent',1435.36,'vat_10_percent',143.54,
 'gross_20_percent',1707.60,'net_20_percent',1423.00,'vat_20_percent',284.60,
 'cash_receipts',109,'card_receipts',31,'staff_invitation_receipts',1,
 'article_import_status','complete_verified_original_photos','no_stock_posted',true));
 INSERT INTO public.bonit_article_sales
 (business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount,raw_data)
 SELECT d.business_id,'upload:'||d.business_id||':1865:'||ord,d.document_date,'1865',
 x->>'article_number',x->>'name',(x->>'quantity')::numeric,(x->>'gross_amount')::numeric,
 x||jsonb_build_object('verified',true,'source','original_three_page_photos','document_id',d.id)
 FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(x,ord);
 UPDATE public.documents SET status='auto_imported',
 extracted_data=d.extracted_data || jsonb_build_object('original_auto_read_before_reconciliation',d.extracted_data,
 'date','2026-11-14','z_number','1865','gross_total',3286.50,'net_total',2858.36,'vat_total',428.14,
 'cash_total',1845.40,'card_total',1441.10,'receipt_count',141,'paid_receipt_count',140,
 'free_receipt_count',1,'cash_count',109,'card_count',31,'free_count',1,'sales_items',v_rows,
 'tax_breakdown',jsonb_build_array(jsonb_build_object('rate',10,'gross',1578.90,'net',1435.36,'vat',143.54),
 jsonb_build_object('rate',20,'gross',1707.60,'net',1423.00,'vat',284.60)),
 'payment_methods',jsonb_build_object('cash',jsonb_build_object('count',109,'amount',1845.40),
 'card',jsonb_build_object('count',31,'amount',1441.10)),
 'printed_payment_lines',jsonb_build_array(jsonb_build_object('label','BAR Rechnung','count',109,'amount',1845.40),
 jsonb_build_object('label','Kreditkarte','count',31,'amount',1441.10),
 jsonb_build_object('label','Personal / Einladung mit 0','count',1,'amount',0)),
 'tax_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck'),
 'article_sales_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck',
 'pages_total',3,'source_original_files',d.extracted_data->'original_files'),
 'receipt_count_verification',jsonb_build_object('version',2,'verified',true,'method','manual_original_three_page_crosscheck'),
 'needs_review',false,'notes','Z 1865: 84 Artikelzeilen und Summen aus drei Originalfotos centgenau abgeglichen')
 WHERE id=d.id AND business_id=d.business_id;
END $reconcile$;
-- Verify afterwards: exactly one closing and 84 article rows; both tax groups match the original.
