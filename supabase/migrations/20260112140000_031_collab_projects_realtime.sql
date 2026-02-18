-- Add CollabHub tables to realtime publication
BEGIN;

-- Ensure supabase_realtime includes all collaboration tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_projects;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_project_roles;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_project_applications;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_team_members;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_project_updates;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
