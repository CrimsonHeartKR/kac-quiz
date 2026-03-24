-- 문항 유형 확장: OX퀴즈, 이미지 보기 지원
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

-- 1. questions 테이블에 question_type 컬럼 추가
-- 'text' = 기본 4지선다 (텍스트), 'ox' = OX퀴즈, 'image' = 이미지 보기 4지선다
ALTER TABLE questions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'text';

-- 2. questions 테이블에 option_images 컬럼 추가 (이미지 보기용 URL 배열)
ALTER TABLE questions ADD COLUMN option_images JSONB DEFAULT '[]';
