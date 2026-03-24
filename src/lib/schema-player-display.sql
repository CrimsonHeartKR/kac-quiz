-- 퀴즈세트별 참가자 화면 커스터마이징 필드 추가
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

-- 참가자 플레이 화면 배경 이미지
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS player_bg_image TEXT DEFAULT NULL;

-- 문항 텍스트 색상 (퀴즈 단위)
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS question_text_color TEXT DEFAULT '#FFFFFF';
