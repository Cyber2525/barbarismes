-- Create users_progress table for storing user progress data
CREATE TABLE IF NOT EXISTS users_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  progress_data JSONB DEFAULT '[]'::jsonb,
  dialect_progress JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_progress_email ON users_progress(email);

-- Enable Row Level Security
ALTER TABLE users_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read/write their own data (using email match)
-- Since we're not using Supabase Auth, we allow public access with anon key
CREATE POLICY "Allow public access to users_progress" ON users_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);
