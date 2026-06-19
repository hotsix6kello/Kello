-- ai_questions 테이블: Kello AI 질문 저장
CREATE TABLE IF NOT EXISTS ai_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  category text,
  answer text,
  created_at timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE ai_questions ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 조회 가능
CREATE POLICY "Users can view own ai_questions"
  ON ai_questions FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 롤로 삽입 허용 (API route는 service role 사용)
CREATE POLICY "Service role can insert ai_questions"
  ON ai_questions FOR INSERT
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS ai_questions_user_id_idx ON ai_questions(user_id);
CREATE INDEX IF NOT EXISTS ai_questions_created_at_idx ON ai_questions(created_at DESC);
