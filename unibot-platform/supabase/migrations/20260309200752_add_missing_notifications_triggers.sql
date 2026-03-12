-- Hotfix: Add missing notification triggers for materials, assignments, grades, and direct messages

-- 1. Notify on new published material
CREATE OR REPLACE FUNCTION notify_new_material() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        SELECT NEW.tenant_id, e.student_id, 'system', 'محتوى تعليمي جديد', 'تم نشر محتوى جديد: ' || NEW.title, 'course_materials', NEW.id
        FROM enrollments e WHERE e.section_id = NEW.section_id AND e.status = 'enrolled';
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_material AFTER UPDATE ON course_materials FOR EACH ROW EXECUTE FUNCTION notify_new_material();

-- 2. Notify on new published assignment
CREATE OR REPLACE FUNCTION notify_new_assignment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        SELECT NEW.tenant_id, e.student_id, 'assignment_due', 'تكليف جديد مطلوب', 'تم نشر تكليف جديد: ' || NEW.title, 'assignments', NEW.id
        FROM enrollments e WHERE e.section_id = NEW.section_id AND e.status = 'enrolled';
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_assignment AFTER UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION notify_new_assignment();

-- 3. Notify on published grades
CREATE OR REPLACE FUNCTION notify_grades_published() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (NEW.tenant_id, NEW.student_id, 'grade_released', 'تم رصد الدرجات', 'تم اعتماد ونشر درجاتك في سجل الدرجات.', 'gradebook_entries', NEW.id);
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_grades_published AFTER UPDATE ON gradebook_entries FOR EACH ROW EXECUTE FUNCTION notify_grades_published();

-- 4. Notify on direct messages
CREATE OR REPLACE FUNCTION notify_new_direct_message() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_recipient_id UUID;
BEGIN
    IF NEW.message_type = 'direct' AND NEW.conversation_id IS NOT NULL THEN
        SELECT CASE WHEN participant_a = NEW.sender_id THEN participant_b ELSE participant_a END INTO v_recipient_id
        FROM conversations WHERE id = NEW.conversation_id;
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (NEW.tenant_id, v_recipient_id, 'system', 'رسالة جديدة', 'لديك رسالة مباشرة جديدة.', 'messages', NEW.id);
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_direct_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_new_direct_message();
