-- KAC Quiz Service Database Schema
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

-- 1. quiz_sets: 퀴즈 세트
CREATE TABLE quiz_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. questions: 문항
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_set_id UUID NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  slide_image_url TEXT,
  question_text TEXT DEFAULT '',
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL,
  time_limit INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. sessions: 퀴즈 세션
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_set_id UUID NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  pin TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL DEFAULT 'lobby',
  current_question INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  question_started_at TIMESTAMPTZ
);

-- 4. participants: 참가자
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_name TEXT DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_questions_quiz_set ON questions(quiz_set_id, order_num);
CREATE INDEX idx_sessions_pin ON sessions(pin);
CREATE INDEX idx_sessions_phase ON sessions(phase);
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_score ON participants(session_id, score DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- RLS 정책: anon 사용자도 읽기/쓰기 가능 (퀴즈 참가를 위해)
CREATE POLICY "quiz_sets_read" ON quiz_sets FOR SELECT USING (true);
CREATE POLICY "quiz_sets_all" ON quiz_sets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "questions_read" ON questions FOR SELECT USING (true);
CREATE POLICY "questions_all" ON questions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "sessions_read" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_all" ON sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "participants_read" ON participants FOR SELECT USING (true);
CREATE POLICY "participants_all" ON participants FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
