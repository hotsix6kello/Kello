-- ============================================================
-- Migration: Referral & Coupon System
-- ============================================================


-- ============================================================
-- 1. profiles 테이블 업데이트
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 6~8자리 랜덤 영숫자 코드 생성 (혼동 문자 0, O, 1, I 제외)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789456789';
  code   TEXT    := '';
  length INTEGER;
  i      INTEGER;
BEGIN
  length := 6 + floor(random() * 3)::INTEGER; -- 6, 7, 8 중 랜덤
  FOR i IN 1..length LOOP
    code := code || substr(chars, floor(random() * length(chars))::INTEGER + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- referral_code 자동 부여 트리거 함수 (UNIQUE 충돌 시 최대 10회 재시도)
CREATE OR REPLACE FUNCTION public.set_referral_code_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := public.generate_referral_code();
    -- 중복 여부를 사전 확인하여 재시도
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = new_code
    ) THEN
      NEW.referral_code := new_code;
      RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts >= 10 THEN
      RAISE EXCEPTION 'Failed to generate a unique referral_code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

-- BEFORE INSERT 트리거: referral_code가 NULL인 경우에만 실행
DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.set_referral_code_on_profile_insert();

-- 기존 레코드 소급 처리
UPDATE public.profiles
SET    referral_code = public.generate_referral_code()
WHERE  referral_code IS NULL;


-- ============================================================
-- 2. coupons 테이블 신규 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  discount_type  VARCHAR(20) NOT NULL
                               CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER     NOT NULL DEFAULT 5,
  issue_reason   VARCHAR(50)
                               CHECK (issue_reason IN ('signup', 'referred', 'referrer')),
  is_used        BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_own"
  ON public.coupons
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coupons_insert_service_role"
  ON public.coupons
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 3. referrals 테이블 신규 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID        NOT NULL
                            REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID        NOT NULL UNIQUE
                            REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_participants"
  ON public.referrals
  FOR SELECT
  USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
  );

CREATE POLICY "referrals_insert_service_role"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 4. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_coupons_user_id        ON public.coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_is_used         ON public.coupons(is_used);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id   ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code  ON public.profiles(referral_code);
