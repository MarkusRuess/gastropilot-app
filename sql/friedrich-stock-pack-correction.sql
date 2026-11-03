-- Packaging correction only. Existing count events, items, receipts and quantities stay untouched.
-- Idempotent: only the inspected old inconsistent 0.75-l bottle profiles match.
update public.gp_f_stock_products p
set pack_size=0.75, legacy_factor=0.75, updated_at=now(),
 note=concat_ws(' · ',p.note,'2026-11-03: vorhandene 0,75-l-Flasche als Gebinde und Faktor für ursprünglichen Flaschenpreis berichtigt. Zählereignisse bereits in Litern unverändert.')
from public.gp_inventory_items i
where p.business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 and i.business_id=p.business_id and i.id=p.item_id and i.unit='Flasche'
 and p.base_unit='l' and p.pack_label='Flasche à 0,75 l'
 and p.pack_size=1 and p.legacy_factor=1;

-- Explicit operator specification: HOFER white house wine is a 1-litre bottle.
update public.gp_f_stock_products
set pack_size=1,pack_label='Flasche à 1 l',updated_at=now(),
 note=concat_ws(' · ',note,'2026-11-03: Hauswein Weißwein HOFER 1-l-Flasche laut ausdrücklichem Betreiberauftrag.')
where business_id='6a5484d1-daf6-4263-897d-24cdf536aa29'
 and item_id='829bea07-8d63-42ba-9c9c-be0503e166c7' and base_unit='l'
 and pack_size is null and pack_label is null;
