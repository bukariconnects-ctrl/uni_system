-- ============================================================
-- Migration 10: Fix RLS policies after sections table removal
--
-- The `sections` table was dropped in migration 4, but several
-- RLS policies still reference it via `section_id IN (SELECT id FROM sections ...)`.
-- This migration:
--   1. Drops broken policies on attendance_sessions, attendance_records,
--      gradebook_entries, submissions, messages, course_risk_flags
--   2. Recreates them using course_id / course_schedules relationship
--   3. Drops NOT NULL on attendance_records.section_id
--   4. Drops UNIQUE (section_id, ...) on attendance_sessions
--   5. Creates proper UNIQUE (course_id, session_date, start_time)
--   6. Drops orphan indexes on section_id
-- ============================================================

-- ============================================================
-- STEP 1: attendance_sessions
-- ============================================================

-- 1a. Drop broken policies
DROP POLICY IF EXISTS "faculty_manage_own_attendance_sessions" ON attendance_sessions;
DROP POLICY IF EXISTS "student_read_own_attendance_sessions" ON attendance_sessions;

-- 1b. Faculty policy: faculty can manage attendance for courses they teach
--     (course_id is determined via course_schedules -> study_plan_courses)
CREATE POLICY "faculty_manage_own_attendance_sessions"
    ON attendance_sessions FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND course_id IN (
                    SELECT spc.course_id
                    FROM course_schedules cs
                    JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                    WHERE cs.instructor_id = current_profile_id()
                )
            )
        )
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND course_id IN (
                    SELECT spc.course_id
                    FROM course_schedules cs
                    JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                    WHERE cs.instructor_id = current_profile_id()
                )
            )
        )
    );

-- 1c. Student policy: students can read attendance sessions for courses they are enrolled in
CREATE POLICY "student_read_own_attendance_sessions"
    ON attendance_sessions FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND course_id IN (
            SELECT course_id FROM enrollments
            WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

-- 1d. Drop old UNIQUE constraint (section_id, session_date, start_time)
--     and replace with (course_id, session_date, start_time)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_sessions_section_id_session_date_start_time_key'
      AND conrelid = 'attendance_sessions'::regclass
  ) THEN
    ALTER TABLE attendance_sessions DROP CONSTRAINT attendance_sessions_section_id_session_date_start_time_key;
  END IF;
END $$;

-- Also handle any other unique constraint name pattern
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'attendance_sessions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%section_id%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE attendance_sessions DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'attendance_sessions'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%section_id%'
    );
  END IF;
END $$;

-- Add the new UNIQUE constraint on course_id
ALTER TABLE attendance_sessions ADD CONSTRAINT uq_attendance_sessions_course_time
    UNIQUE (course_id, session_date, start_time);

-- 1e. Drop orphan section_id index
DROP INDEX IF EXISTS idx_att_sessions_section_id;

-- 1f. Drop FK to sections if somehow still present (should have been cascaded)
DO $$
BEGIN
  ALTER TABLE attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_section_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- STEP 2: attendance_records
-- ============================================================

-- 2a. Add course_id column (code inserts it but column was never created)
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- 2b. Drop NOT NULL on section_id (FK was already cascaded away)
ALTER TABLE attendance_records ALTER COLUMN section_id DROP NOT NULL;

-- 2b. Drop broken policy
DROP POLICY IF EXISTS "faculty_manage_attendance_records" ON attendance_records;

-- 2c. Create new faculty policy for attendance_records using session -> course relationship
CREATE POLICY "faculty_manage_attendance_records"
    ON attendance_records FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND session_id IN (
                    SELECT s.id FROM attendance_sessions s
                    WHERE s.course_id IN (
                        SELECT spc.course_id
                        FROM course_schedules cs
                        JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                        WHERE cs.instructor_id = current_profile_id()
                    )
                )
            )
        )
    );

-- 2d. Drop orphan section_id index
DROP INDEX IF EXISTS idx_att_records_section_id;

-- 2e. Drop FK to sections if somehow still present
DO $$
BEGIN
  ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_section_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- STEP 3: gradebook_entries
-- ============================================================

-- 3a. Drop broken policy
DROP POLICY IF EXISTS "faculty_manage_own_section_gradebook" ON gradebook_entries;

-- 3b. Create new faculty policy for gradebook_entries using course_id
CREATE POLICY "faculty_manage_own_course_gradebook"
    ON gradebook_entries FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND course_id IN (
                    SELECT spc.course_id
                    FROM course_schedules cs
                    JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                    WHERE cs.instructor_id = current_profile_id()
                )
            )
        )
    );

-- ============================================================
-- STEP 4: submissions (faculty_read_section_submissions, faculty_grade_submissions)
-- ============================================================

DROP POLICY IF EXISTS "faculty_read_section_submissions" ON submissions;
DROP POLICY IF EXISTS "faculty_grade_submissions" ON submissions;

CREATE POLICY "faculty_read_course_submissions"
    ON submissions FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND assignment_id IN (
            SELECT id FROM assignments
            WHERE course_id IN (
                SELECT spc.course_id
                FROM course_schedules cs
                JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                WHERE cs.instructor_id = current_profile_id()
            )
        )
    );

CREATE POLICY "faculty_grade_course_submissions"
    ON submissions FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND assignment_id IN (
            SELECT id FROM assignments
            WHERE course_id IN (
                SELECT spc.course_id
                FROM course_schedules cs
                JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
                WHERE cs.instructor_id = current_profile_id()
            )
        )
    );

-- ============================================================
-- STEP 5: messages (channel_admin_manage_messages references channels.section_id)
-- ============================================================

DROP POLICY IF EXISTS "channel_admin_manage_messages" ON messages;

CREATE POLICY "channel_admin_manage_messages"
    ON messages FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND channel_id IN (
                    SELECT id FROM channels
                    WHERE created_by = current_profile_id()
                )
            )
        )
    );

-- ============================================================
-- STEP 6: course_risk_flags (faculty_read_own_course_risk_flags)
-- ============================================================

DROP POLICY IF EXISTS "faculty_read_own_course_risk_flags" ON course_risk_flags;

CREATE POLICY "faculty_read_own_course_risk_flags"
    ON course_risk_flags FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND course_id IN (
            SELECT spc.course_id
            FROM course_schedules cs
            JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
            WHERE cs.instructor_id = current_profile_id()
        )
    );

-- ============================================================
-- STEP 7: course_materials (student_read_published_materials references enrollments.section_id)
-- ============================================================

DROP POLICY IF EXISTS "student_read_published_materials" ON course_materials;

CREATE POLICY "student_read_published_materials"
    ON course_materials FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND is_published = TRUE
        AND course_id IN (
            SELECT course_id FROM enrollments
            WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

-- ============================================================
-- STEP 8: assignments (student_read_published_assignments references enrollments.section_id)
-- ============================================================

DROP POLICY IF EXISTS "student_read_published_assignments" ON assignments;

CREATE POLICY "student_read_published_assignments"
    ON assignments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND is_published = TRUE
        AND course_id IN (
            SELECT course_id FROM enrollments
            WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

-- ============================================================
-- Log completion
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 10 complete: Fixed RLS policies and schema after sections removal';
END $$;
