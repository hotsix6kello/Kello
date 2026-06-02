-- Add payment-related columns to beauty_booking_requests for future PayPal integration.
-- All columns are nullable so existing rows and insert flows are unaffected.
-- payment_status defaults to NULL (not 'unpaid') because PayPal payment is not yet
-- part of the booking creation flow; NULL clearly signals "payment step not reached yet".

ALTER TABLE beauty_booking_requests
  ADD COLUMN IF NOT EXISTS payment_status         text,
  ADD COLUMN IF NOT EXISTS payment_method         text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS paypal_order_id        text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id      text,
  ADD COLUMN IF NOT EXISTS paid_at                timestamptz;

COMMENT ON COLUMN beauty_booking_requests.payment_status         IS 'NULL = 결제 단계 미도달, unpaid = 결제 대기, paid = 결제 완료';
COMMENT ON COLUMN beauty_booking_requests.payment_method         IS '결제 수단 (예: paypal)';
COMMENT ON COLUMN beauty_booking_requests.payment_transaction_id IS '외부 결제 트랜잭션 ID';
COMMENT ON COLUMN beauty_booking_requests.paypal_order_id        IS 'PayPal Order ID (create order 응답)';
COMMENT ON COLUMN beauty_booking_requests.paypal_capture_id      IS 'PayPal Capture ID (capture order 응답)';
COMMENT ON COLUMN beauty_booking_requests.paid_at                IS '결제 완료 시각';
