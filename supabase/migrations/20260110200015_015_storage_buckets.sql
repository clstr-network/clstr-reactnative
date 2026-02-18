-- ============================================================================
-- 015_storage_buckets.sql - Storage Buckets Configuration
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Post media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Event images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Club images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-images',
  'club-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Project images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verification documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Resume/CV bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Shared items images (EcoCampus)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-items',
  'shared-items',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES - AVATARS
-- ============================================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================================
-- STORAGE POLICIES - POST MEDIA
-- ============================================================================
DROP POLICY IF EXISTS "Post media is publicly accessible" ON storage.objects;
CREATE POLICY "Post media is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
CREATE POLICY "Users can upload post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their post media" ON storage.objects;
CREATE POLICY "Users can delete their post media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================================
-- STORAGE POLICIES - EVENT IMAGES
-- ============================================================================
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;
CREATE POLICY "Event images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event organizers can upload images" ON storage.objects;
CREATE POLICY "Event organizers can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-images' 
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- STORAGE POLICIES - CLUB IMAGES
-- ============================================================================
DROP POLICY IF EXISTS "Club images are publicly accessible" ON storage.objects;
CREATE POLICY "Club images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-images');

DROP POLICY IF EXISTS "Club admins can upload images" ON storage.objects;
CREATE POLICY "Club admins can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'club-images' 
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- STORAGE POLICIES - PROJECT IMAGES
-- ============================================================================
DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
CREATE POLICY "Project images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Project owners can upload images" ON storage.objects;
CREATE POLICY "Project owners can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' 
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- STORAGE POLICIES - VERIFICATION DOCS (Private)
-- ============================================================================
DROP POLICY IF EXISTS "Users can upload verification docs" ON storage.objects;
CREATE POLICY "Users can upload verification docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their verification docs" ON storage.objects;
CREATE POLICY "Users can view their verification docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================================
-- STORAGE POLICIES - RESUMES (Private)
-- ============================================================================
DROP POLICY IF EXISTS "Users can upload their resume" ON storage.objects;
CREATE POLICY "Users can upload their resume" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their resume" ON storage.objects;
CREATE POLICY "Users can view their resume" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their resume" ON storage.objects;
CREATE POLICY "Users can update their resume" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================================
-- STORAGE POLICIES - SHARED ITEMS
-- ============================================================================
DROP POLICY IF EXISTS "Shared item images are publicly accessible" ON storage.objects;
CREATE POLICY "Shared item images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'shared-items');

DROP POLICY IF EXISTS "Users can upload shared item images" ON storage.objects;
CREATE POLICY "Users can upload shared item images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shared-items' 
    AND auth.uid() IS NOT NULL
  );

COMMIT;
