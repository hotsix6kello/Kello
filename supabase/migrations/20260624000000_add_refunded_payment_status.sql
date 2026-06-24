-- Add 'refunded' as a valid payment_status value.
-- The column is plain text so no enum change is needed;
-- this migration only updates the column comment to document the full set.

COMMENT ON COLUMN beauty_booking_requests.payment_status IS
  'NULL = 결제 단계 미도달, pending = 결제 진행 중, paid = 결제 완료, refunded = 환불 완료';
