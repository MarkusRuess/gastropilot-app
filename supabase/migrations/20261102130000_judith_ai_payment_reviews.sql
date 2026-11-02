-- Judith AI only: shared invoice review status, no changes to financial ledger.
create table if not exists public.judith_ai_payment_reviews (
 transaction_id uuid primary key references public.bank_transactions(id) on delete restrict,
 reviewed boolean not null default false,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.judith_ai_payment_reviews enable row level security;
revoke all on public.judith_ai_payment_reviews from anon, authenticated;
-- Access is exclusively via JWT-authenticated Edge Function, with staff check and fixed Judith business_id.
