-- ============================================================
-- partners 테이블에 노출 여부(visibility_status) 컬럼 추가
-- ============================================================

-- 1. 컬럼 추가: 기본값 false(비노출), null 비허용
ALTER TABLE public.partners 
  ADD COLUMN IF NOT EXISTS visibility_status boolean NOT NULL DEFAULT false;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN public.partners.visibility_status IS '매장 탐색 화면 노출 여부 (false: 비노출, true: 노출)';
