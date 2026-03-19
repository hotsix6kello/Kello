-- Add dispatch tracking columns to beauty_booking_notifications
ALTER TABLE beauty_booking_notifications 
ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_log TEXT,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_beauty_booking_notifications_status ON beauty_booking_notifications(dispatch_status);
