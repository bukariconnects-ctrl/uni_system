-- Add attachment_url column to assignments table for faculty file uploads
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT NULL;
