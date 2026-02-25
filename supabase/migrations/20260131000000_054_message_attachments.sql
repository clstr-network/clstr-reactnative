-- ============================================================================
-- 054_message_attachments.sql - Phase 16.3: Image/File Sharing in Chat
-- Adds attachment support to messages + storage bucket for chat media
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD ATTACHMENT COLUMNS TO MESSAGES TABLE
-- ============================================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

COMMENT ON COLUMN public.messages.attachment_url IS 'Public URL of attached file (image/document)';
COMMENT ON COLUMN public.messages.attachment_type IS 'MIME type of the attachment (e.g. image/jpeg, application/pdf)';
COMMENT ON COLUMN public.messages.attachment_name IS 'Original file name of the attachment';

-- ============================================================================
-- CREATE STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES FOR MESSAGE ATTACHMENTS
-- ============================================================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access for message attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'message-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own message attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
