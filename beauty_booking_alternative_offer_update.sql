-- Add alternative offer fields to beauty_booking_requests
ALTER TABLE beauty_booking_requests 
ADD COLUMN IF NOT EXISTS alternative_offer_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS alternative_offer_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS alternative_offer_note TEXT,
ADD COLUMN IF NOT EXISTS alternative_offered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS alternative_offered_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS alternative_response_at TIMESTAMPTZ;

-- Add index for easier filtering (optional but good for dashboard if many offers)
CREATE INDEX IF NOT EXISTS idx_beauty_booking_alternative_status ON beauty_booking_requests(alternative_offer_status);
