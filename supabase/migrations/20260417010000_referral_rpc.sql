-- ============================================================
-- Migration: apply_referral_code RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referrer_code TEXT,
  p_referred_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- 검증 1: referrer_code로 profiles 조회
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referrer_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- 검증 2: 본인 코드 입력 방지
  IF v_referrer_id = p_referred_id THEN
    RETURN json_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- 검증 3: 이미 추천받은 유저인지 확인
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  -- referrals INSERT
  INSERT INTO public.referrals (referrer_id, referred_id)
  VALUES (v_referrer_id, p_referred_id);

  -- coupons INSERT — 추천인
  INSERT INTO public.coupons (user_id, discount_type, discount_value, issue_reason)
  VALUES (v_referrer_id, 'percent', 5, 'referrer');

  -- coupons INSERT — 피추천인
  INSERT INTO public.coupons (user_id, discount_type, discount_value, issue_reason)
  VALUES (p_referred_id, 'percent', 5, 'referred');

  RETURN json_build_object('success', true, 'error', null);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT, UUID) TO authenticated;
