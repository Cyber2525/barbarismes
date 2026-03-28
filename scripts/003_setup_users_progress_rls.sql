-- Migration: Setup users_progress table with Supabase Auth + RLS
-- The table stores per-user FETS progress, linked to Supabase auth.users

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  progress_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  dialect_progress JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add user_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_progress'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.users_progress
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Ensure email unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_progress_email_unique'
  ) THEN
    ALTER TABLE public.users_progress
      ADD CONSTRAINT users_progress_email_unique UNIQUE (email);
  END IF;
END $$;

-- 4. Ensure user_id unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_progress_user_id_unique'
  ) THEN
    ALTER TABLE public.users_progress
      ADD CONSTRAINT users_progress_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 5. Enable Row Level Security
ALTER TABLE public.users_progress ENABLE ROW LEVEL SECURITY;

-- 6. Drop old policies if they exist (idempotent)
DROP POLICY IF EXISTS "users_progress_select_own" ON public.users_progress;
DROP POLICY IF EXISTS "users_progress_insert_own" ON public.users_progress;
DROP POLICY IF EXISTS "users_progress_update_own" ON public.users_progress;
DROP POLICY IF EXISTS "users_progress_delete_own" ON public.users_progress;

-- 7. Create RLS policies based on auth.uid()
CREATE POLICY "users_progress_select_own"
  ON public.users_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_progress_insert_own"
  ON public.users_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_progress_update_own"
  ON public.users_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_progress_delete_own"
  ON public.users_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.users_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
