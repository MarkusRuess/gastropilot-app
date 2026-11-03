ALTER TABLE public.judith_ai_inquiries ADD COLUMN fulfillment_status text CHECK (fulfillment_status IN ('in_progress','ready'));
COMMENT ON COLUMN public.judith_ai_inquiries.fulfillment_status IS 'Judith AI production stage. NULL = ordered. Existing status remains confirmed until explicit pickup; no automatic pickup.';
