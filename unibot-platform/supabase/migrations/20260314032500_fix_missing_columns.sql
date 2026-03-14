-- Migration: Fix missing columns in profiles and student_majors tables
-- Date: 2026-03-14

-- 1. Add email column to profiles table (for caching/display purposes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add academic_level_id column to student_majors table
ALTER TABLE student_majors ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

-- 3. Create index for academic_level_id
CREATE INDEX IF NOT EXISTS idx_student_majors_academic_level_id ON student_majors(academic_level_id);

-- 4. Update existing profiles with email from auth.users (if needed)
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
