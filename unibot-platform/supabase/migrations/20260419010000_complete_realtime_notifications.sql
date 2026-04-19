-- ============================================================
-- Complete Real-Time Notifications System
-- Covers: submissions, grading, circulars, attendance alerts
-- ============================================================

-- Enable realtime for all key tables (safe — skips if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE course_materials;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE circulars;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gradebook_entries;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance_summaries;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================
-- 1. Notify the FACULTY when a student submits an assignment
-- ============================================================
CREATE OR REPLACE FUNCTION notify_faculty_on_submission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_faculty_id    UUID;
  v_student_name  TEXT;
  v_assignment_title TEXT;
  v_tenant_id     UUID;
BEGIN
  -- Get faculty (instructor) for the assignment's section
  SELECT a.tenant_id, a.title, s.instructor_id
  INTO v_tenant_id, v_assignment_title, v_faculty_id
  FROM assignments a
  JOIN sections s ON s.id = a.section_id
  WHERE a.id = NEW.assignment_id;

  -- Get student name
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

DROP TRIGGER IF EXISTS trg_notify_faculty_on_submission ON submissions;
CREATE TRIGGER trg_notify_faculty_on_submission
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_faculty_on_submission();

-- ============================================================
-- 2. Notify the STUDENT when their submission is graded
-- ============================================================
CREATE OR REPLACE FUNCTION notify_student_on_grading()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_assignment_title TEXT;
  v_tenant_id       UUID;
BEGIN
  -- Only trigger when status changes TO 'graded'
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status <> 'graded') THEN
    SELECT a.title, a.tenant_id
    INTO v_assignment_title, v_tenant_id
    FROM assignments a WHERE a.id = NEW.assignment_id;

    INSERT INTO notifications (
      tenant_id, recipient_id, notification_type,
      title, body, reference_table, reference_id
    ) VALUES (
      v_tenant_id,
      NEW.student_id,
      'grade_released',
      'تم تصحيح تكليفك',
      'تم تصحيح تكليف "' || COALESCE(v_assignment_title, '') || '"' ||
        CASE WHEN NEW.grade IS NOT NULL
          THEN '. درجتك: ' || NEW.grade::TEXT
          ELSE ''
        END,
      'assignments',
      NEW.assignment_id
    );
  END IF;

  -- Notify student if resubmission is requested
  IF NEW.status = 'resubmit_requested' AND (OLD.status IS NULL OR OLD.status <> 'resubmit_requested') THEN
    SELECT a.title, a.tenant_id
    INTO v_assignment_title, v_tenant_id
    FROM assignments a WHERE a.id = NEW.assignment_id;

    INSERT INTO notifications (
      tenant_id, recipient_id, notification_type,
      title, body, reference_table, reference_id
    ) VALUES (
      v_tenant_id,
      NEW.student_id,
      'system',
      'مطلوب إعادة تسليم',
      'يرجى إعادة تسليم تكليف: ' || COALESCE(v_assignment_title, ''),
      'assignments',
      NEW.assignment_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_grading ON submissions;
CREATE TRIGGER trg_notify_student_on_grading
  AFTER UPDATE OF status, grade ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_student_on_grading();

-- ============================================================
-- 3. Notify students when a CIRCULAR is published
--    (Covers: target_type = all | students | section)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_circular_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Only fire when is_published transitions FALSE → TRUE
  IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN

    SELECT first_name || ' ' || last_name INTO v_sender_name
    FROM profiles WHERE id = NEW.created_by;

    IF NEW.target_type = 'all' THEN
      -- All enrolled students in the tenant
      INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
      SELECT NEW.tenant_id, p.id, 'circular',
        'تعميم جديد', COALESCE(v_sender_name,'') || ': ' || NEW.title,
        'circulars', NEW.id
      FROM profiles p
      WHERE p.tenant_id = NEW.tenant_id
        AND p.role IN ('student','faculty')
        AND p.id <> NEW.created_by;

    ELSIF NEW.target_type = 'students' THEN
      -- All students enrolled in sections taught by this faculty
      INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
      SELECT DISTINCT NEW.tenant_id, e.student_id, 'circular',
        'تعميم جديد من محاضرك', COALESCE(v_sender_name,'') || ': ' || NEW.title,
        'circulars', NEW.id
      FROM sections s
      JOIN enrollments e ON e.section_id = s.id AND e.status = 'enrolled'
      WHERE s.instructor_id = NEW.created_by
        AND s.tenant_id = NEW.tenant_id;

    ELSIF NEW.target_type = 'faculty' THEN
      -- All faculty in tenant
      INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
      SELECT NEW.tenant_id, p.id, 'circular',
        'تعميم جديد', COALESCE(v_sender_name,'') || ': ' || NEW.title,
        'circulars', NEW.id
      FROM profiles p
      WHERE p.tenant_id = NEW.tenant_id
        AND p.role = 'faculty'
        AND p.id <> NEW.created_by;

    ELSIF NEW.target_type = 'section' AND NEW.target_id IS NOT NULL THEN
      -- Only students in that specific section
      INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
      SELECT NEW.tenant_id, e.student_id, 'circular',
        'تعميم لشعبتك', COALESCE(v_sender_name,'') || ': ' || NEW.title,
        'circulars', NEW.id
      FROM enrollments e
      WHERE e.section_id = NEW.target_id
        AND e.status = 'enrolled';
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_circular_published ON circulars;
CREATE TRIGGER trg_notify_circular_published
  AFTER UPDATE OF is_published ON circulars
  FOR EACH ROW EXECUTE FUNCTION notify_circular_published();

-- Also handle INSERT when circular is published directly
DROP TRIGGER IF EXISTS trg_notify_circular_inserted ON circulars;
CREATE TRIGGER trg_notify_circular_inserted
  AFTER INSERT ON circulars
  FOR EACH ROW EXECUTE FUNCTION notify_circular_published();

-- ============================================================
-- 4. Re-create assignment notification to also handle INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trg_notify_new_assignment ON assignments;
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
    SELECT NEW.tenant_id, e.student_id, 'assignment_due',
      'تكليف جديد', 'تم نشر تكليف جديد: ' || NEW.title,
      'assignments', NEW.id
    FROM enrollments e WHERE e.section_id = NEW.section_id AND e.status = 'enrolled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_assignment
  AFTER INSERT OR UPDATE OF is_published ON assignments
  FOR EACH ROW EXECUTE FUNCTION notify_new_assignment();

-- ============================================================
-- 5. Re-create material notification to handle INSERT too
-- ============================================================
DROP TRIGGER IF EXISTS trg_notify_new_material ON course_materials;
CREATE OR REPLACE FUNCTION notify_new_material()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
    SELECT NEW.tenant_id, e.student_id, 'system',
      'محتوى تعليمي جديد', 'تم نشر محتوى جديد: ' || NEW.title,
      'course_materials', NEW.id
    FROM enrollments e WHERE e.section_id = NEW.section_id AND e.status = 'enrolled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_material
  AFTER INSERT OR UPDATE OF is_published ON course_materials
  FOR EACH ROW EXECUTE FUNCTION notify_new_material();
