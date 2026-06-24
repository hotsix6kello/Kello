-- Add coupon usage columns to beauty_booking_requests.
-- coupon_id: 사용된 쿠폰 ID (NULL = 쿠폰 미사용)
-- coupon_discount_amount: 쿠폰으로 할인된 금액 (USD)
-- paid_amount: 실제 PayPal 결제 금액 (견적 금액 - 쿠폰 할인)

ALTER TABLE beauty_booking_requests
  ADD COLUMN IF NOT EXISTS coupon_id               uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount  numeric(10, 2),
  ADD COLUMN IF NOT EXISTS paid_amount             numeric(10, 2);

COMMENT ON COLUMN beauty_booking_requests.coupon_id              IS '결제 시 사용된 쿠폰 ID (NULL = 쿠폰 미사용)';
COMMENT ON COLUMN beauty_booking_requests.coupon_discount_amount IS '쿠폰 할인 금액 (USD)';
COMMENT ON COLUMN beauty_booking_requests.paid_amount            IS '실제 PayPal 결제 금액 = 견적 금액 - 쿠폰 할인';
