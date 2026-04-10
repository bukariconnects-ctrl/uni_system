-- Fix: Allow trigger to insert into channel_members by making the function SECURITY DEFINER
-- This bypasses RLS when the trigger runs

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_add_to_course_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    IF NEW.status = 'enrolled' THEN
        SELECT ch.id INTO v_channel_id
        FROM channels ch
        JOIN sections s ON ch.section_id = s.id
        WHERE s.id = NEW.section_id
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
            VALUES (NEW.tenant_id, v_channel_id, NEW.student_id, FALSE)
            ON CONFLICT (channel_id, profile_id) DO NOTHING;
        END IF;
    ELSIF NEW.status = 'dropped' THEN
        SELECT ch.id INTO v_channel_id
        FROM channels ch
        JOIN sections s ON ch.section_id = s.id
        WHERE s.id = NEW.section_id
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            DELETE FROM channel_members
            WHERE channel_id = v_channel_id AND profile_id = NEW.student_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Also add an INSERT policy for academic_management to insert channel members
DROP POLICY IF EXISTS "admin_insert_channel_members" ON channel_members;
CREATE POLICY "admin_insert_channel_members"
    ON channel_members FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
    );

-- Add DELETE policy for academic_management
DROP POLICY IF EXISTS "admin_delete_channel_members" ON channel_members;
CREATE POLICY "admin_delete_channel_members"
    ON channel_members FOR DELETE
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
    );
