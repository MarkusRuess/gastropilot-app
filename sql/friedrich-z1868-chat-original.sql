-- Z 1868: three ChatGPT Library originals, not uploaded to Pilot; no document row is invented.
-- Business day 2026-11-18, printed 22:18; 26 + 40 + 0 article rows.
DO $reconcile$
DECLARE v_rows jsonb; v_count int; v_gross numeric; v_10 numeric; v_20 numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('f-bonit:6a5484d1-daf6-4263-897d-24cdf536aa29:2026-11-18',0));
 IF EXISTS (SELECT 1 FROM public.bonit_daily_closings WHERE business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' AND (closing_date='2026-11-18' OR z_number='1868'))
 OR EXISTS (SELECT 1 FROM public.bonit_article_sales WHERE business_id='6a5484d1-daf6-4263-897d-24cdf536aa29' AND (closing_date='2026-11-18' OR z_number='1868'))
 THEN RAISE EXCEPTION 'Z 1868 already booked; no duplicate inserted'; END IF;
 WITH source AS (
  SELECT string_to_array(line,'|') a,ord FROM regexp_split_to_table(trim(both E'\n' from $rows$
111|Linzerauge 1Stück|4|3.50|10
113|Esterhazy Schnitte|1|5.80|10
114|Kardinalschnitte|3|5.80|10
117|Cheese Cake San Sebastian|1|4.80|10
124|Himbeer Macaren|1|0|10
129|Preiselbeerschnitte 1Stück|1|0|10
130|Maroniherz 1 Stück|6|4.80|10
189|Mozart Torte 1Stück|2|6.50|10
204|Ei Aufstrich Brötchen|11|3.20|10
207|Räucherforelle Brötchen|4|3.20|10
212|Thunfisch Brötchen|3|3.20|10
215|Schinken Baguette 1Stück|7|5.20|10
216|Sacherwürstel 1 Paar|6|6.90|10
275|Friedrich Box 10 Brötchen|10|29.90|10
277|Prosciutto Teller|1|16.50|10
279|Prosciutto Baguette Brötchen|4|5.20|10
291|Käsefeuferl 1 Paar|2|6.90|10
292|Lachs Baguette 1Stück|20|5.20|10
307|Leberkäse Semmerl 1 Stück|1|4.90|10
309|Toast Schinken Käse|6|6.50|10
310|Bauerntoast Schwarzbrot XXL|1|12.50|10
313|Leber Pastete Brötchen|5|3.20|10
315|Humus Tomate Pikant|1|2.80|10
320|Leberkäs Teller Mix|2|15.50|10
323|Guglhupf 1Stück|4|2|10
325|Mango Torte 1Stück|2|6.50|10
1400|Espresso klein|17|3.10|20
1401|Espresso groß|3|4.20|20
1403|Verlängerter|7|3.90|20
1403|Verlängerter|3|0|20
1404|Melange|6|3.90|20
1405|Tee|2|4.80|20
1406|Kaffee Laté|2|4.80|20
1410|Cappucino|5|3.90|20
1500|Coca Cola 0,33l|4|4.20|20
1501|Coca Cola Zero 0,33l|2|4.20|20
1502|Vöslauer Prickelnd 0,33l|7|3.80|20
1512|Sodawasser 0,25l|1|2.10|20
1515|Apfelsaft gespritzt 0,5l|1|5.50|20
1519|Crodino|2|6.90|20
1521|Orangensaft 0,25l|2|4.50|20
1522|Soda Zitron 1/4|3|4.20|20
1527|Hollunder Limo 0,25l|5|4.50|20
1529|Apfelsaft gespritzt 0,25l|2|4.20|20
1613|Auersthaler Williams Birne Brand 2cl|2|4.50|20
1616|Averna Sour 4cl|10|9.50|20
1617|Campari Orange 6cl|1|7.20|20
2000|Villacher 0,3l Bier|38|4.80|20
2001|Campari Spritz|5|6.90|20
2002|Stiegl Goldbräu 0,33l|1|3.80|20
3010|1/8 Aumann Harterberg Reserve 2021|2|9|20
3012|1/8 IBY Blaufränkisch BIO Wein|2|6|20
3018|Weisser Spritzer Grüner Veltliner 0,25l|6|4.50|20
3020|1 Glas ProseccoValdobbiadene 0,1l|17|5.50|20
3022|1 Glas Sparkling Rose Freixenet Italien 0,1l|18|5.80|20
3042|Aperol Spritzer|9|6.90|20
3044|Tschermonegg 1/8 Sauvignon blanc|1|5.90|20
3049|Pfaffl Grüner Veltliner 0,75l|3|38|20
3050|1/8 Pfaffl Grüner Veltliner|11|5.90|20
3056|Hauswein Grüner Veltliner 1/8|4|4.50|20
3057|Sommerspritzer / Eis / Zitrone Glas 0,25l|7|4.80|20
3091|1/8 Keringer Heideboden Cuvee|1|7|20
4016|1/8 Alphart Neuburger Hausberg 2023|1|5.90|20
4024|Sarti Spritzer|6|6.90|20
5008|Tarte Citron|3|5.80|10
5012|Schokokuchen VEGAN|2|5.80|10
$rows$), E'\n') WITH ORDINALITY AS t(line,ord)
 ), parsed AS (
  SELECT ord,a[1] article_number,a[2] article_name,a[3]::numeric quantity,a[4]::numeric unit_price,a[5]::integer tax_rate,(a[3]::numeric*a[4]::numeric)::numeric(12,2) gross_amount FROM source
 ) SELECT jsonb_agg(jsonb_build_object('article_number',article_number,'name',article_name,'quantity',quantity,'unit_price',unit_price,'tax_rate',tax_rate,'gross_amount',gross_amount,'source_page',CASE WHEN ord<=26 THEN 1 ELSE 2 END,'row_index',CASE WHEN ord<=26 THEN ord ELSE ord-26 END) ORDER BY ord),count(*),sum(gross_amount),sum(gross_amount) FILTER(WHERE tax_rate=10),sum(gross_amount) FILTER(WHERE tax_rate=20)
 INTO v_rows,v_count,v_gross,v_10,v_20 FROM parsed;
 IF v_count<>66 OR v_gross<>2049.50 OR v_10<>829.50 OR v_20<>1220.00 THEN RAISE EXCEPTION 'Z 1868 row/tax/gross reconciliation failed'; END IF;
 INSERT INTO public.bonit_daily_closings (business_id,register_id,z_number,closing_date,gross_amount,net_amount,cash_amount,card_amount,receipt_count,raw_data)
 VALUES ('6a5484d1-daf6-4263-897d-24cdf536aa29','1','1868','2026-11-18',2049.50,1770.76,1370.50,679.00,99,
 jsonb_build_object('source','chat_original_three_page_photos_2026_11_19','original_library_files',jsonb_build_array('libfile_8b34ce7d32688191b2c16c3b808838de','libfile_346153e25fb48191ab9417f663f9f9f8','libfile_4bcb0c3b33a881918bf62dd570521336'),
 'gross_10_percent',829.50,'net_10_percent',754.09,'vat_10_percent',75.41,'gross_20_percent',1220.00,'net_20_percent',1016.67,'vat_20_percent',203.33,'cash_receipts',79,'card_receipts',19,'staff_invitation_receipts',1,'returns_note','-6.00 EUR printed separately; already included in reconciled sales rows','article_import_status','complete_verified_original_photos','no_stock_posted',true));
 INSERT INTO public.bonit_article_sales (business_id,source_key,closing_date,z_number,article_number,article_name,quantity,gross_amount,raw_data)
 SELECT '6a5484d1-daf6-4263-897d-24cdf536aa29','chat:1868:'||ord,'2026-11-18','1868',x->>'article_number',x->>'name',(x->>'quantity')::numeric,(x->>'gross_amount')::numeric,
 x||jsonb_build_object('verified',true,'source','chat_original_three_page_photos','original_library_files',jsonb_build_array('libfile_8b34ce7d32688191b2c16c3b808838de','libfile_346153e25fb48191ab9417f663f9f9f8','libfile_4bcb0c3b33a881918bf62dd570521336'))
 FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(x,ord);
END $reconcile$;
