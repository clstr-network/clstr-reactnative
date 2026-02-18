BEGIN;

-- Add resume storage and metadata to profiles for persisted downloads
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_storage_path text,
  ADD COLUMN IF NOT EXISTS resume_filename text,
  ADD COLUMN IF NOT EXISTS resume_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS resume_url text;

COMMIT;
