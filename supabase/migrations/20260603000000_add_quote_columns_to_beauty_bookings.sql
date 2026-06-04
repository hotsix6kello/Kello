-- Add booking quote columns to beauty_booking_requests.
-- All columns are nullable so existing rows and insert flows are unaffected.
-- quote_date mirrors booking_date (DATE), quote_time mirrors booking_time (TEXT),
-- quote_total_price mirrors total_price (INTEGER).
-- quote_status is constrained to: pending, accepted, rejected, expired.

ALTER TABLE beauty_booking_requests
  ADD COLUMN IF NOT EXISTS quote_shop_name    text,
  ADD COLUMN IF NOT EXISTS quote_shop_address text,
  ADD COLUMN IF NOT EXISTS quote_service_name text,
  ADD COLUMN IF NOT EXISTS quote_date         date,
  ADD COLUMN IF NOT EXISTS quote_time         text,
  ADD COLUMN IF NOT EXISTS quote_total_price  integer,
  ADD COLUMN IF NOT EXISTS quote_currency     text,
  ADD COLUMN IF NOT EXISTS quote_note         text,
  ADD COLUMN IF NOT EXISTS quote_refund_policy text,
  ADD COLUMN IF NOT EXISTS quote_expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS quote_status       text,
  ADD COLUMN IF NOT EXISTS quote_sent_at      timestamptz,
  ADD COLUMN IF NOT EXISTS quote_responded_at timestamptz;

ALTER TABLE beauty_booking_requests
  ADD CONSTRAINT IF NOT EXISTS beauty_booking_requests_quote_status_check
  CHECK (quote_status IS NULL OR quote_status IN ('pending', 'accepted', 'rejected', 'expired'));

COMMENT ON COLUMN beauty_booking_requests.quote_shop_name    IS '예약 제안서 - 확정 매장명';
COMMENT ON COLUMN beauty_booking_requests.quote_shop_address IS '예약 제안서 - 매장 주소';
COMMENT ON COLUMN beauty_booking_requests.quote_service_name IS '예약 제안서 - 확정 시술명';
COMMENT ON COLUMN beauty_booking_requests.quote_date         IS '예약 제안서 - 제안 날짜 (DATE, booking_date와 동일 타입)';
COMMENT ON COLUMN beauty_booking_requests.quote_time         IS '예약 제안서 - 제안 시간 (TEXT, booking_time과 동일 타입)';
COMMENT ON COLUMN beauty_booking_requests.quote_total_price  IS '예약 제안서 - 제안 금액 (INTEGER, total_price와 동일 타입)';
COMMENT ON COLUMN beauty_booking_requests.quote_currency     IS '예약 제안서 - 통화 코드 (예: KRW, USD)';
COMMENT ON COLUMN beauty_booking_requests.quote_note         IS '예약 제안서 - 운영자 안내 메모';
COMMENT ON COLUMN beauty_booking_requests.quote_refund_policy IS '예약 제안서 - 환불/취소 정책 텍스트 스냅샷';
COMMENT ON COLUMN beauty_booking_requests.quote_expires_at   IS '예약 제안서 - 제안 만료 시각';
COMMENT ON COLUMN beauty_booking_requests.quote_status       IS '예약 제안서 상태. NULL = 미발송, pending = 고객 확인 중, accepted = 수락, rejected = 거절, expired = 만료';
COMMENT ON COLUMN beauty_booking_requests.quote_sent_at      IS '예약 제안서 발송 시각';
COMMENT ON COLUMN beauty_booking_requests.quote_responded_at IS '고객이 제안서에 응답한 시각';
