-- Entwurf: vor Ausführung bestehenden Auth-/Membership-Pfad und Policies prüfen.
-- Kein produktiver Datenbankeingriff durch diese Datei.
create table if not exists public.social_channels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  platform text not null check (platform in ('facebook','instagram','tiktok','pinterest','linkedin','google_business','youtube','whatsapp')),
  external_account_id text not null,
  display_name text,
  status text not null default 'pending' check (status in ('pending','connected','revoked','error')),
  created_at timestamptz not null default now(),
  unique (business_id,platform,external_account_id),
  unique (business_id,id)
);
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  body text not null,
  original_media_url text,
  media_verified boolean not null default false,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','scheduled','publishing','published','failed')),
  scheduled_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  unique (business_id,id),
  check (status not in ('approved','scheduled','publishing','published') or approved_by is not null)
);
create table if not exists public.social_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  post_id uuid not null,
  channel_id uuid not null,
  idempotency_key text not null,
  provider_post_id text,
  state text not null default 'queued' check (state in ('queued','in_progress','published','failed','unknown')),
  error_code text,
  created_at timestamptz not null default now(),
  unique (business_id,channel_id,idempotency_key),
  unique (business_id,post_id,channel_id),
  foreign key (business_id,post_id) references public.social_posts(business_id,id),
  foreign key (business_id,channel_id) references public.social_channels(business_id,id)
);
-- Defense in depth: no direct client access until verified policies are deployed.
alter table public.social_channels enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_deliveries enable row level security;
revoke all on public.social_channels,public.social_posts,public.social_deliveries from anon,authenticated;
-- Server must validate business membership and cross-table business_id consistency.
