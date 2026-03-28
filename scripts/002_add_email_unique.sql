-- Add UNIQUE constraint to email column in users_progress
-- This is required for upsert operations to work with email as conflict target

ALTER TABLE users_progress ADD CONSTRAINT users_progress_email_unique UNIQUE (email);
