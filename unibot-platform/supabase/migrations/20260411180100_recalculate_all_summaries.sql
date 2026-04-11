-- Recalculate all attendance summaries to include all sessions

UPDATE attendance_summaries AS s
SET 
    total_sessions = sub.total,
    attended_sessions = sub.attended,
    excused_absences = sub.excused,
    unexcused_absences = sub.unexcused,
    late_count = sub.late,
    last_updated = NOW()
FROM (
    SELECT 
        ar.student_id,
        ar.section_id,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ar.status = 'present') AS attended,
        COUNT(*) FILTER (WHERE ar.status = 'excused') AS excused,
        COUNT(*) FILTER (WHERE ar.status = 'absent') AS unexcused,
        COUNT(*) FILTER (WHERE ar.status = 'late') AS late
    FROM attendance_records ar
    GROUP BY ar.student_id, ar.section_id
) AS sub
WHERE s.student_id = sub.student_id 
  AND s.section_id = sub.section_id;
