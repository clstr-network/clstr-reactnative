-- ============================================================================
-- 007_ecocampus.sql - EcoCampus shared items and requests
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- SHARED ITEMS (EcoCampus)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shared_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  title text NOT NULL,
  description text,
  category text,
  price text,
  image text,
  location text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'taken', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_items_user_id_idx ON public.shared_items(user_id);
CREATE INDEX IF NOT EXISTS shared_items_college_domain_idx ON public.shared_items(college_domain);
CREATE INDEX IF NOT EXISTS shared_items_category_idx ON public.shared_items(category);
CREATE INDEX IF NOT EXISTS shared_items_status_idx ON public.shared_items(status);
CREATE INDEX IF NOT EXISTS shared_items_created_at_idx ON public.shared_items(created_at DESC);

-- ============================================================================
-- ITEM REQUESTS (EcoCampus)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  item text NOT NULL,
  description text,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  preference text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS item_requests_user_id_idx ON public.item_requests(user_id);
CREATE INDEX IF NOT EXISTS item_requests_college_domain_idx ON public.item_requests(college_domain);
CREATE INDEX IF NOT EXISTS item_requests_status_idx ON public.item_requests(status);
CREATE INDEX IF NOT EXISTS item_requests_created_at_idx ON public.item_requests(created_at DESC);

-- ============================================================================
-- NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  title text NOT NULL,
  content text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_college_domain_idx ON public.notes(college_domain);

COMMIT;
