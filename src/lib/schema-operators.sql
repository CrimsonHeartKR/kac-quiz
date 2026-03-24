-- 운영자 계정 테이블 및 세션 로그 확장
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

-- 1. operators 테이블 (자체 인증)
CREATE TABLE operators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'host',  -- 'admin' 또는 'host'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2. sessions 테이블에 host_user_id 추가
ALTER TABLE sessions ADD COLUMN host_user_id UUID REFERENCES operators(id);

-- 3. 인덱스
CREATE INDEX idx_operators_email ON operators(email);
CREATE INDEX idx_sessions_host ON sessions(host_user_id);

-- 4. RLS
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operators_read" ON operators FOR SELECT USING (true);
CREATE POLICY "operators_all" ON operators FOR ALL USING (true) WITH CHECK (true);

-- 5. 기본 관리자 계정 생성 (비밀번호: admin1234)
-- 비밀번호는 SHA-256 해시로 저장 (클라이언트에서 동일하게 해시 후 비교)
INSERT INTO operators (email, password_hash, name, role)
VALUES (
  'admin@kac-quiz.com',
  'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270',
  '관리자',
  'admin'
);
