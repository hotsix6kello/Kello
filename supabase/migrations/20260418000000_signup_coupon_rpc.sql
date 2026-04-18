-- ============================================================
-- Migration: issue_signup_coupon RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_signup_coupon(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 중복 방지: 이미 signup 쿠폰이 있으면 반환
  IF EXISTS (
    SELECT 1 FROM public.coupons
    WHERE user_id = p_user_id
      AND issue_reason = 'signup'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_issued');
  END IF;

  -- 회원가입 쿠폰 발급
  INSERT INTO public.coupons (user_id, discount_type, discount_value, issue_reason, is_used)
  VALUES (p_user_id, 'percent', 5, 'signup', false);

  RETURN json_build_object('success', true, 'error', null);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_signup_coupon(UUID) TO authenticated, anon;
