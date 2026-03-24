-- Supabase Storage 버킷 및 정책 설정
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

-- 1. quiz-images 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true);

-- 2. 누구나 읽기 가능 (public)
CREATE POLICY "quiz_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-images');

-- 3. 인증된 사용자만 업로드 가능
CREATE POLICY "quiz_images_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');

-- 4. 인증된 사용자만 수정 가능
CREATE POLICY "quiz_images_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');

-- 5. 인증된 사용자만 삭제 가능
CREATE POLICY "quiz_images_auth_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');
