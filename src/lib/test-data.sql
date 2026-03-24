-- 테스트용 퀴즈 데이터 INSERT
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- schema.sql을 먼저 실행한 후에 이 파일을 실행하세요.

-- 1. 퀴즈 세트 생성
INSERT INTO quiz_sets (id, title, theme_config)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '테스트 퀴즈',
  '{"name": "KAC 기본 테마", "primaryColor": "#1A3A6B", "accentColor": "#E8A020"}'
);

-- 2. 문항 3개 생성
-- 문항 1: 대한민국의 수도는?
INSERT INTO questions (quiz_set_id, order_num, question_text, options, correct_index, time_limit)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  1,
  '대한민국의 수도는?',
  '["서울", "부산", "대전", "인천"]',
  0,
  20
);

-- 문항 2: 1+1은?
INSERT INTO questions (quiz_set_id, order_num, question_text, options, correct_index, time_limit)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  2,
  '1+1은?',
  '["1", "2", "3", "4"]',
  1,
  15
);

-- 문항 3: KAC의 영문 약자 풀이는?
INSERT INTO questions (quiz_set_id, order_num, question_text, options, correct_index, time_limit)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  3,
  'KAC의 영문 약자 풀이는?',
  '["Korea Aviation Corporation", "Korea Airport Corporation", "Korea Air Cargo", "Korea Aerospace Center"]',
  1,
  20
);
