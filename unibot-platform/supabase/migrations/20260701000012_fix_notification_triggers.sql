-- Migration 25: Fix notification triggers for course-group schema
-- ==============================================================
-- The old triggers referenced sections (now dropped) or used
-- section_id for student targeting. This migration rewrites them
-- to use course_id + major_id + academic_level_id.

-- 1. notify_faculty_on_submission — faculty gets notified when a student submits
--    Old: JOIN assignments → sections via section_id (table dropped → broken)
--    New: assignments.created_by is the instructor who created the assignment
DROP TRIGGER IF EXISTS trg_notify_faculty_on_submission ON submissions;

CREATE OR REPLACE FUNCTION notify_faculty_on_submission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_faculty_id    UUID;
  v_student_name  TEXT;
  v_assignment_title TEXT;
  v_tenant_id     UUID;
BEGIN
  SELECT a.tenant_id, a.title, a.created_by
  INTO v_tenant_id, v_assignment_title, v_faculty_id
  FROM assignments a
  WHERE a.id = NEW.assignment_id;

  SELECT first_name || ' ' || last_name
  INTO v_student_name
  FROM profiles WHERE id = NEW.student_id;

  IF v_faculty_id IS NOT NULL THEN
    INSERT INTO notifications (
      tenant_id, recipient_id, notification_type,
      title, body, reference_table, reference_id
    ) VALUES (
      v_tenant_id,
      v_faculty_id,
      'system',
      'تسليم جديد من طالب',
      'قام ' || COALESCE(v_student_name, 'طالب') || ' بتسليم التكليف: ' || COALESCE(v_assignment_title, ''),
      'assignments',
      NEW.assignment_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_faculty_on_submission
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_faculty_on_submission();

-- 2. notify_new_assignment — students get notified when an assignment is published
--    Old: WHERE e.section_id = NEW.section_id
--    New: WHERE e.course_id = NEW.course_id AND group filters
DROP TRIGGER IF EXISTS trg_notify_new_assignment ON assignments;

CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
    SELECT NEW.tenant_id, e.student_id, 'assignment_due',
      'تكليف جديد', 'تم نشر تكليف جديد: ' || NEW.title,
      'assignments', NEW.id
    FROM enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.status = 'enrolled'
      AND (NEW.major_id IS NULL OR e.major_id = NEW.major_id)
      AND (NEW.academic_level_id IS NULL OR e.academic_level_id = NEW.academic_level_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_assignment
  AFTER INSERT OR UPDATE OF is_published ON assignments
  FOR EACH ROW EXECUTE FUNCTION notify_new_assignment();

-- 3. notify_new_material — students get notified when course material is published
--    Old: WHERE e.section_id = NEW.section_id
--    New: WHERE e.course_id = NEW.course_id AND group filters
DROP TRIGGER IF EXISTS trg_notify_new_material ON course_materials;

CREATE OR REPLACE FUNCTION notify_new_material()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
    SELECT NEW.tenant_id, e.student_id, 'system',
      'محتوى تعليمي جديد', 'تم نشر محتوى جديد: ' || NEW.title,
      'course_materials', NEW.id
    FROM enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.status = 'enrolled'
      AND (NEW.major_id IS NULL OR e.major_id = NEW.major_id)
      AND (NEW.academic_level_id IS NULL OR e.academic_level_id = NEW.academic_level_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_material
  AFTER INSERT OR UPDATE OF is_published ON course_materials
  FOR EACH ROW EXECUTE FUNCTION notify_new_material();

DO $$
BEGIN
    RAISE NOTICE 'Migration 25 complete: fixed notification triggers for course-group schema';
END $$;
