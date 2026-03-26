-- Create user_progress table to store done items synced to cloud
-- Users are matched by email (Google/Apple OAuth emails)

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  done_barbarismes TEXT[] DEFAULT '{}',
  done_dialectes TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster email lookups (for matching across OAuth providers)
CREATE INDEX IF NOT EXISTS idx_user_progress_email ON public.user_progress(email);

-- Enable Row Level Security
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "user_progress_select_own" ON public.user_progress 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own" ON public.user_progress 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own" ON public.user_progress 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_progress_delete_own" ON public.user_progress 
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user_progress on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, email, done_barbarismes, done_dialectes)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    '{}',
    '{}'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create user_progress on signup
DROP TRIGGER IF EXISTS on_auth_user_created_progress ON auth.users;
CREATE TRIGGER on_auth_user_created_progress
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_progress();

-- Create sync_queue table for offline changes
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('add', 'remove')),
  item_type TEXT NOT NULL CHECK (item_type IN ('barbarismes', 'dialectes')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT FALSE
);

-- Index for faster queue processing
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_synced ON public.sync_queue(user_id, synced);

-- Enable RLS on sync_queue
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_queue
CREATE POLICY "sync_queue_select_own" ON public.sync_queue 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sync_queue_insert_own" ON public.sync_queue 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_queue_update_own" ON public.sync_queue 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sync_queue_delete_own" ON public.sync_queue 
  FOR DELETE USING (auth.uid() = user_id);
