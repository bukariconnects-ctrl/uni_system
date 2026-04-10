-- Fix: Add instructor to course channel as admin when channel is created
-- Also add settings columns for channel permissions

-- Add settings columns to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS allow_student_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Update the auto_create_course_channel function to also add instructor as admin
CREATE OR REPLACE FUNCTION auto_create_course_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_name VARCHAR(255);
    v_semester_name VARCHAR(100);
    v_channel_id UUID;
BEGIN
    SELECT c.name, s.name
    INTO v_course_name, v_semester_name
    FROM courses c
    JOIN semesters s ON s.id = NEW.semester_id
    WHERE c.id = NEW.course_id;

    -- Create the channel
    INSERT INTO channels (tenant_id, section_id, name, channel_type, created_by)
    VALUES (
        NEW.tenant_id,
        NEW.id,
        v_course_name || ' - ' || NEW.section_code || ' (' || v_semester_name || ')',
        'course',
        NEW.instructor_id
    )
    RETURNING id INTO v_channel_id;

    -- Add instructor as admin member of the channel
    IF NEW.instructor_id IS NOT NULL AND v_channel_id IS NOT NULL THEN
        INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
        VALUES (NEW.tenant_id, v_channel_id, NEW.instructor_id, TRUE)
        ON CONFLICT (channel_id, profile_id) DO UPDATE SET is_admin = TRUE;
    END IF;

    RETURN NEW;
END;
$$;

-- Also add instructor when section's instructor_id is updated
CREATE OR REPLACE FUNCTION update_channel_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    -- Only proceed if instructor_id changed
    IF OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
        -- Find the channel for this section
        SELECT id INTO v_channel_id
        FROM channels
        WHERE section_id = NEW.id AND channel_type = 'course'
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            -- Remove old instructor from channel (if they were admin)
            IF OLD.instructor_id IS NOT NULL THEN
                DELETE FROM channel_members
                WHERE channel_id = v_channel_id AND profile_id = OLD.instructor_id AND is_admin = TRUE;
            END IF;

            -- Add new instructor as admin
            IF NEW.instructor_id IS NOT NULL THEN
                INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
                VALUES (NEW.tenant_id, v_channel_id, NEW.instructor_id, TRUE)
                ON CONFLICT (channel_id, profile_id) DO UPDATE SET is_admin = TRUE;
            END IF;

            -- Update channel created_by
            UPDATE channels SET created_by = NEW.instructor_id WHERE id = v_channel_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_channel_instructor ON sections;
CREATE TRIGGER trg_update_channel_instructor
    AFTER UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_channel_instructor();

-- Backfill: Add existing instructors to their section channels
INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
SELECT DISTINCT c.tenant_id, c.id, s.instructor_id, TRUE
FROM channels c
JOIN sections s ON c.section_id = s.id
WHERE c.channel_type = 'course'
  AND s.instructor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = c.id AND cm.profile_id = s.instructor_id
  );

-- Update existing channel members to set instructor as admin
UPDATE channel_members cm
SET is_admin = TRUE
FROM channels c
JOIN sections s ON c.section_id = s.id
WHERE cm.channel_id = c.id
  AND cm.profile_id = s.instructor_id
  AND c.channel_type = 'course';

-- Add RLS policy for faculty to manage their channel settings
DROP POLICY IF EXISTS "faculty_manage_own_channels" ON channels;
CREATE POLICY "faculty_manage_own_channels"
    ON channels FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND section_id IN (
            SELECT id FROM sections WHERE instructor_id = current_profile_id()
        )
    );
