ALTER TABLE public.judith_ai_inquiries ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX judith_ai_inquiries_active_id_idx ON public.judith_ai_inquiries(id) WHERE archived_at IS NULL;
COMMENT ON COLUMN public.judith_ai_inquiries.archived_at IS 'Explicit owner soft archive. Does not delete or alter order, customer, payment or invoice data.';
