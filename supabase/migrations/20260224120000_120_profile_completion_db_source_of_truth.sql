-- Ensure profile completion is always computed in the database.
-- This removes frontend drift and guarantees a single source of truth.

CREATE OR REPLACE FUNCTION public.set_profile_completion_from_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.profile_completion := public.calculate_profile_completion(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_completion_from_row ON public.profiles;
CREATE TRIGGER trg_set_profile_completion_from_row
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_completion_from_row();
