-- Review-only SQL; do not deploy until membership helper privileges and real-account tests pass.
-- Read-only dashboard access; all client writes remain denied.
begin;
create policy social_channels_member_read on public.social_channels for select to authenticated using (private.is_business_member(business_id));
create policy social_posts_member_read on public.social_posts for select to authenticated using (private.is_business_member(business_id));
create policy social_deliveries_member_read on public.social_deliveries for select to authenticated using (private.is_business_member(business_id));
grant select (id,business_id,platform,display_name,status) on public.social_channels to authenticated;
grant select (id,business_id,body,status,scheduled_at) on public.social_posts to authenticated;
grant select (business_id,state) on public.social_deliveries to authenticated;
commit;
