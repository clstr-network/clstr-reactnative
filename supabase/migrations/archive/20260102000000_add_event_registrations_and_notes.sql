-- Adds missing event registrations and personal notes tables so portal pages use live data

-- ============================================================================
-- EVENT REGISTRATIONS TABLE (used by src/pages/Events.tsx)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_registration_status'
  ) THEN
    CREATE TYPE event_registration_status AS ENUM ('pending', 'confirmed', 'waitlisted', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status event_registration_status DEFAULT 'pending' NOT NULL,
  college_domain text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS event_registrations_status_idx ON public.event_registrations(status);
CREATE INDEX IF NOT EXISTS event_registrations_created_at_idx ON public.event_registrations(created_at DESC);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their registrations or owned events" ON public.event_registrations;
CREATE POLICY "Users can view their registrations or owned events"
  ON public.event_registrations
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users or organizers can update registrations" ON public.event_registrations;
CREATE POLICY "Users or organizers can update registrations"
  ON public.event_registrations
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can cancel their registrations" ON public.event_registrations;
CREATE POLICY "Users can cancel their registrations"
  ON public.event_registrations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_event_registration_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_domain text;
  v_user_domain text;
BEGIN
  SELECT college_domain INTO v_event_domain
  FROM public.events
  WHERE id = NEW.event_id;

  SELECT college_domain INTO v_user_domain
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_event_domain IS NULL OR v_user_domain IS NULL THEN
    RAISE EXCEPTION 'College domain missing for event % or user %', NEW.event_id, NEW.user_id;
  END IF;

  IF v_event_domain <> v_user_domain THEN
    RAISE EXCEPTION 'Users may only register for events in their college domain';
  END IF;

  NEW.college_domain := v_event_domain;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_event_registration_college_domain ON public.event_registrations;
CREATE TRIGGER set_event_registration_college_domain
  BEFORE INSERT OR UPDATE OF event_id, user_id ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION set_event_registration_college_domain();

DROP TRIGGER IF EXISTS update_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION refresh_event_registration_counts(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_attendees integer;
  v_interested integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'confirmed'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'waitlisted'))
  INTO v_attendees, v_interested
  FROM public.event_registrations
  WHERE event_id = p_event_id;

  UPDATE public.events
  SET attendees_count = COALESCE(v_attendees, 0),
      interested_count = COALESCE(v_interested, 0)
  WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_event_registration_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.event_id <> OLD.event_id THEN
    PERFORM refresh_event_registration_counts(OLD.event_id);
    PERFORM refresh_event_registration_counts(NEW.event_id);
  ELSE
    PERFORM refresh_event_registration_counts(CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_event_registration_counts ON public.event_registrations;
CREATE TRIGGER update_event_registration_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_registration_counts();

COMMENT ON TABLE public.event_registrations IS 'Tracks which users registered for each event with domain isolation.';

-- ============================================================================
-- PERSONAL NOTES TABLE (used by src/lib/api.ts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL CHECK (length(title) > 0 AND length(title) <= 200),
  content text NOT NULL CHECK (length(content) > 0),
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  college_domain text
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_uploaded_at_idx ON public.notes(uploaded_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their notes" ON public.notes;
CREATE POLICY "Users can read their notes"
  ON public.notes
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create notes" ON public.notes;
CREATE POLICY "Users can create notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notes" ON public.notes;
CREATE POLICY "Users can update their notes"
  ON public.notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their notes" ON public.notes;
CREATE POLICY "Users can delete their notes"
  ON public.notes
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_notes_college_domain ON public.notes;
CREATE TRIGGER set_notes_college_domain
  BEFORE INSERT OR UPDATE OF user_id ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION set_user_college_domain();

COMMENT ON TABLE public.notes IS 'Personal study or project notes owned by an individual user.';
COMMENT ON COLUMN public.notes.uploaded_at IS 'Timestamp used for ordering in the Notes UI.';
