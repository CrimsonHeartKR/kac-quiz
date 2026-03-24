-- 퀴즈세트별 입장화면 커스터마이징 필드 추가
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS join_bg_image TEXT DEFAULT NULL;
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS field1_label TEXT DEFAULT '이름';
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS field1_placeholder TEXT DEFAULT '이름을 입력하세요';
