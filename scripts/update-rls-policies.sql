-- Update RLS policies to allow email-based access (no Supabase Auth)
-- The app uses simple email login without OTP, so we need public access

-- Drop existing policies on user_progress
DROP POLICY IF EXISTS "user_progress_insert_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_select_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_update_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_delete_own" ON public.user_progress;

-- Create new policies that allow all operations (the app handles auth via email pattern)
CREATE POLICY "allow_all_select" ON public.user_progress FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.user_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.user_progress FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.user_progress FOR DELETE USING (true);

-- Drop existing policies on sync_queue (if still needed)
DROP POLICY IF EXISTS "sync_queue_insert_own" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_select_own" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_update_own" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_delete_own" ON public.sync_queue;

-- Create new policies for sync_queue
CREATE POLICY "allow_all_select_sync" ON public.sync_queue FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_sync" ON public.sync_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_sync" ON public.sync_queue FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete_sync" ON public.sync_queue FOR DELETE USING (true);
