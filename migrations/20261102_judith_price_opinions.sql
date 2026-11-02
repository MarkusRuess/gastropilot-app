-- Staff access is exclusively via authenticated, Judith-authorized Edge Function.
create table public.judith_ai_price_opinions (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) check (business_id='87889eaf-f865-4e3a-8f9a-cd01db483e0e'::uuid),
 source_key text not null check (length(source_key)<=100),
 inquiry_id uuid references public.judith_ai_inquiries(id),
 user_id uuid not null references auth.users(id),
 amount_gross numeric not null check (amount_gross>0 and amount_gross<=1000000),
 note text not null default '' check (length(note)<=1000),
 created_at timestamptz not null default now()
);
alter table public.judith_ai_price_opinions enable row level security;
revoke all on public.judith_ai_price_opinions from public,anon,authenticated;
grant select,insert on public.judith_ai_price_opinions to service_role;
create index judith_ai_price_opinions_source on public.judith_ai_price_opinions(business_id,source_key,created_at desc);
