-- ============================================================================
-- 034_posts_documents.sql - Add documents support to posts
-- U-Hub Platform Database
-- ============================================================================

BEGIN;

-- Add documents column to posts table for storing document URLs
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS documents text[] DEFAULT '{}';

-- Add document types to post-media bucket if not already present
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp', 
  'video/mp4', 
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]
WHERE id = 'post-media';

COMMIT;
