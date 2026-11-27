# Deployment evidence – 2026-11-27
- Supabase migrations social_zentrale_locked_foundation and social_zentrale_member_read returned success.
- Three tables verified with RLS enabled; authenticated column-level read grants only; anon read and authenticated insert denied.
- All three SELECT policies use private.is_business_member(business_id).
- Transactional simulated unauthorized identity saw 0 test posts; existing authorized identity saw 2; rollback verified 0 remaining test posts.
- No separate real user login test. No provider publication. No live UI.
- Production schema includes publish_authorized boolean not null default false; original schema draft must be reconciled before reuse.
- Earlier JavaScript test claims lack captured execution output in this record; rerun in CI before relying on them.
- PR #237 remains draft. No merge or production UI activation.
