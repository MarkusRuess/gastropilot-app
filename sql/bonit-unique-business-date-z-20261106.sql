-- Applied 2026-11-06 to the existing GastroPilot Supabase project.
-- Exact business, date and printed Z identity; old ARCHIVE identifiers retain
-- their existing unique register key until verified from original reports.
create unique index if not exists gp_bonit_business_date_z_unique
  on public.bonit_daily_closings (business_id, closing_date, z_number)
  where z_number ~ '^[0-9]{3,8}$';
