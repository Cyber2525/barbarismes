-- Fix users_progress table: add missing column and configure RLS correctly

-- 1. Add item_timestamps column if it doesn't exist yet
ALTER TABLE public.users_progress
  ADD COLUMN IF NOT EXISTS item_timestamps JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Make sure RLS is enabled
ALTER TABLE public.users_progress ENABLE ROW LEVEL SECURITY;

-- 3. Drop any conflicting policies before recreating
DROP POLICY IF EXISTS "Allow public access to users_progress" ON public.users_progress;
DROP POLICY IF EXISTS "allow_all" ON public.users_progress;
DROP POLICY IF EXISTS "anon_full_access" ON public.users_progress;

-- 4. Create a single permissive policy that allows all operations for the anon role
--    (the app uses email-based identity, not Supabase Auth)
CREATE POLICY "anon_full_access" ON public.users_progress
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Grant the necessary privileges to the anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users_progress TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users_progress TO authenticated;
