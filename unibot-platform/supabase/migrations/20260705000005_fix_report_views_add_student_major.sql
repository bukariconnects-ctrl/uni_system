-- ============================================================
-- Migration: Fix report views — add student major/level, course name
--
-- Changes:
-- 1. v_academic_risk_students — add student_major_name, student_level_name
-- 2. v_faculty_attendance_roster — add course_name, student_major_name, student_level_name
-- 3. v_faculty_dismissed_students — add student_major_name, student_level_name
-- ============================================================

-- Note: Use DROP then CREATE because OR REPLACE cannot change column names

-- 1. v_academic_risk_students — add major_name and level_name for students
DROP VIEW IF EXISTS v_academic_risk_students;
CREATE VIEW v_academic_risk_students AS
SELECT
  aus.id                  AS summary_id,
  aus.tenant_id,
  aus.enrollment_id,
  aus.student_id,
  aus.course_id,
  aus.total_sessions,
  aus.unexcused_absences,
  aus.excused_absences,
  aus.attended_sessions,
  aus.late_count,
  aus.absence_percentage,
  aus.is_dismissed,
  aus.dismissed_at,
  p.first_name,
  p.last_name,
  sp.student_number,
  co.code                AS course_code,
  co.name                AS course_name,
  d.id                   AS department_id,
  d.name                 AS department_name,
  sm_major.name          AS student_major_name,
  sm_level.name          AS student_level_name,
  COALESCE(c.absence_limit_count, t.absence_limit_count, 5) AS absence_limit_count,
  CASE
    WHEN aus.is_dismissed                                                       THEN 'dismissed'
    WHEN aus.unexcused_absences >= COALESCE(c.absence_limit_count, t.absence_limit_count, 5) - 1
      AND COALESCE(c.absence_limit_count, t.absence_limit_count, 5) > 1         THEN 'at_risk'
    ELSE 'safe'
  END AS risk_status,
  CASE
    WHEN aus.is_dismissed THEN 0
    ELSE GREATEST(COALESCE(c.absence_limit_count, t.absence_limit_count, 5) - aus.unexcused_absences, 0)
  END AS remaining_absences
FROM attendance_summaries aus
JOIN profiles p ON p.id = aus.student_id
LEFT JOIN student_profiles sp ON sp.profile_id = aus.student_id
JOIN courses co ON co.id = aus.course_id
LEFT JOIN departments d ON d.id = co.department_id
LEFT JOIN colleges c ON c.id = d.college_id
LEFT JOIN tenants t ON t.id = aus.tenant_id
LEFT JOIN student_majors sm ON sm.student_id = p.id AND sm.is_primary = TRUE
LEFT JOIN majors sm_major ON sm_major.id = sm.major_id
LEFT JOIN academic_levels sm_level ON sm_level.id = sm.academic_level_id;

-- 2. v_faculty_attendance_roster — add course_name, student_major_name, student_level_name
DROP VIEW IF EXISTS v_faculty_attendance_roster;
CREATE VIEW v_faculty_attendance_roster AS
SELECT
  ar.student_id,
  ar.course_id,
  ar.tenant_id,
  p.first_name,
  p.last_name,
  sp.student_number,
  co.code                                          AS course_code,
  co.name                                          AS course_name,
  sm_major.name                                    AS student_major_name,
  sm_level.name                                    AS student_level_name,
  COUNT(ar.id)                                     AS total_sessions,
  COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS present_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'absent')  AS absent_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS excused_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'late')    AS late_count,
  COALESCE(aus.is_dismissed, FALSE)                AS is_dismissed,
  aus.unexcused_absences,
  aus.absence_percentage
FROM attendance_records ar
JOIN profiles p ON p.id = ar.student_id
LEFT JOIN student_profiles sp ON sp.profile_id = ar.student_id
JOIN courses co ON co.id = ar.course_id
LEFT JOIN attendance_summaries aus ON aus.student_id = ar.student_id AND aus.course_id = ar.course_id
LEFT JOIN student_majors sm ON sm.student_id = p.id AND sm.is_primary = TRUE
LEFT JOIN majors sm_major ON sm_major.id = sm.major_id
LEFT JOIN academic_levels sm_level ON sm_level.id = sm.academic_level_id
GROUP BY ar.student_id, ar.course_id, ar.tenant_id, p.first_name, p.last_name,
         sp.student_number, co.code, co.name, sm_major.name, sm_level.name,
         aus.is_dismissed, aus.unexcused_absences, aus.absence_percentage;

-- 3. v_faculty_dismissed_students — add student_major_name, student_level_name
DROP VIEW IF EXISTS v_faculty_dismissed_students;
CREATE VIEW v_faculty_dismissed_students AS
SELECT
  aus.student_id,
  aus.course_id,
  aus.enrollment_id,
  aus.tenant_id,
  p.first_name,
  p.last_name,
  sp.student_number,
  sm_major.name          AS student_major_name,
  sm_level.name          AS student_level_name,
  aus.total_sessions,
  aus.unexcused_absences,
  aus.excused_absences,
  aus.attended_sessions,
  aus.late_count,
  aus.absence_percentage,
  aus.dismissed_at,
  co.code AS course_code,
  co.name AS course_name
FROM attendance_summaries aus
JOIN profiles p ON p.id = aus.student_id
LEFT JOIN student_profiles sp ON sp.profile_id = aus.student_id
JOIN courses co ON co.id = aus.course_id
LEFT JOIN student_majors sm ON sm.student_id = p.id AND sm.is_primary = TRUE
LEFT JOIN majors sm_major ON sm_major.id = sm.major_id
LEFT JOIN academic_levels sm_level ON sm_level.id = sm.academic_level_id
WHERE aus.is_dismissed = TRUE;

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Fixed report views — added student major/level and course name';
END $$;
