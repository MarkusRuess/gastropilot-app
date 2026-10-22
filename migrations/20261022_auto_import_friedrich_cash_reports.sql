create or replace function private.sync_friedrich_cash_report_to_bonit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_data jsonb := new.extracted_data;
  v_date date;
  v_gross numeric;
  v_net numeric;
  v_vat numeric;
  v_cash numeric;
  v_card numeric;
  v_other numeric;
  v_receipts integer;
  v_existing public.bonit_daily_closings%rowtype;
  v_item jsonb;
  v_item_name text;
  v_qty numeric;
  v_item_gross numeric;
  v_item_index bigint;
  v_has_same_day boolean := false;
begin
  if new.business_id <> '6a5484d1-daf6-4263-897d-24cdf536aa29'::uuid
     or new.document_type <> 'cash_report'
     or new.status not in ('auto_imported', 'reviewed') then
    return new;
  end if;

  if auth.uid() is null or not exists (
    select 1 from public.business_members m
    where m.business_id = new.business_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ) then
    return new;
  end if;

  if coalesce((v_data->>'needs_review')::boolean, true) is true
     or coalesce((v_data #>> '{tax_verification,verified}')::boolean, false) is not true
     or coalesce(v_data->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
     or new.document_date is null
     or (v_data->>'date')::date <> new.document_date
     or coalesce(v_data->>'gross_total', '') !~ '^\d+(\.\d{1,2})?$'
     or coalesce(v_data->>'net_total', '') !~ '^\d+(\.\d{1,2})?$'
     or coalesce(v_data->>'vat_total', '') !~ '^\d+(\.\d{1,2})?$'
     or coalesce(v_data->>'cash_total', '') !~ '^\d+(\.\d{1,2})?$'
     or coalesce(v_data->>'card_total', '') !~ '^\d+(\.\d{1,2})?$'
     or coalesce(v_data->>'receipt_count', '') !~ '^\d+$'
     or jsonb_typeof(v_data->'sales_items') <> 'array' then
    update public.documents
       set status = 'auto_review',
           extracted_data = v_data || jsonb_build_object(
             'revenue_import_status', 'needs_review',
             'revenue_import_warning', 'Tagesabschlussdaten sind unvollständig oder nicht vollständig geprüft.'
           )
     where id = new.id and business_id = new.business_id;
    return new;
  end if;

  v_date := (v_data->>'date')::date;
  v_gross := (v_data->>'gross_total')::numeric;
  v_net := (v_data->>'net_total')::numeric;
  v_vat := (v_data->>'vat_total')::numeric;
  v_cash := (v_data->>'cash_total')::numeric;
  v_card := (v_data->>'card_total')::numeric;
  v_other := case
    when coalesce(v_data->>'other_payments_total', '') ~ '^\d+(\.\d{1,2})?$'
      then (v_data->>'other_payments_total')::numeric
    else 0
  end;
  v_receipts := (v_data->>'receipt_count')::integer;

  if v_gross <= 0
     or abs(v_net + v_vat - v_gross) > 0.02
     or abs(v_cash + v_card + v_other - v_gross) > 0.02 then
    update public.documents
       set status = 'auto_review',
           extracted_data = v_data || jsonb_build_object(
             'revenue_import_status', 'needs_review',
             'revenue_import_warning', 'Umsatz-, Steuer- oder Zahlungsbeträge stimmen nicht überein.'
           )
     where id = new.id and business_id = new.business_id;
    return new;
  end if;

  for v_item, v_item_index in
    select e.value, e.ordinality
      from jsonb_array_elements(v_data->'sales_items') with ordinality as e(value, ordinality)
  loop
    v_item_name := nullif(btrim(v_item->>'name'), '');
    if v_item_name is null
       or coalesce(v_item->>'quantity', '') !~ '^\d+(\.\d{1,3})?$'
       or (coalesce(v_item->>'gross_amount', '') <> ''
           and (v_item->>'gross_amount') !~ '^\d+(\.\d{1,2})?$') then
      update public.documents
         set status = 'auto_review',
             extracted_data = v_data || jsonb_build_object(
               'revenue_import_status', 'needs_review',
               'revenue_import_warning', 'Mindestens eine Artikelposition ist unvollständig.'
             )
       where id = new.id and business_id = new.business_id;
      return new;
    end if;
  end loop;

  select c.* into v_existing
    from public.bonit_daily_closings c
   where c.business_id = new.business_id
     and c.closing_date = v_date
   order by c.imported_at asc
   limit 1
   for update;

  v_has_same_day := found;
  if v_has_same_day and abs(v_existing.gross_amount - v_gross) > 0.01 then
    update public.documents
       set status = 'auto_review',
           extracted_data = v_data || jsonb_build_object(
             'revenue_import_status', 'conflict',
             'revenue_import_warning', 'Für dieses Datum ist bereits ein anderer BONit-Umsatz gespeichert; keine Doppelbuchung wurde angelegt.'
           )
     where id = new.id and business_id = new.business_id;
    return new;
  end if;

  if v_has_same_day then
    update public.bonit_daily_closings
       set raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(
         'archive_document_id', new.id,
         'archive_extracted_data', v_data
       )
     where id = v_existing.id;
  else
    insert into public.bonit_daily_closings (
      business_id, register_id, z_number, closing_date,
      gross_amount, net_amount, cash_amount, card_amount, receipt_count, raw_data
    ) values (
      new.business_id, 'bonit', 'ARCHIVE-' || new.id::text, v_date,
      v_gross, v_net, v_cash, v_card, v_receipts,
      jsonb_build_object(
        'source', 'reviewed_cash_report',
        'document_id', new.id,
        'extracted_data', v_data
      )
    )
    on conflict (business_id, register_id, z_number) do update
      set gross_amount = excluded.gross_amount,
          net_amount = excluded.net_amount,
          cash_amount = excluded.cash_amount,
          card_amount = excluded.card_amount,
          receipt_count = excluded.receipt_count,
          raw_data = excluded.raw_data;
  end if;

  for v_item, v_item_index in
    select e.value, e.ordinality
      from jsonb_array_elements(v_data->'sales_items') with ordinality as e(value, ordinality)
  loop
    v_item_name := btrim(v_item->>'name');
    v_qty := (v_item->>'quantity')::numeric;
    v_item_gross := case
      when coalesce(v_item->>'gross_amount', '') ~ '^\d+(\.\d{1,2})?$'
        then (v_item->>'gross_amount')::numeric
      else null
    end;

    insert into public.bonit_article_sales (
      business_id, source_key, closing_date, z_number,
      article_number, article_name, quantity, gross_amount, raw_data
    ) values (
      new.business_id,
      'archive:' || new.id::text || ':' || v_item_index::text,
      v_date,
      null,
      nullif(v_item->>'article_number', ''),
      v_item_name,
      v_qty,
      v_item_gross,
      v_item
    )
    on conflict (business_id, source_key) do update
      set closing_date = excluded.closing_date,
          z_number = excluded.z_number,
          article_number = excluded.article_number,
          article_name = excluded.article_name,
          quantity = excluded.quantity,
          gross_amount = excluded.gross_amount,
          raw_data = excluded.raw_data;
  end loop;

  return new;
end;
$function$;

drop trigger if exists sync_friedrich_cash_report_to_bonit on public.documents;
create trigger sync_friedrich_cash_report_to_bonit
after insert or update of document_type, document_date, status, extracted_data, business_id
on public.documents
for each row execute function private.sync_friedrich_cash_report_to_bonit();
