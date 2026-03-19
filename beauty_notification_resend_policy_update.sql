-- Add resend policy tracking columns to beauty_booking_notifications
ALTER TABLE beauty_booking_notifications 
ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resent_by UUID;

-- Optional: Index on last_resent_at
CREATE INDEX IF NOT EXISTS idx_beauty_booking_notifications_last_resent ON beauty_booking_notifications(last_resent_at);
