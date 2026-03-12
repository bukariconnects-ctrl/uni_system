CREATE POLICY "faculty_upload_materials" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_materials" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials');

CREATE POLICY "faculty_delete_materials" ON storage.objects FOR DELETE
  USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

CREATE POLICY "student_upload_submissions" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "auth_read_submissions" ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "auth_delete_submissions" ON storage.objects FOR DELETE
  USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "user_upload_avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "user_update_avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "user_delete_avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
