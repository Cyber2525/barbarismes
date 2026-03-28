-- FETS Progress Cloud Sync Schema
-- Stores user progress data for Catalan language learning app

-- Create users_progress table to store email-based user data
CREATE TABLE IF NOT EXISTS users_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  progress_data JSONB NOT NULL DEFAULT '{}',
  dialect_progress JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sync_queue table for conflict resolution
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES users_progress(email) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('add', 'remove', 'update')),
  item_type TEXT NOT NULL CHECK (item_type IN ('barbarisme', 'dialect', 'setting')),
  item_key TEXT NOT NULL,
  item_value JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT FALSE,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_progress_email ON users_progress(email);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_email ON sync_queue(user_email);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_progress_updated_at ON users_progress;
CREATE TRIGGER update_users_progress_updated_at
  BEFORE UPDATE ON users_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
