-- Keep the archive type check in sync with the monthly report scanner.
alter table public.documents drop constraint documents_document_type_check;
alter table public.documents add constraint documents_document_type_check
  check (document_type = any (array[
    'cash_report'::text,
    'monthly_report'::text,
    'invoice'::text,
    'payroll'::text,
    'other'::text
  ]));
