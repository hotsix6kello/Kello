-- Precondition for Kello <-> Kello Partner store integration.
-- Kello Partner의 stores 테이블에 고객 앱(Kello) 노출 심사를 위한 컬럼을 추가한다.
-- 이미 적용되어 있다면(IF NOT EXISTS) 아무 변화도 일으키지 않는다.
-- stores 테이블 자체(소유권/RLS 등)는 Kello Partner 쪽에서 관리하므로 여기서는 건드리지 않는다.

ALTER TABLE IF EXISTS public.stores
  ADD COLUMN IF NOT EXISTS published      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_status  text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_reason  text,
  ADD COLUMN IF NOT EXISTS latitude       double precision,
  ADD COLUMN IF NOT EXISTS longitude      double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_review_status_check'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_review_status_check
      CHECK (review_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.stores.published     IS 'Kello(고객 앱) 노출 여부. true일 때만 고객 앱 검색/예약 후보가 됨';
COMMENT ON COLUMN public.stores.review_status IS 'Kello 운영팀의 매장 검수 상태: pending | approved | rejected';
COMMENT ON COLUMN public.stores.review_reason IS '검수 반려/보류 사유 (review_status가 rejected/pending일 때 참고)';
COMMENT ON COLUMN public.stores.latitude      IS 'Kello 탐색 지도 노출을 위한 위도';
COMMENT ON COLUMN public.stores.longitude     IS 'Kello 탐색 지도 노출을 위한 경도';

-- 고객 탐색(published=true AND review_status='approved')용 부분 인덱스
CREATE INDEX IF NOT EXISTS stores_public_visible_idx
  ON public.stores (review_status, published)
  WHERE published = true AND review_status = 'approved';
