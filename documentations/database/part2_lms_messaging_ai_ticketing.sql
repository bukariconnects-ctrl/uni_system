-- ============================================================
-- UniBot Platform - Database Schema Part 2
-- LMS & Attendance, Messaging, Circulars, AI/Vector DB,
-- Analytics, Ticketing, pg_cron Jobs, Webhooks/Triggers, RLS
-- ============================================================


-- ============================================================
-- SECTION 7: LMS & ATTENDANCE SYSTEM (SR-3, FR-FM1–FR-FM3, FR-ST2–FR-ST3)
-- ============================================================

-- 7.1 Course Materials (FR-FM1.2, FR-FM1.3)
CREATE TABLE course_materials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id      UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    uploaded_by     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    content_type    content_type NOT NULL DEFAULT 'document',
    file_url        TEXT,
    file_size_bytes BIGINT,
    week_number     INT,
    is_ai_approved  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_published    BOOLEAN      NOT NULL DEFAULT FALSE,
    view_count      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_course_materials_updated_at
    BEFORE UPDATE ON course_materials
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_course_materials_tenant_id   ON course_materials(tenant_id);
CREATE INDEX idx_course_materials_section_id  ON course_materials(section_id);
CREATE INDEX idx_course_materials_ai_approved ON course_materials(is_ai_approved) WHERE is_ai_approved = TRUE;

-- 7.2 Assignments (FR-FM2.1, FR-ST2.2)
CREATE TABLE assignments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id       UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_by       UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    max_grade        NUMERIC(6,2) NOT NULL DEFAULT 100,
    due_date         TIMESTAMPTZ  NOT NULL,
    allow_late       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_published     BOOLEAN      NOT NULL DEFAULT FALSE,
    week_number      INT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_assignments_tenant_id  ON assignments(tenant_id);
CREATE INDEX idx_assignments_section_id ON assignments(section_id);
CREATE INDEX idx_assignments_due_date   ON assignments(due_date);

-- 7.3 Assignment Submissions (FR-ST2.2, FR-FM2.2)
CREATE TABLE submissions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id    UUID              NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id       UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_url         TEXT,
    text_content     TEXT,
    status           submission_status NOT NULL DEFAULT 'submitted',
    submitted_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    grade            NUMERIC(6,2),
    feedback         TEXT,
    graded_at        TIMESTAMPTZ,
    graded_by        UUID              REFERENCES profiles(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (assignment_id, student_id)
);

CREATE TRIGGER trg_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_submissions_tenant_id     ON submissions(tenant_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id    ON submissions(student_id);

-- 7.4 Gradebook (FR-FM2.3, FR-ST2.3)
CREATE TABLE gradebook_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    enrollment_id   UUID         NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    section_id      UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coursework_grade NUMERIC(6,2),
    midterm_grade   NUMERIC(6,2),
    final_grade     NUMERIC(6,2),
    total_grade     NUMERIC(6,2) GENERATED ALWAYS AS (
                        COALESCE(coursework_grade, 0) * 0.30 +
                        COALESCE(midterm_grade, 0) * 0.30 +
                        COALESCE(final_grade, 0) * 0.40
                    ) STORED,
    is_published    BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    recorded_by     UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (enrollment_id)
);

CREATE TRIGGER trg_gradebook_entries_updated_at
    BEFORE UPDATE ON gradebook_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_gradebook_tenant_id   ON gradebook_entries(tenant_id);
CREATE INDEX idx_gradebook_section_id  ON gradebook_entries(section_id);
CREATE INDEX idx_gradebook_student_id  ON gradebook_entries(student_id);

-- Trigger: auto-update enrollment.final_grade when gradebook is published
CREATE OR REPLACE FUNCTION sync_enrollment_final_grade()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
        UPDATE enrollments
        SET final_grade  = NEW.total_grade,
            letter_grade = CASE
                WHEN NEW.total_grade >= 90 THEN 'A+'
                WHEN NEW.total_grade >= 85 THEN 'A'
                WHEN NEW.total_grade >= 80 THEN 'B+'
                WHEN NEW.total_grade >= 75 THEN 'B'
                WHEN NEW.total_grade >= 70 THEN 'C+'
                WHEN NEW.total_grade >= 65 THEN 'C'
                WHEN NEW.total_grade >= 60 THEN 'D+'
                WHEN NEW.total_grade >= 55 THEN 'D'
                ELSE 'F'
            END
        WHERE id = NEW.enrollment_id;

        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_final_grade
    BEFORE UPDATE ON gradebook_entries
    FOR EACH ROW EXECUTE FUNCTION sync_enrollment_final_grade();

-- 7.5 Attendance Sessions (FR-FM3.1, FR-FM3.2)
CREATE TABLE attendance_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id      UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    schedule_id     UUID         REFERENCES schedules(id) ON DELETE SET NULL,
    session_date    DATE         NOT NULL,
    start_time      TIME         NOT NULL,
    end_time        TIME,
    qr_code         TEXT,
    qr_expires_at   TIMESTAMPTZ,
    geo_latitude    NUMERIC(10,7),
    geo_longitude   NUMERIC(10,7),
    geo_radius_m    INT          DEFAULT 100,
    is_open         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (section_id, session_date, start_time)
);

CREATE TRIGGER trg_attendance_sessions_updated_at
    BEFORE UPDATE ON attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_att_sessions_tenant_id   ON attendance_sessions(tenant_id);
CREATE INDEX idx_att_sessions_section_id  ON attendance_sessions(section_id);
CREATE INDEX idx_att_sessions_date        ON attendance_sessions(session_date);

-- 7.6 Attendance Records (FR-FM3.1, FR-FM3.3, FR-ST3.1, FR-ST3.2)
CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id      UUID              NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id      UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    section_id      UUID              NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    status          attendance_status NOT NULL DEFAULT 'absent',
    check_in_time   TIMESTAMPTZ,
    method          VARCHAR(30),
    modified_by     UUID              REFERENCES profiles(id) ON DELETE SET NULL,
    modified_at     TIMESTAMPTZ,
    modification_reason TEXT,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, student_id)
);

CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_att_records_tenant_id   ON attendance_records(tenant_id);
CREATE INDEX idx_att_records_session_id  ON attendance_records(session_id);
CREATE INDEX idx_att_records_student_id  ON attendance_records(student_id);
CREATE INDEX idx_att_records_section_id  ON attendance_records(section_id);

-- 7.7 Attendance Summary (computed, refreshed by trigger — FR-ST3.2, FR-AM3.3)
CREATE TABLE attendance_summaries (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    enrollment_id        UUID         NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id           UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    section_id           UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    total_sessions       INT          NOT NULL DEFAULT 0,
    attended_sessions    INT          NOT NULL DEFAULT 0,
    excused_absences     INT          NOT NULL DEFAULT 0,
    unexcused_absences   INT          NOT NULL DEFAULT 0,
    late_count           INT          NOT NULL DEFAULT 0,
    absence_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_dismissed         BOOLEAN      NOT NULL DEFAULT FALSE,
    dismissed_at         TIMESTAMPTZ,
    last_updated         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (enrollment_id)
);

CREATE INDEX idx_att_summaries_tenant_id   ON attendance_summaries(tenant_id);
CREATE INDEX idx_att_summaries_student_id  ON attendance_summaries(student_id);
CREATE INDEX idx_att_summaries_section_id  ON attendance_summaries(section_id);

-- Trigger: recalculate attendance summary after each record change
CREATE OR REPLACE FUNCTION recalculate_attendance_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_enrollment_id      UUID;
    v_tenant_id          UUID;
    v_total              INT;
    v_attended           INT;
    v_excused            INT;
    v_unexcused          INT;
    v_late               INT;
    v_pct                NUMERIC(5,2);
    v_threshold          NUMERIC(5,2);
    v_is_dismissed       BOOLEAN;
    v_dismissed_at       TIMESTAMPTZ;
BEGIN
    SELECT e.id, e.tenant_id
    INTO v_enrollment_id, v_tenant_id
    FROM enrollments e
    WHERE e.student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND e.section_id = COALESCE(NEW.section_id, OLD.section_id)
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'present'),
        COUNT(*) FILTER (WHERE ar.status = 'excused'),
        COUNT(*) FILTER (WHERE ar.status = 'absent'),
        COUNT(*) FILTER (WHERE ar.status = 'late')
    INTO v_total, v_attended, v_excused, v_unexcused, v_late
    FROM attendance_records ar
    WHERE ar.section_id = COALESCE(NEW.section_id, OLD.section_id)
      AND ar.student_id = COALESCE(NEW.student_id, OLD.student_id);

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((v_unexcused::NUMERIC / v_total) * 100, 2)
                  ELSE 0 END;

    SELECT COALESCE(t.absence_threshold, 25)
    INTO v_threshold
    FROM tenants t WHERE t.id = v_tenant_id;

    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    IF v_pct >= v_threshold AND NOT COALESCE(v_is_dismissed, FALSE) THEN
        v_is_dismissed := TRUE;
        v_dismissed_at := NOW();
        UPDATE enrollments SET status = 'dismissed' WHERE id = v_enrollment_id;
    END IF;

    INSERT INTO attendance_summaries (
        tenant_id, enrollment_id, student_id, section_id,
        total_sessions, attended_sessions, excused_absences,
        unexcused_absences, late_count, absence_percentage,
        is_dismissed, dismissed_at, last_updated
    ) VALUES (
        v_tenant_id, v_enrollment_id,
        COALESCE(NEW.student_id, OLD.student_id),
        COALESCE(NEW.section_id, OLD.section_id),
        v_total, v_attended, v_excused, v_unexcused, v_late,
        v_pct, COALESCE(v_is_dismissed, FALSE), v_dismissed_at, NOW()
    )
    ON CONFLICT (enrollment_id) DO UPDATE SET
        total_sessions     = EXCLUDED.total_sessions,
        attended_sessions  = EXCLUDED.attended_sessions,
        excused_absences   = EXCLUDED.excused_absences,
        unexcused_absences = EXCLUDED.unexcused_absences,
        late_count         = EXCLUDED.late_count,
        absence_percentage = EXCLUDED.absence_percentage,
        is_dismissed       = EXCLUDED.is_dismissed,
        dismissed_at       = COALESCE(attendance_summaries.dismissed_at, EXCLUDED.dismissed_at),
        last_updated       = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_attendance_summary
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION recalculate_attendance_summary();


-- ============================================================
-- SECTION 8: MESSAGING & INTERACTION SYSTEM (SR-4, FR-FM4, FR-ST4)
-- ============================================================

-- 8.1 Conversations (Direct Messages — FR-ST4.1)
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    participant_a   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_b   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, participant_a, participant_b),
    CONSTRAINT chk_no_self_conversation CHECK (participant_a <> participant_b)
);

CREATE INDEX idx_conversations_tenant_id     ON conversations(tenant_id);
CREATE INDEX idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b);

-- 8.2 Channels (Course group channels, department, announcement — SR-4, FR-FM4.1)
CREATE TABLE channels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id      UUID         REFERENCES sections(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    channel_type    channel_type NOT NULL DEFAULT 'course',
    is_readonly     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_channels_tenant_id   ON channels(tenant_id);
CREATE INDEX idx_channels_section_id  ON channels(section_id);

-- Auto-create course channel when a section is created
CREATE OR REPLACE FUNCTION auto_create_course_channel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_course_name VARCHAR(255);
    v_semester_name VARCHAR(100);
BEGIN
    SELECT c.name, s.name
    INTO v_course_name, v_semester_name
    FROM courses c
    JOIN semesters s ON s.id = NEW.semester_id
    WHERE c.id = NEW.course_id;

    INSERT INTO channels (tenant_id, section_id, name, channel_type, created_by)
    VALUES (
        NEW.tenant_id,
        NEW.id,
        v_course_name || ' - ' || NEW.section_code || ' (' || v_semester_name || ')',
        'course',
        NEW.instructor_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_course_channel
    AFTER INSERT ON sections
    FOR EACH ROW EXECUTE FUNCTION auto_create_course_channel();

-- 8.3 Channel Members (FR-FM4.1)
CREATE TABLE channel_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id  UUID        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    muted_until TIMESTAMPTZ,

    UNIQUE (channel_id, profile_id)
);

CREATE INDEX idx_channel_members_channel_id  ON channel_members(channel_id);
CREATE INDEX idx_channel_members_profile_id  ON channel_members(profile_id);

-- Auto-add student to course channel on enrollment
CREATE OR REPLACE FUNCTION auto_add_to_course_channel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    IF NEW.status = 'enrolled' THEN
        SELECT id INTO v_channel_id
        FROM channels WHERE section_id = NEW.section_id AND channel_type = 'course'
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
            VALUES (NEW.tenant_id, v_channel_id, NEW.student_id, FALSE)
            ON CONFLICT (channel_id, profile_id) DO NOTHING;
        END IF;
    ELSIF NEW.status IN ('dropped', 'dismissed', 'withdrawn') THEN
        SELECT id INTO v_channel_id
        FROM channels WHERE section_id = NEW.section_id AND channel_type = 'course'
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            DELETE FROM channel_members
            WHERE channel_id = v_channel_id AND profile_id = NEW.student_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_channel_membership
    AFTER INSERT OR UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION auto_add_to_course_channel();

-- 8.4 Messages (Direct + Channel — FR-ST4.1, FR-FM4.1, FR-ST4.2)
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_type    message_type   NOT NULL DEFAULT 'direct',
    conversation_id UUID           REFERENCES conversations(id) ON DELETE CASCADE,
    channel_id      UUID           REFERENCES channels(id) ON DELETE CASCADE,
    sender_id       UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body            TEXT,
    is_pinned       BOOLEAN        NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN        NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID           REFERENCES profiles(id) ON DELETE SET NULL,
    reply_to_id     UUID           REFERENCES messages(id) ON DELETE SET NULL,
    status          message_status NOT NULL DEFAULT 'sent',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_message_target CHECK (
        (message_type = 'direct' AND conversation_id IS NOT NULL AND channel_id IS NULL) OR
        (message_type = 'channel' AND channel_id IS NOT NULL AND conversation_id IS NULL)
    )
);

CREATE TRIGGER trg_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_messages_tenant_id       ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_channel_id      ON messages(channel_id);
CREATE INDEX idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX idx_messages_created_at      ON messages(created_at DESC);

-- Update conversation.last_message_at on new direct message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE conversations SET last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 8.5 Message Attachments (FR-ST4.1, FR-ST4.2 — security constraint enforced at app level + DB level)
CREATE TABLE message_attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id      UUID         NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    is_safe         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_executable CHECK (
        mime_type NOT IN (
            'application/x-msdownload',
            'application/x-executable',
            'application/x-bat',
            'application/x-sh'
        )
    )
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);


-- ============================================================
-- SECTION 9: SMART CIRCULARS & NOTIFICATIONS (SR-5, FR-AM4, FR-TA6.1)
-- ============================================================

-- 9.1 Circulars (FR-AM4.1, FR-TA6.1, FR-SA3.4)
CREATE TABLE circulars (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID                  REFERENCES tenants(id) ON DELETE CASCADE,
    -- NULL tenant_id = platform-wide from super admin
    created_by       UUID                  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title            VARCHAR(500)          NOT NULL,
    body             TEXT                  NOT NULL,
    target_type      circular_target_type  NOT NULL DEFAULT 'all',
    target_id        UUID,
    -- points to college_id / department_id / major_id / section_id depending on target_type
    is_mandatory     BOOLEAN               NOT NULL DEFAULT FALSE,
    is_published     BOOLEAN               NOT NULL DEFAULT FALSE,
    published_at     TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_circulars_updated_at
    BEFORE UPDATE ON circulars
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_circulars_tenant_id ON circulars(tenant_id);
CREATE INDEX idx_circulars_target    ON circulars(target_type, target_id);

-- 9.2 Notifications (FR-ST3.2, FR-AM3.3, FR-AM6.1 — automated alerts)
CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_id     UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title            VARCHAR(500)       NOT NULL,
    body             TEXT,
    is_read          BOOLEAN            NOT NULL DEFAULT FALSE,
    read_at          TIMESTAMPTZ,
    reference_table  VARCHAR(100),
    reference_id     UUID,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant_id    ON notifications(tenant_id);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read      ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at   ON notifications(created_at DESC);

-- Trigger: fire absence_warning notification when student hits 50% of threshold
CREATE OR REPLACE FUNCTION notify_absence_warning()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_threshold   NUMERIC(5,2);
    v_warning_pct NUMERIC(5,2);
    v_name        TEXT;
BEGIN
    SELECT t.absence_threshold INTO v_threshold
    FROM tenants t
    JOIN enrollments e ON e.id = NEW.enrollment_id
    WHERE t.id = NEW.tenant_id
    LIMIT 1;

    v_warning_pct := v_threshold * 0.7;

    IF NEW.absence_percentage >= v_threshold AND
       (OLD.absence_percentage IS NULL OR OLD.absence_percentage < v_threshold) THEN
        SELECT first_name || ' ' || last_name INTO v_name FROM profiles WHERE id = NEW.student_id;
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id, NEW.student_id, 'absence_dismissal',
            'تنبيه: تجاوزت نسبة الغياب المسموح بها',
            'لقد تجاوزت نسبة غيابك الحد المقرر (' || v_threshold || '%) وقد تكون عرضة للحرمان.',
            'attendance_summaries', NEW.id
        );
    ELSIF NEW.absence_percentage >= v_warning_pct AND
          (OLD.absence_percentage IS NULL OR OLD.absence_percentage < v_warning_pct) THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id, NEW.student_id, 'absence_warning',
            'تحذير: اقتراب من حد الغياب',
            'نسبة غيابك اقتربت من الحد المسموح به (' || v_threshold || '%). تنبّه!',
            'attendance_summaries', NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_absence_warning
    AFTER INSERT OR UPDATE ON attendance_summaries
    FOR EACH ROW EXECUTE FUNCTION notify_absence_warning();


-- ============================================================
-- SECTION 10: AI / VECTOR DB (SR-6, FR-FM1.3, FR-TA5, FR-ST5)
-- ============================================================

-- 10.1 AI Knowledge Base Documents (FR-TA5.1, FR-TA5.2, FR-FM1.3)
CREATE TABLE ai_knowledge_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id      UUID               REFERENCES sections(id) ON DELETE CASCADE,
    -- NULL section_id = university-wide regulation doc (uploaded by TA)
    material_id     UUID               REFERENCES course_materials(id) ON DELETE SET NULL,
    uploaded_by     UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           VARCHAR(500)       NOT NULL,
    doc_type        ai_document_type   NOT NULL DEFAULT 'other',
    file_url        TEXT,
    is_active       BOOLEAN            NOT NULL DEFAULT TRUE,
    total_chunks    INT                NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ai_docs_updated_at
    BEFORE UPDATE ON ai_knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_ai_docs_tenant_id   ON ai_knowledge_documents(tenant_id);
CREATE INDEX idx_ai_docs_section_id  ON ai_knowledge_documents(section_id);

-- 10.2 AI Document Chunks + Embeddings via pgvector (FR-ST5.1, FR-ST5.2, NFR-SEC3)
CREATE TABLE ai_document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id     UUID         NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
    chunk_index     INT          NOT NULL,
    content         TEXT         NOT NULL,
    page_number     INT,
    timestamp_sec   INT,
    -- For videos: second marker; for PDFs: page number
    embedding       vector(1536),
    -- OpenAI text-embedding-3-small output dimension
    token_count     INT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_chunks_tenant_id    ON ai_document_chunks(tenant_id);
CREATE INDEX idx_chunks_document_id  ON ai_document_chunks(document_id);
-- HNSW index for fast approximate nearest-neighbor semantic search (better performance than IVFFlat)
CREATE INDEX idx_chunks_embedding ON ai_document_chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 10.3 Chatbot Conversations (FR-ST5.1, FR-ST5.2, FR-ST5.3)
CREATE TABLE chatbot_conversations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id   VARCHAR(100),
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at     TIMESTAMPTZ
);

CREATE INDEX idx_chatbot_conv_tenant_id ON chatbot_conversations(tenant_id);
CREATE INDEX idx_chatbot_conv_user_id   ON chatbot_conversations(user_id);

-- 10.4 Chatbot Messages (FR-ST5.1–FR-ST5.3)
CREATE TABLE chatbot_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID        NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT        NOT NULL,
    source_chunk_ids UUID[]     DEFAULT '{}',
    -- chunk IDs used to answer the query (for citation)
    token_usage     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chatbot_msgs_conv_id   ON chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_msgs_tenant_id ON chatbot_messages(tenant_id);

-- 10.5 Student Recommendations from AI (FR-FM5.2, FR-AM6.1, FR-ST5.3)
CREATE TABLE student_recommendations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    section_id      UUID         REFERENCES sections(id) ON DELETE SET NULL,
    sent_by         UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    -- NULL = system-generated; set = manually by instructor
    title           VARCHAR(500) NOT NULL,
    body            TEXT         NOT NULL,
    material_url    TEXT,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_tenant_id  ON student_recommendations(tenant_id);
CREATE INDEX idx_recommendations_student_id ON student_recommendations(student_id);

-- 10.6 AI Token Usage (FR-SA4.2)
CREATE TABLE ai_token_usage (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    model        VARCHAR(100),
    prompt_tokens   INT      NOT NULL DEFAULT 0,
    completion_tokens INT    NOT NULL DEFAULT 0,
    total_tokens INT         NOT NULL DEFAULT 0,
    cost_usd     NUMERIC(12, 6) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_token_usage_tenant_id  ON ai_token_usage(tenant_id);
CREATE INDEX idx_ai_token_usage_created_at ON ai_token_usage(created_at DESC);


-- ============================================================
-- SECTION 11: ANALYTICS & PREDICTIVE (SR-7, FR-AM6, FR-FM5)
-- ============================================================

-- 11.1 Student Risk Scores (FR-AM6.1, FR-FM5.1, NFR-AI2)
-- This table is the materialized result of the daily pg_cron batch job
CREATE TABLE student_risk_scores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id          UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    section_id          UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    semester_id         UUID         NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    risk_level          risk_level   NOT NULL DEFAULT 'low',
    risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    absence_factor      NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    grade_factor        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    engagement_factor   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    alert_sent          BOOLEAN      NOT NULL DEFAULT FALSE,
    computed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (student_id, section_id, semester_id)
);

CREATE INDEX idx_risk_scores_tenant_id   ON student_risk_scores(tenant_id);
CREATE INDEX idx_risk_scores_student_id  ON student_risk_scores(student_id);
CREATE INDEX idx_risk_scores_risk_level  ON student_risk_scores(risk_level);

-- 11.2 Course Risk Flags (FR-AM6.2)
CREATE TABLE course_risk_flags (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id        UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    semester_id       UUID         NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    avg_risk_score    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    high_risk_count   INT          NOT NULL DEFAULT 0,
    failure_rate_pct  NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    engagement_drop   BOOLEAN      NOT NULL DEFAULT FALSE,
    flagged           BOOLEAN      NOT NULL DEFAULT FALSE,
    alert_sent        BOOLEAN      NOT NULL DEFAULT FALSE,
    computed_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (section_id, semester_id)
);

CREATE INDEX idx_course_risk_tenant_id  ON course_risk_flags(tenant_id);
CREATE INDEX idx_course_risk_section_id ON course_risk_flags(section_id);


-- ============================================================
-- SECTION 12: ACADEMIC TICKETING SYSTEM (SR-8, FR-AM5, FR-FM6, FR-ST6)
-- ============================================================

-- 12.1 Tickets (FR-ST6.1, FR-FM6.1, FR-AM5.1)
CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_number   VARCHAR(30)       NOT NULL,
    created_by      UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to     UUID              REFERENCES profiles(id) ON DELETE SET NULL,
    category        ticket_category   NOT NULL DEFAULT 'other',
    priority        ticket_priority   NOT NULL DEFAULT 'medium',
    status          ticket_status     NOT NULL DEFAULT 'open',
    title           VARCHAR(500)      NOT NULL,
    description     TEXT              NOT NULL,
    related_section_id UUID           REFERENCES sections(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    rating          SMALLINT          CHECK (rating BETWEEN 1 AND 5),
    ai_attempted    BOOLEAN           NOT NULL DEFAULT FALSE,
    ai_suggestion   TEXT,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, ticket_number)
);

CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tickets_tenant_id   ON tickets(tenant_id);
CREATE INDEX idx_tickets_created_by  ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_tickets_category    ON tickets(category);

-- Full Text Search Index for Tickets (fast title/description search)
ALTER TABLE tickets ADD COLUMN search_vector tsvector;
CREATE INDEX idx_tickets_search_vector ON tickets USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.ticket_number, '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_update_search_vector
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_ticket_search_vector();

-- Auto-generate sequential ticket number per tenant
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM tickets WHERE tenant_id = NEW.tenant_id;

    NEW.ticket_number := 'TKT-' || LPAD(v_count::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- 12.2 Ticket Messages / Thread (FR-AM5.2, FR-ST6.3, FR-FM6.2)
CREATE TABLE ticket_messages (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id    UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body         TEXT        NOT NULL,
    is_internal  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_msgs_tenant_id ON ticket_messages(tenant_id);
CREATE INDEX idx_ticket_msgs_ticket_id ON ticket_messages(ticket_id);

-- 12.3 Ticket Attachments (FR-ST6.1, FR-FM6.1)
CREATE TABLE ticket_attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id       UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);

-- 12.4 Approval Workflows (FR-AM5.4)
CREATE TABLE approval_workflows (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id        UUID              NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    approver_id      UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    step_order       INT               NOT NULL DEFAULT 1,
    status           approval_status   NOT NULL DEFAULT 'pending',
    decision_notes   TEXT,
    decided_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (ticket_id, step_order)
);

CREATE TRIGGER trg_approval_workflows_updated_at
    BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_approval_workflows_ticket_id   ON approval_workflows(ticket_id);
CREATE INDEX idx_approval_workflows_approver_id ON approval_workflows(approver_id);

-- Trigger: notify user on ticket status change (FR-AM5.5, FR-ST6.3)
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id,
            NEW.created_by,
            'ticket_update',
            'تحديث التذكرة: ' || NEW.ticket_number,
            'تم تغيير حالة تذكرتك إلى: ' || NEW.status,
            'tickets',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_status
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_status_change();


-- ============================================================
-- SECTION 13: pg_cron SCHEDULED JOBS (NFR-AI2, FR-SA2.2)
-- ============================================================

-- 13.1 Daily Student Risk Score Computation (NFR-AI2 — refresh every 24h)
-- The actual ML scoring is performed by an Edge Function; pg_cron calls it.
-- Here we schedule a DB-level refresh of student_profiles.risk_level from student_risk_scores.

CREATE OR REPLACE FUNCTION refresh_student_risk_levels()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE student_profiles sp
    SET risk_level      = srs.risk_level,
        risk_score      = srs.risk_score,
        risk_updated_at = NOW()
    FROM (
        SELECT DISTINCT ON (student_id)
               student_id, risk_level, risk_score
        FROM student_risk_scores
        ORDER BY student_id, computed_at DESC
    ) srs
    WHERE sp.profile_id = srs.student_id;
END;
$$;

SELECT cron.schedule(
    'refresh-student-risk-levels',
    '0 2 * * *',
    $$ SELECT refresh_student_risk_levels(); $$
);

-- 13.2 Daily: Alert instructors & management for high-risk students (FR-AM6.1, FR-FM5.1)
CREATE OR REPLACE FUNCTION send_risk_alerts()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
    SELECT DISTINCT ON (srs.section_id, srs.student_id)
        srs.tenant_id,
        sec.instructor_id,
        'risk_alert',
        'تحذير: طالب في منطقة الخطر',
        'الطالب ' || p.first_name || ' ' || p.last_name || ' في خطر أكاديمي عالٍ بمقرر ' || c.name,
        'student_risk_scores',
        srs.id
    FROM student_risk_scores srs
    JOIN sections sec ON sec.id = srs.section_id
    JOIN profiles p   ON p.id  = srs.student_id
    JOIN courses c    ON c.id  = sec.course_id
    WHERE srs.risk_level IN ('high', 'critical')
      AND srs.alert_sent = FALSE
      AND sec.instructor_id IS NOT NULL;

    UPDATE student_risk_scores
    SET alert_sent = TRUE
    WHERE risk_level IN ('high', 'critical') AND alert_sent = FALSE;
END;
$$;

SELECT cron.schedule(
    'send-risk-alerts',
    '30 2 * * *',
    $$ SELECT send_risk_alerts(); $$
);

-- 13.3 Monthly: Generate renewal invoices for expiring subscriptions (FR-SA2.2)
CREATE OR REPLACE FUNCTION generate_renewal_invoices()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO invoices (tenant_id, subscription_id, amount, currency, status, due_date)
    SELECT
        s.tenant_id,
        s.id,
        sp.price_monthly,
        'USD',
        'sent',
        s.end_date - INTERVAL '7 days'
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE s.status = 'active'
      AND s.auto_renew = TRUE
      AND s.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      AND NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.subscription_id = s.id
            AND i.status IN ('sent', 'paid')
            AND i.due_date >= NOW()
      );
END;
$$;

SELECT cron.schedule(
    'generate-renewal-invoices',
    '0 8 1 * *',
    $$ SELECT generate_renewal_invoices(); $$
);

-- 13.4 Weekly: Archive old chatbot conversations (data hygiene)
SELECT cron.schedule(
    'archive-old-chatbot-sessions',
    '0 3 * * 0',
    $$
        UPDATE chatbot_conversations
        SET is_active = FALSE, ended_at = NOW()
        WHERE is_active = TRUE
          AND created_at < NOW() - INTERVAL '90 days';
    $$
);


-- ============================================================
-- SECTION 14: ROW LEVEL SECURITY — Part 2 Tables
-- ============================================================

ALTER TABLE course_materials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summaries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_recommendations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage             ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_risk_flags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- LMS RLS
-- ---------------------------------------------------------------

-- course_materials: enrolled students read published; faculty write own section
CREATE POLICY "student_read_published_materials"
    ON course_materials FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND is_published = TRUE
        AND section_id IN (
            SELECT section_id FROM enrollments
            WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

CREATE POLICY "faculty_manage_own_materials"
    ON course_materials FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (current_user_role() = 'faculty' AND uploaded_by = current_profile_id())
        )
    );

-- assignments: same pattern as materials
CREATE POLICY "student_read_published_assignments"
    ON assignments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND is_published = TRUE
        AND section_id IN (
            SELECT section_id FROM enrollments
            WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

CREATE POLICY "faculty_manage_assignments"
    ON assignments FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (current_user_role() = 'faculty' AND created_by = current_profile_id())
        )
    );

-- submissions: students manage own; faculty read their section's
CREATE POLICY "student_manage_own_submissions"
    ON submissions FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND student_id = current_profile_id()
    );

CREATE POLICY "faculty_read_section_submissions"
    ON submissions FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND assignment_id IN (
            SELECT id FROM assignments
            WHERE section_id IN (
                SELECT id FROM sections WHERE instructor_id = current_profile_id()
            )
        )
    );

CREATE POLICY "faculty_grade_submissions"
    ON submissions FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND assignment_id IN (
            SELECT id FROM assignments
            WHERE section_id IN (
                SELECT id FROM sections WHERE instructor_id = current_profile_id()
            )
        )
    );

CREATE POLICY "admin_all_submissions"
    ON submissions FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- gradebook: students read own published grades
CREATE POLICY "student_read_own_grades"
    ON gradebook_entries FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND student_id = current_profile_id()
        AND is_published = TRUE
    );

CREATE POLICY "faculty_manage_own_section_gradebook"
    ON gradebook_entries FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
            )
        )
    );

-- attendance
CREATE POLICY "faculty_manage_own_attendance_sessions"
    ON attendance_sessions FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
            )
        )
    );

CREATE POLICY "student_read_own_attendance_sessions"
    ON attendance_sessions FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND section_id IN (
            SELECT section_id FROM enrollments WHERE student_id = current_profile_id() AND status = 'enrolled'
        )
    );

CREATE POLICY "student_checkin_attendance"
    ON attendance_records FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND student_id = current_profile_id()
        AND session_id IN (SELECT id FROM attendance_sessions WHERE is_open = TRUE)
    );

CREATE POLICY "student_read_own_attendance_records"
    ON attendance_records FOR SELECT
    USING (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
        AND student_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID
    );

CREATE POLICY "faculty_manage_attendance_records"
    ON attendance_records FOR ALL
    USING (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
        AND (
            (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'faculty'
                AND section_id IN (SELECT id FROM sections WHERE instructor_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID)
            )
        )
    );

CREATE POLICY "student_read_own_attendance_summary"
    ON attendance_summaries FOR SELECT
    USING (tenant_id = current_tenant_id() AND student_id = current_profile_id());

CREATE POLICY "admin_faculty_read_attendance_summaries"
    ON attendance_summaries FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'faculty', 'super_admin')
    );

-- ---------------------------------------------------------------
-- Messaging RLS
-- ---------------------------------------------------------------

CREATE POLICY "tenant_participants_read_conversations"
    ON conversations FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (participant_a = current_profile_id() OR participant_b = current_profile_id())
    );

CREATE POLICY "tenant_create_conversations"
    ON conversations FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND (participant_a = current_profile_id() OR participant_b = current_profile_id())
    );

CREATE POLICY "channel_members_read_channels"
    ON channels FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR id IN (SELECT channel_id FROM channel_members WHERE profile_id = current_profile_id())
        )
    );

CREATE POLICY "admin_manage_channels"
    ON channels FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "members_read_channel_members"
    ON channel_members FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND channel_id IN (SELECT channel_id FROM channel_members WHERE profile_id = current_profile_id())
    );

-- Messages: participants / members can read; only sender can insert
-- Optimized RLS for high-volume table using direct JWT extraction
CREATE POLICY "read_own_direct_messages"
    ON messages FOR SELECT
    USING (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
        AND message_type = 'direct'
        AND conversation_id IN (
            SELECT id FROM conversations
            WHERE participant_a = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID 
               OR participant_b = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID
        )
    );

CREATE POLICY "read_channel_messages"
    ON messages FOR SELECT
    USING (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
        AND message_type = 'channel'
        AND channel_id IN (
            SELECT channel_id FROM channel_members 
            WHERE profile_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID
        )
    );

CREATE POLICY "send_messages"
    ON messages FOR INSERT
    WITH CHECK (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
        AND sender_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id')::UUID
    );

CREATE POLICY "sender_delete_own_message"
    ON messages FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND sender_id = current_profile_id()
    );

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
                    WHERE section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
                )
            )
        )
    );

CREATE POLICY "read_own_message_attachments"
    ON message_attachments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND message_id IN (
            SELECT id FROM messages
            WHERE sender_id = current_profile_id()
               OR conversation_id IN (
                    SELECT id FROM conversations
                    WHERE participant_a = current_profile_id() OR participant_b = current_profile_id()
               )
               OR channel_id IN (
                    SELECT channel_id FROM channel_members WHERE profile_id = current_profile_id()
               )
        )
    );

-- ---------------------------------------------------------------
-- Circulars & Notifications RLS
-- ---------------------------------------------------------------

CREATE POLICY "admin_manage_circulars"
    ON circulars FOR ALL
    USING (
        current_user_role() = 'super_admin'
        OR (
            tenant_id = current_tenant_id()
            AND current_user_role() IN ('tenant_admin', 'academic_management')
        )
    );

CREATE POLICY "tenant_read_published_circulars"
    ON circulars FOR SELECT
    USING (
        is_published = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (tenant_id = current_tenant_id() OR tenant_id IS NULL)
    );

CREATE POLICY "user_read_own_notifications"
    ON notifications FOR SELECT
    USING (tenant_id = current_tenant_id() AND recipient_id = current_profile_id());

CREATE POLICY "user_mark_own_notification_read"
    ON notifications FOR UPDATE
    USING (tenant_id = current_tenant_id() AND recipient_id = current_profile_id())
    WITH CHECK (tenant_id = current_tenant_id() AND recipient_id = current_profile_id());

CREATE POLICY "system_insert_notifications"
    ON notifications FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------
-- AI RLS
-- ---------------------------------------------------------------

CREATE POLICY "tenant_admin_manage_ai_docs"
    ON ai_knowledge_documents FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'faculty', 'super_admin')
    );

CREATE POLICY "tenant_read_active_ai_docs"
    ON ai_knowledge_documents FOR SELECT
    USING (tenant_id = current_tenant_id() AND is_active = TRUE);

-- Chunks: only service role (Edge Functions) writes; tenant members read
CREATE POLICY "service_manage_chunks"
    ON ai_document_chunks FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_read_chunks"
    ON ai_document_chunks FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND document_id IN (SELECT id FROM ai_knowledge_documents WHERE is_active = TRUE AND tenant_id = current_tenant_id())
    );

CREATE POLICY "user_manage_own_chatbot_conv"
    ON chatbot_conversations FOR ALL
    USING (tenant_id = current_tenant_id() AND user_id = current_profile_id());

CREATE POLICY "user_manage_own_chatbot_msgs"
    ON chatbot_messages FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND conversation_id IN (
            SELECT id FROM chatbot_conversations WHERE user_id = current_profile_id()
        )
    );

CREATE POLICY "student_read_own_recommendations"
    ON student_recommendations FOR SELECT
    USING (tenant_id = current_tenant_id() AND student_id = current_profile_id());

CREATE POLICY "faculty_admin_manage_recommendations"
    ON student_recommendations FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'faculty', 'super_admin')
    );

CREATE POLICY "super_admin_read_token_usage"
    ON ai_token_usage FOR SELECT
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_admin_read_own_token_usage"
    ON ai_token_usage FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() = 'tenant_admin');

-- ---------------------------------------------------------------
-- Analytics RLS
-- ---------------------------------------------------------------

CREATE POLICY "student_read_own_risk_score"
    ON student_risk_scores FOR SELECT
    USING (tenant_id = current_tenant_id() AND student_id = current_profile_id());

CREATE POLICY "faculty_admin_read_risk_scores"
    ON student_risk_scores FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'faculty', 'super_admin')
    );

CREATE POLICY "admin_read_course_risk_flags"
    ON course_risk_flags FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
    );

CREATE POLICY "faculty_read_own_course_risk_flags"
    ON course_risk_flags FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
    );

-- ---------------------------------------------------------------
-- Ticketing RLS
-- ---------------------------------------------------------------

CREATE POLICY "user_create_own_ticket"
    ON tickets FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id() AND created_by = current_profile_id());

CREATE POLICY "user_read_own_tickets"
    ON tickets FOR SELECT
    USING (tenant_id = current_tenant_id() AND created_by = current_profile_id());

CREATE POLICY "user_update_own_ticket"
    ON tickets FOR UPDATE
    USING (tenant_id = current_tenant_id() AND created_by = current_profile_id())
    WITH CHECK (status IN ('open', 'closed'));

CREATE POLICY "admin_manage_all_tickets"
    ON tickets FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "user_read_own_ticket_messages"
    ON ticket_messages FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            sender_id = current_profile_id()
            OR ticket_id IN (SELECT id FROM tickets WHERE created_by = current_profile_id())
        )
        AND is_internal = FALSE
    );

CREATE POLICY "admin_read_all_ticket_messages"
    ON ticket_messages FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "participants_send_ticket_messages"
    ON ticket_messages FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND sender_id = current_profile_id()
        AND ticket_id IN (
            SELECT id FROM tickets
            WHERE created_by = current_profile_id()
               OR assigned_to = current_profile_id()
               OR current_user_role() IN ('tenant_admin', 'academic_management')
        )
    );

CREATE POLICY "user_read_own_ticket_attachments"
    ON ticket_attachments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            uploaded_by = current_profile_id()
            OR ticket_id IN (SELECT id FROM tickets WHERE created_by = current_profile_id())
        )
    );

CREATE POLICY "admin_read_all_ticket_attachments"
    ON ticket_attachments FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "admin_manage_approval_workflows"
    ON approval_workflows FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "approver_read_own_workflow"
    ON approval_workflows FOR SELECT
    USING (tenant_id = current_tenant_id() AND approver_id = current_profile_id());

CREATE POLICY "approver_decide_workflow"
    ON approval_workflows FOR UPDATE
    USING (tenant_id = current_tenant_id() AND approver_id = current_profile_id());


-- ============================================================
-- END OF PART 2
-- ============================================================
-- New tables: 26
-- Total tables (Part1 + Part2): 52
-- pg_cron jobs: 4
-- Additional triggers: 10 + GPA trigger
-- Additional RLS policies: ~60 (optimized for high-volume tables)
-- pgvector HNSW index: 1 (ai_document_chunks.embedding) - upgraded from IVFFlat
-- Full Text Search indexes: 2 (profiles, tickets) - GIN indexes for fast search
-- GPA Calculation: Automatic cumulative GPA calculation with trigger
-- Schedule Conflict Detection: Complete with mandatory course conflict checking
-- ============================================================
