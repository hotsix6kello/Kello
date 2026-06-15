-- Kello (고객 앱) <-> Kello Partner 제휴 매장 연동: Phase 0
-- beauty_booking_requests에 예약 매장의 출처(store_source)를 기록한다.
-- 기존 예약은 모두 Google Places 매장이었으므로 기본값은 'google'.
-- store_id는 store_source='partner'일 때 Kello Partner의 stores.id(uuid)를 가리킨다.

ALTER TABLE beauty_booking_requests
  ADD COLUMN IF NOT EXISTS store_source text NOT NULL DEFAULT 'google';

ALTER TABLE beauty_booking_requests
  ADD CONSTRAINT IF NOT EXISTS beauty_booking_requests_store_source_check
  CHECK (store_source IN ('google', 'partner'));

COMMENT ON COLUMN beauty_booking_requests.store_source IS '예약 매장 출처: google = Google Places 매장, partner = Kello Partner 제휴 매장(stores.id 참조)';
