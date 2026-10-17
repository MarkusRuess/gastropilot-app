# Data integration

Use existing Supabase tables; do not duplicate imported records.

Known record counts: bonit_article_sales 2703, bank_transactions 379, personnel_costs 78, documents 15, bonit_daily_closings 11.

Incomplete: financial_statements 0, bank_invoice_matches 0, bonit_import_batches 0.

All monetary values require reconciliation before they are presented as confirmed. Invoice records must only be persisted after an explicit Open or Paid decision. Paid invoices additionally require a payment method.

Development branch only. Do not deploy to production before tests and verification.
