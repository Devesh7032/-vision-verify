
-- Public read for profile-images
DROP POLICY IF EXISTS "Public read profile-images" ON storage.objects;
CREATE POLICY "Public read profile-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users upload own profile-images" ON storage.objects;
CREATE POLICY "Users upload own profile-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own profile-images" ON storage.objects;
CREATE POLICY "Users update own profile-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own profile-images" ON storage.objects;
CREATE POLICY "Users delete own profile-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read for product-images
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users upload own product-images" ON storage.objects;
CREATE POLICY "Users upload own product-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own product-images" ON storage.objects;
CREATE POLICY "Users update own product-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own product-images" ON storage.objects;
CREATE POLICY "Users delete own product-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Private analysis-images (own folder only)
DROP POLICY IF EXISTS "Users read own analysis-images" ON storage.objects;
CREATE POLICY "Users read own analysis-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'analysis-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own analysis-images" ON storage.objects;
CREATE POLICY "Users upload own analysis-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'analysis-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own analysis-images" ON storage.objects;
CREATE POLICY "Users update own analysis-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'analysis-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own analysis-images" ON storage.objects;
CREATE POLICY "Users delete own analysis-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'analysis-images' AND (storage.foldername(name))[1] = auth.uid()::text);
