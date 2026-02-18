-- ============================================================================
-- PROFILE PROJECTS IMAGE SUPPORT
-- Add image_url column and storage for project screenshots/previews
-- ============================================================================

BEGIN;

-- 1) Add image_url column to profile_projects table
ALTER TABLE public.profile_projects
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2) Add index for performance when filtering by image presence
CREATE INDEX IF NOT EXISTS profile_projects_has_image_idx
  ON public.profile_projects((image_url IS NOT NULL));

-- 3) Comment for documentation
COMMENT ON COLUMN public.profile_projects.image_url IS 
  'URL to project screenshot/preview image stored in project-images bucket';

COMMIT;

-- ============================================================================
-- STORAGE BUCKET SETUP (run separately via Supabase Dashboard or CLI)
-- ============================================================================
-- The bucket 'project-images' needs to be created with:
-- - Public: true (for public read access)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- Storage policy for authenticated uploads:
-- CREATE POLICY "Users can upload project images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'project-images');
--
-- CREATE POLICY "Users can update own project images"  
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own project images"
-- ON storage.objects FOR DELETE
-- TO authenticated  
-- USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Public read access for project images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'project-images');
-- ============================================================================
