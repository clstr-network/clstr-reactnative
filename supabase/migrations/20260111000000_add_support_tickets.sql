-- Create support_tickets table for help center contact form
-- This table stores support requests submitted by users

BEGIN;

-- Ensure shared updated_at trigger function exists (some environments may not have baseline triggers applied)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create support tickets
CREATE POLICY "Users can create support tickets"
    ON public.support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to read their own support tickets
CREATE POLICY "Users can read own support tickets"
    ON public.support_tickets
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.support_tickets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON TABLE public.support_tickets IS 'Stores support tickets submitted via the help center contact form';

COMMIT;
