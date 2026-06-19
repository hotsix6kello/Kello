-- ai_answer_cache 테이블: Kello AI 답변 캐싱
CREATE TABLE IF NOT EXISTS ai_answer_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash text NOT NULL,
  question text NOT NULL,
  category text,
  language text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE ai_answer_cache ENABLE ROW LEVEL SECURITY;

-- 누구나 캐시를 읽을 수 있도록 허용
CREATE POLICY "Allow public read access to ai_answer_cache"
  ON ai_answer_cache FOR SELECT
  USING (true);

-- API 라우트/어드민 등에서 캐시 삽입/수정 허용
CREATE POLICY "Allow public insert and update to ai_answer_cache"
  ON ai_answer_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to ai_answer_cache"
  ON ai_answer_cache FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 인덱스 추가 (조회 최적화)
CREATE UNIQUE INDEX IF NOT EXISTS ai_answer_cache_hash_lang_idx ON ai_answer_cache(question_hash, language);
CREATE INDEX IF NOT EXISTS ai_answer_cache_category_idx ON ai_answer_cache(category);
