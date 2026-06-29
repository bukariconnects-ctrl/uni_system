-- ============================================================
-- Migration 6: Create helper functions for new schema
-- NOTE: All child-table course_id columns were added in
--       Migration 3 (where sections table still existed).
--       This migration only creates helper functions.
-- ============================================================

-- Step 1: Create helper function to get courses for a faculty member
CREATE OR REPLACE FUNCTION get_faculty_courses(p_faculty_id UUID, p_semester_id UUID)
RETURNS TABLE(course_id UUID, course_code VARCHAR, course_name VARCHAR, credit_hours INT, component_type VARCHAR)
LANGUAGE SQL STABLE AS $$
    SELECT DISTINCT spc.course_id, c.code, c.name, c.credit_hours, cs.component_type
    FROM course_schedules cs
    JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
    JOIN courses c ON spc.course_id = c.id
    WHERE cs.instructor_id = p_faculty_id
      AND cs.semester_id = p_semester_id
      AND c.is_active = true;
$$;

-- Step 2: Create helper function for student's enrolled courses
CREATE OR REPLACE FUNCTION get_student_enrolled_courses(p_student_id UUID, p_semester_id UUID)
RETURNS TABLE(course_id UUID, course_code VARCHAR, course_name VARCHAR, credit_hours INT)
LANGUAGE SQL STABLE AS $$
    SELECT DISTINCT e.course_id, c.code, c.name, c.credit_hours
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.student_id = p_student_id
      AND e.semester_id = p_semester_id
      AND e.status = 'enrolled';
$$;

-- Step 3: Add indexes on course_id columns in child tables
--         (columns themselves were added in migration 3)
CREATE INDEX IF NOT EXISTS idx_gradebook_entries_course_id ON gradebook_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_id ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_tickets_related_course_id ON tickets(related_course_id);
CREATE INDEX IF NOT EXISTS idx_channels_course_id ON channels(course_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_course_id ON student_risk_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_course_risk_flags_course_id ON course_risk_flags(course_id);
CREATE INDEX IF NOT EXISTS idx_student_recommendations_course_id ON student_recommendations(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_course_id ON ai_knowledge_documents(course_id);
