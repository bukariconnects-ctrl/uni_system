-- ============================================================
-- Migration: Create reporting views for the 4 roles
--
-- Creates ~15 PostgreSQL views that aggregate data for the
-- reporting pages. Each role has its own set of views scoped
-- to their domain.
-- ============================================================

-- ################################################################
-- SUPER ADMIN VIEWS (v_super_admin_*)
-- ################################################################

-- 1.1 Tenant overview — summary counts and storage
CREATE OR REPLACE VIEW v_super_admin_tenants_overview AS
SELECT
  COUNT(*)                                            AS total_tenants,
  COUNT(*) FILTER (WHERE status = 'active')            AS active_count,
  COUNT(*) FILTER (WHERE status = 'suspended')         AS suspended_count,
  COUNT(*) FILTER (WHERE status = 'deleted')           AS deleted_count,
  COALESCE(SUM(storage_used_gb), 0)                     AS total_storage_used_gb,
  COALESCE(SUM(max_storage_gb), 0)                      AS total_max_storage_gb,
  COALESCE(SUM(max_users), 0)                           AS total_max_users,
  COALESCE(AVG(absence_limit_count), 5)::INT            AS avg_absence_limit
FROM tenants;

-- 1.2 Platform-wide stats (users, courses, enrollments)
CREATE OR REPLACE VIEW v_super_admin_platform_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'student')             AS total_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'faculty')             AS total_faculty,
  (SELECT COUNT(*) FROM profiles WHERE role = 'tenant_admin')        AS total_tenant_admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'academic_management') AS total_academic_management,
  (SELECT COUNT(*) FROM profiles)                                     AS total_profiles,
  (SELECT COUNT(*) FROM courses)                                      AS total_courses,
  (SELECT COUNT(*) FROM departments)                                  AS total_departments,
  (SELECT COUNT(*) FROM majors)                                       AS total_majors,
  (SELECT COUNT(*) FROM enrollments WHERE status IN ('enrolled', 'dismissed')) AS total_active_enrollments,
  (SELECT COUNT(*) FROM attendance_sessions)                          AS total_sessions,
  (SELECT COUNT(*) FROM colleges)                                     AS total_colleges;

-- 1.3 Token usage per tenant
CREATE OR REPLACE VIEW v_super_admin_token_usage AS
SELECT
  t.id                AS tenant_id,
  t.name              AS tenant_name,
  t.status            AS tenant_status,
  COALESCE(SUM(atu.total_tokens), 0)     AS total_tokens,
  COALESCE(SUM(atu.cost_usd), 0)::NUMERIC(14,2)     AS total_cost_usd,
  COUNT(atu.id)       AS total_requests,
  MAX(atu.created_at) AS last_usage_at
FROM tenants t
LEFT JOIN ai_token_usage atu ON atu.tenant_id = t.id
GROUP BY t.id, t.name, t.status
ORDER BY total_tokens DESC;

-- 1.4 Monthly tenant growth
CREATE OR REPLACE VIEW v_super_admin_monthly_growth AS
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS year_month,
  COUNT(*)                       AS new_tenants,
  SUM(COUNT(*)) OVER (ORDER BY TO_CHAR(created_at, 'YYYY-MM')) AS cumulative_tenants
FROM tenants
WHERE deleted_at IS NULL
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY year_month;


-- ################################################################
-- TENANT ADMIN VIEWS (v_tenant_*)
-- ################################################################

-- 2.1 User stats grouped by role, per tenant
CREATE OR REPLACE VIEW v_tenant_user_stats AS
SELECT
  tenant_id,
  COUNT(*)                                                              AS total_users,
  COUNT(*) FILTER (WHERE role = 'student')                              AS student_count,
  COUNT(*) FILTER (WHERE role = 'faculty')                              AS faculty_count,
  COUNT(*) FILTER (WHERE role = 'tenant_admin')                         AS admin_count,
  COUNT(*) FILTER (WHERE role = 'academic_management')                  AS academic_management_count,
  COUNT(*) FILTER (WHERE account_status = 'active')                     AS active_users,
  COUNT(*) FILTER (WHERE account_status = 'active' AND role = 'student') AS active_students,
  COUNT(*) FILTER (WHERE account_status = 'active' AND role = 'faculty') AS active_faculty
FROM profiles
GROUP BY tenant_id;

-- 2.2 Per-college statistics (departments, majors, courses, students)
CREATE OR REPLACE VIEW v_tenant_college_stats AS
SELECT
  c.id                  AS college_id,
  c.tenant_id,
  c.name                AS college_name,
  c.code                AS college_code,
  c.absence_limit_count,
  COUNT(DISTINCT d.id)  AS department_count,
  COUNT(DISTINCT m.id)  AS major_count,
  COUNT(DISTINCT co.id) AS course_count,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status IN ('enrolled', 'dismissed')) AS total_students,
  COUNT(DISTINCT fd.faculty_id) AS faculty_count
FROM colleges c
LEFT JOIN departments d ON d.college_id = c.id
LEFT JOIN majors m ON m.department_id = d.id
LEFT JOIN courses co ON co.department_id = d.id AND co.is_active = TRUE
LEFT JOIN enrollments e ON e.course_id = co.id
LEFT JOIN faculty_departments fd ON fd.department_id = d.id
GROUP BY c.id, c.tenant_id, c.name, c.code, c.absence_limit_count;

-- 2.3 Course overview (enrollments, sessions, assignments)
CREATE OR REPLACE VIEW v_tenant_course_overview AS
SELECT
  co.id                  AS course_id,
  co.tenant_id,
  co.code                AS course_code,
  co.name                AS course_name,
  co.is_active,
  co.credit_hours,
  d.id                   AS department_id,
  d.name                 AS department_name,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status IN ('enrolled', 'dismissed')) AS enrolled_students,
  COUNT(DISTINCT att_s.id)        AS total_sessions,
  COUNT(DISTINCT a.id)            AS total_assignments,
  COUNT(DISTINCT CASE WHEN aus.is_dismissed THEN aus.student_id END) AS dismissed_count
FROM courses co
LEFT JOIN departments d ON d.id = co.department_id
LEFT JOIN enrollments e ON e.course_id = co.id
LEFT JOIN attendance_sessions att_s ON att_s.course_id = co.id
LEFT JOIN assignments a ON a.course_id = co.id
LEFT JOIN attendance_summaries aus ON aus.course_id = co.id AND aus.is_dismissed = TRUE
GROUP BY co.id, co.tenant_id, co.code, co.name, co.is_active, co.credit_hours, d.id, d.name;

-- 2.4 Attendance summary per course
CREATE OR REPLACE VIEW v_tenant_attendance_summary AS
SELECT
  co.tenant_id,
  co.id                                   AS course_id,
  co.code                                 AS course_code,
  co.name                                 AS course_name,
  COUNT(DISTINCT att_s.id)                AS total_sessions,
  COUNT(DISTINCT e.student_id)            AS total_students,
  COUNT(ar.id)                            AS total_records,
  COUNT(ar.id) FILTER (WHERE ar.status = 'present')  AS present_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'absent')   AS absent_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'excused')  AS excused_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'late')     AS late_count,
  CASE WHEN COUNT(ar.id) > 0
    THEN ROUND((COUNT(ar.id) FILTER (WHERE ar.status = 'absent')::NUMERIC / COUNT(ar.id)) * 100, 2)
    ELSE 0
  END                                             AS absence_percentage,
  COUNT(DISTINCT CASE WHEN aus.is_dismissed THEN aus.student_id END) AS dismissed_count
FROM courses co
LEFT JOIN attendance_sessions att_s ON att_s.course_id = co.id
LEFT JOIN attendance_records ar ON ar.session_id = att_s.id
LEFT JOIN enrollments e ON e.course_id = co.id AND e.status IN ('enrolled', 'dismissed')
LEFT JOIN attendance_summaries aus ON aus.course_id = co.id AND aus.is_dismissed = TRUE
GROUP BY co.id, co.tenant_id, co.code, co.name;


-- ################################################################
-- ACADEMIC MANAGEMENT VIEWS (v_academic_*)
-- ################################################################

-- 3.1 Department-level stats (college, majors, courses, students, faculty)
CREATE OR REPLACE VIEW v_academic_dept_stats AS
SELECT
  d.id                   AS department_id,
  d.tenant_id,
  d.name                 AS department_name,
  d.code                 AS department_code,
  c.id                   AS college_id,
  c.name                 AS college_name,
  COUNT(DISTINCT m.id)   AS major_count,
  COUNT(DISTINCT co.id)  AS course_count,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status IN ('enrolled', 'dismissed')) AS enrolled_students,
  COUNT(DISTINCT fd.faculty_id) AS faculty_count,
  COUNT(DISTINCT att_s.id)      AS total_sessions
FROM departments d
LEFT JOIN colleges c ON c.id = d.college_id
LEFT JOIN majors m ON m.department_id = d.id
LEFT JOIN courses co ON co.department_id = d.id AND co.is_active = TRUE
LEFT JOIN enrollments e ON e.course_id = co.id
LEFT JOIN faculty_departments fd ON fd.department_id = d.id
LEFT JOIN attendance_sessions att_s ON att_s.course_id IN (
  SELECT id FROM courses WHERE department_id = d.id
)
GROUP BY d.id, d.tenant_id, d.name, d.code, c.id, c.name;

-- 3.2 Students at risk (dismissed or near limit) — detailed
CREATE OR REPLACE VIEW v_academic_risk_students AS
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
LEFT JOIN tenants t ON t.id = aus.tenant_id;

-- 3.3 Course performance (attendance, assignments, dismissals)
CREATE OR REPLACE VIEW v_academic_course_performance AS
SELECT
  co.id                           AS course_id,
  co.tenant_id,
  co.code                         AS course_code,
  co.name                         AS course_name,
  d.id                            AS department_id,
  d.name                          AS department_name,
  COUNT(DISTINCT e.student_id)    AS enrolled_students,
  COUNT(DISTINCT att_s.id)        AS total_sessions,
  COUNT(DISTINCT a.id)            AS total_assignments,
  COUNT(DISTINCT sub.id)          AS total_submissions,
  COUNT(DISTINCT CASE WHEN aus.is_dismissed THEN aus.student_id END) AS dismissed_count,
  ROUND(COALESCE(AVG(aus.absence_percentage), 0), 2)                  AS avg_absence_percentage,
  ROUND(COALESCE(AVG(aus.unexcused_absences), 0), 1)                  AS avg_unexcused_absences
FROM courses co
LEFT JOIN departments d ON d.id = co.department_id
LEFT JOIN enrollments e ON e.course_id = co.id AND e.status IN ('enrolled', 'dismissed')
LEFT JOIN attendance_sessions att_s ON att_s.course_id = co.id
LEFT JOIN assignments a ON a.course_id = co.id
LEFT JOIN submissions sub ON sub.assignment_id = a.id
LEFT JOIN attendance_summaries aus ON aus.course_id = co.id
GROUP BY co.id, co.tenant_id, co.code, co.name, d.id, d.name;


-- ################################################################
-- FACULTY VIEWS (v_faculty_*)
-- ################################################################

-- 4.1 Courses taught by faculty (from course_schedules → study_plan_courses → courses)
CREATE OR REPLACE VIEW v_faculty_my_courses AS
SELECT
  cs.instructor_id      AS faculty_id,
  spc.course_id,
  co.code               AS course_code,
  co.name               AS course_name,
  co.credit_hours,
  m.id                  AS major_id,
  m.name                AS major_name,
  al.id                 AS academic_level_id,
  al.level_number       AS academic_level_number,
  al.name               AS academic_level_name,
  cs.semester_id,
  sem.name              AS semester_name,
  sem.academic_year,
  cs.tenant_id,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status IN ('enrolled', 'dismissed')) AS enrolled_students,
  COUNT(DISTINCT att_s.id)        AS total_sessions,
  COUNT(DISTINCT a.id)            AS total_assignments
FROM course_schedules cs
JOIN study_plan_courses spc ON spc.id = cs.study_plan_course_id
JOIN courses co ON co.id = spc.course_id
LEFT JOIN academic_levels al ON al.id = spc.academic_level_id
LEFT JOIN majors m ON m.id = al.major_id
LEFT JOIN semesters sem ON sem.id = cs.semester_id
LEFT JOIN enrollments e ON e.course_id = spc.course_id
LEFT JOIN attendance_sessions att_s ON att_s.course_id = spc.course_id
LEFT JOIN assignments a ON a.course_id = spc.course_id
GROUP BY cs.instructor_id, spc.course_id, co.code, co.name, co.credit_hours,
         m.id, m.name, al.id, al.level_number, al.name,
         cs.semester_id, sem.name, sem.academic_year, cs.tenant_id;

-- 4.2 Attendance roster — per-student summary per course
CREATE OR REPLACE VIEW v_faculty_attendance_roster AS
SELECT
  ar.student_id,
  ar.course_id,
  ar.tenant_id,
  p.first_name,
  p.last_name,
  sp.student_number,
  COUNT(ar.id)                                             AS total_sessions,
  COUNT(ar.id) FILTER (WHERE ar.status = 'present')        AS present_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'absent')         AS absent_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'excused')        AS excused_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'late')           AS late_count,
  COALESCE(aus.is_dismissed, FALSE)                        AS is_dismissed,
  aus.unexcused_absences,
  aus.absence_percentage
FROM attendance_records ar
JOIN profiles p ON p.id = ar.student_id
LEFT JOIN student_profiles sp ON sp.profile_id = ar.student_id
LEFT JOIN attendance_summaries aus ON aus.student_id = ar.student_id AND aus.course_id = ar.course_id
GROUP BY ar.student_id, ar.course_id, ar.tenant_id, p.first_name, p.last_name,
         sp.student_number, aus.is_dismissed, aus.unexcused_absences, aus.absence_percentage;

-- 4.3 Dismissed students per course
CREATE OR REPLACE VIEW v_faculty_dismissed_students AS
SELECT
  aus.student_id,
  aus.course_id,
  aus.enrollment_id,
  aus.tenant_id,
  p.first_name,
  p.last_name,
  sp.student_number,
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
WHERE aus.is_dismissed = TRUE;

-- 4.4 Submission stats per assignment per course
CREATE OR REPLACE VIEW v_faculty_submission_stats AS
SELECT
  a.course_id,
  a.id                       AS assignment_id,
  a.title                    AS assignment_title,
  a.created_by               AS faculty_id,
  a.max_grade,
  a.due_date,
  a.is_published,
  a.tenant_id,
  COUNT(sub.id)              AS total_submissions,
  COUNT(sub.id) FILTER (WHERE sub.status = 'submitted') AS submitted_count,
  COUNT(sub.id) FILTER (WHERE sub.status = 'graded')    AS graded_count,
  ROUND(COALESCE(AVG(sub.grade), 0), 2)                 AS avg_grade,
  MAX(sub.grade)              AS max_grade_achieved,
  MIN(sub.grade)              AS min_grade_achieved
FROM assignments a
LEFT JOIN submissions sub ON sub.assignment_id = a.id
GROUP BY a.course_id, a.id, a.title, a.created_by, a.max_grade, a.due_date, a.is_published, a.tenant_id;


-- ============================================================
-- Notification
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Created all reporting views (v_super_admin_*, v_tenant_*, v_academic_*, v_faculty_*)';
END $$;
