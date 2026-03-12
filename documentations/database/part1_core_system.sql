-- ============================================================
-- UniBot Platform - Database Schema Part 1: Core System
-- Supabase / PostgreSQL
-- Covers: Extensions, ENUMs, Tenants, Subscriptions,
--         Users/Profiles, Academic Structure, Venues
-- ============================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";


-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

-- Tenant & Subscription
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- User & Identity
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'tenant_admin',
    'academic_management',
    'faculty',
    'student'
);
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'terminated');
CREATE TYPE gender AS ENUM ('male', 'female');

-- Academic Structure
CREATE TYPE course_type AS ENUM ('theoretical', 'practical', 'hybrid');
CREATE TYPE semester_type AS ENUM ('first', 'second', 'summer');
CREATE TYPE semester_status AS ENUM ('planning', 'active', 'archived');
CREATE TYPE section_status AS ENUM ('open', 'closed', 'archived', 'merged');
CREATE TYPE schedule_day AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE venue_type AS ENUM ('lecture_hall', 'lab', 'auditorium', 'other');
CREATE TYPE schedule_status AS ENUM ('draft', 'published');
CREATE TYPE plan_course_type AS ENUM ('mandatory', 'elective');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'dropped', 'completed', 'failed', 'dismissed', 'withdrawn');

-- Attendance
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- LMS & Content
CREATE TYPE content_type AS ENUM ('video', 'pdf', 'audio', 'presentation', 'document', 'link', 'other');
CREATE TYPE submission_status AS ENUM ('submitted', 'late', 'graded', 'resubmit_requested');
CREATE TYPE syllabus_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Messaging
CREATE TYPE message_type AS ENUM ('direct', 'channel');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE channel_type AS ENUM ('course', 'department', 'announcement', 'direct');

-- Notifications & Circulars
CREATE TYPE notification_type AS ENUM (
    'circular',
    'absence_warning',
    'absence_dismissal',
    'grade_released',
    'assignment_due',
    'ticket_update',
    'system',
    'risk_alert',
    'recommendation',
    'schedule_change',
    'cancellation'
);
CREATE TYPE circular_target_type AS ENUM ('all', 'department', 'major', 'level', 'section', 'faculty', 'students');

-- AI & Analytics
CREATE TYPE ai_document_type AS ENUM ('regulation', 'course_material', 'handbook', 'policy', 'other');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Ticketing
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending_info', 'resolved', 'closed', 'rejected');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM (
    'grade_appeal',
    'absence_excuse',
    'registration_issue',
    'schedule_change',
    'venue_issue',
    'technical_problem',
    'administrative',
    'other'
);
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Audit
CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'login', 'logout',
    'impersonate', 'grade_modify', 'permission_change',
    'file_delete', 'status_change', 'ticket_resolve',
    'attendance_modify', 'data_wipe'
);


-- ============================================================
-- SECTION 2: HELPER FUNCTION — updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 3: PLATFORM & TENANT MANAGEMENT
-- (FR-SA1, FR-SA2, SR-1)
-- ============================================================

-- 3.1 Subscription Plans (defined by Super Admin — FR-SA2.1)
CREATE TABLE subscription_plans (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          subscription_plan NOT NULL UNIQUE,
    description   TEXT,
    price_monthly NUMERIC(10, 2)    NOT NULL DEFAULT 0,
    max_users     INT               NOT NULL DEFAULT 500,
    max_storage_gb INT              NOT NULL DEFAULT 50,
    features      JSONB             NOT NULL DEFAULT '{}',
    is_active     BOOLEAN           NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3.2 Tenants — one row per university (FR-SA1.1, FR-SA1.2, FR-SA1.3)
CREATE TABLE tenants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255)       NOT NULL,
    subdomain           VARCHAR(100)       NOT NULL UNIQUE,
    custom_domain       VARCHAR(255),
    logo_url            TEXT,
    primary_color       VARCHAR(7)         DEFAULT '#1E40AF',
    secondary_color     VARCHAR(7)         DEFAULT '#FFFFFF',
    welcome_message     TEXT,
    default_language    VARCHAR(10)        NOT NULL DEFAULT 'ar',
    timezone            VARCHAR(60)        NOT NULL DEFAULT 'Asia/Riyadh',
    status              tenant_status      NOT NULL DEFAULT 'active',
    plan_id             UUID               REFERENCES subscription_plans(id),
    max_users           INT                NOT NULL DEFAULT 500,
    max_storage_gb      INT                NOT NULL DEFAULT 50,
    storage_used_gb     NUMERIC(10, 4)     NOT NULL DEFAULT 0,
    absence_threshold   NUMERIC(5, 2)      NOT NULL DEFAULT 25.00,
    contract_start      DATE,
    contract_end        DATE,
    admin_email         VARCHAR(255)       NOT NULL,
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT chk_absence_threshold CHECK (absence_threshold BETWEEN 0 AND 100),
    CONSTRAINT chk_colors_primary CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_colors_secondary CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status    ON tenants(status);

-- 3.3 Subscriptions — tracks billing history (FR-SA2.2, FR-SA2.3)
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         UUID             NOT NULL REFERENCES subscription_plans(id),
    status          subscription_status NOT NULL DEFAULT 'active',
    start_date      DATE             NOT NULL,
    end_date        DATE             NOT NULL,
    auto_renew      BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- 3.4 Invoices (FR-SA2.2, FR-SA2.3)
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID             REFERENCES subscriptions(id),
    amount          NUMERIC(12, 2)   NOT NULL,
    currency        VARCHAR(5)       NOT NULL DEFAULT 'USD',
    status          invoice_status   NOT NULL DEFAULT 'draft',
    due_date        DATE             NOT NULL,
    paid_at         TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);

-- 3.5 System Announcements from Super Admin (FR-SA3.4)
CREATE TABLE system_announcements (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(500) NOT NULL,
    body        TEXT         NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);


-- ============================================================
-- SECTION 4: USERS & PROFILES
-- (FR-TA3, SR-1, Supabase Auth integration)
-- ============================================================

-- 4.1 Profiles — extends Supabase auth.users
-- Each profile is linked to auth.users via the same UUID (id)
CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id       UUID              REFERENCES tenants(id) ON DELETE CASCADE,
    -- NULL tenant_id = super_admin
    role            user_role         NOT NULL DEFAULT 'student',
    first_name      VARCHAR(100)      NOT NULL,
    last_name       VARCHAR(100)      NOT NULL,
    national_id     VARCHAR(50),
    gender          gender,
    date_of_birth   DATE,
    phone           VARCHAR(20),
    avatar_url      TEXT,
    account_status  account_status    NOT NULL DEFAULT 'active',
    is_dnd_active   BOOLEAN           NOT NULL DEFAULT FALSE,
    dnd_message     TEXT,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tenant_for_non_super_admin
        CHECK (role = 'super_admin' OR tenant_id IS NOT NULL)
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_role      ON profiles(role);

-- Full Text Search Index for Profiles (fast name search)
ALTER TABLE profiles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_profiles_search_vector ON profiles USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_profile_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.first_name, '') || ' ' || 
        COALESCE(NEW.last_name, '') || ' ' ||
        COALESCE(NEW.national_id, '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_update_search_vector
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_search_vector();

-- 4.2 Custom RBAC Roles (for Tenant Admin to create Dean, Registrar, etc. — FR-TA3.2)
CREATE TABLE custom_roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB        NOT NULL DEFAULT '{}',
    scope       VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, name)
);

CREATE TRIGGER trg_custom_roles_updated_at
    BEFORE UPDATE ON custom_roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_custom_roles_tenant_id ON custom_roles(tenant_id);

-- 4.3 Assign custom roles to profiles
CREATE TABLE profile_custom_roles (
    profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    custom_role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by    UUID REFERENCES profiles(id),

    PRIMARY KEY (profile_id, custom_role_id)
);

-- 4.4 Faculty details (department assignment)
CREATE TABLE faculty_profiles (
    profile_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id      VARCHAR(50),
    office_hours     JSONB        DEFAULT '[]',
    specialization   VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, employee_id)
);

CREATE TRIGGER trg_faculty_profiles_updated_at
    BEFORE UPDATE ON faculty_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.5 Student details
CREATE TABLE student_profiles (
    profile_id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id             UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_number        VARCHAR(50)  NOT NULL,
    enrollment_year       INT,
    cumulative_gpa        NUMERIC(4,2) DEFAULT 0.00,
    total_credit_hours    INT          DEFAULT 0,
    earned_credit_hours   INT          DEFAULT 0,
    risk_level            risk_level   NOT NULL DEFAULT 'low',
    risk_score            NUMERIC(5,2) DEFAULT 0.00,
    risk_updated_at       TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, student_number)
);

CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_student_profiles_tenant_id   ON student_profiles(tenant_id);
CREATE INDEX idx_student_profiles_risk_level  ON student_profiles(risk_level);

-- 4.6 Audit Log (FR-TA6.2, FR-SA5.3)
CREATE TABLE audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    UUID          REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id     UUID          REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role   user_role,
    action       audit_action  NOT NULL,
    target_table VARCHAR(100),
    target_id    UUID,
    old_data     JSONB,
    new_data     JSONB,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id  ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);


-- ============================================================
-- SECTION 5: ACADEMIC STRUCTURE
-- (FR-TA2, FR-AM1, SR-2)
-- ============================================================

-- 5.1 Colleges (FR-TA2.1)
CREATE TABLE colleges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(20),
    dean_id     UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_colleges_updated_at
    BEFORE UPDATE ON colleges
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_colleges_tenant_id ON colleges(tenant_id);

-- 5.2 Departments (FR-TA2.1)
CREATE TABLE departments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    college_id    UUID         NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    code          VARCHAR(20),
    head_id       UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_departments_tenant_id  ON departments(tenant_id);
CREATE INDEX idx_departments_college_id ON departments(college_id);

-- 5.3 Faculty → Department assignment (many-to-many to support multi-dept faculty)
CREATE TABLE faculty_departments (
    faculty_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_primary    BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (faculty_id, department_id)
);

CREATE INDEX idx_faculty_departments_dept ON faculty_departments(department_id);

-- 5.4 Majors / Programs (FR-TA2.1)
CREATE TABLE majors (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id  UUID         NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    code           VARCHAR(20),
    total_credits  INT          NOT NULL DEFAULT 120,
    duration_years INT          NOT NULL DEFAULT 4,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_majors_updated_at
    BEFORE UPDATE ON majors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_majors_tenant_id     ON majors(tenant_id);
CREATE INDEX idx_majors_department_id ON majors(department_id);

-- 5.5 Student → Major assignment
CREATE TABLE student_majors (
    student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    major_id    UUID NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_primary  BOOLEAN NOT NULL DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (student_id, major_id)
);

CREATE INDEX idx_student_majors_major_id ON student_majors(major_id);

-- 5.6 Academic Levels (FR-TA2.2)
CREATE TABLE academic_levels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    major_id    UUID         NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
    level_number INT         NOT NULL,
    name        VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (major_id, level_number)
);

CREATE TRIGGER trg_academic_levels_updated_at
    BEFORE UPDATE ON academic_levels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_academic_levels_tenant_id ON academic_levels(tenant_id);
CREATE INDEX idx_academic_levels_major_id  ON academic_levels(major_id);

-- 5.7 Course Catalog (FR-TA2.3)
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id   UUID         REFERENCES departments(id) ON DELETE SET NULL,
    code            VARCHAR(30)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    credit_hours    INT          NOT NULL DEFAULT 3,
    course_type     course_type  NOT NULL DEFAULT 'theoretical',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_courses_tenant_id     ON courses(tenant_id);
CREATE INDEX idx_courses_department_id ON courses(department_id);

-- 5.8 Study Plan — links courses to academic levels (FR-TA2.4)
CREATE TABLE study_plan_courses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    academic_level_id UUID             NOT NULL REFERENCES academic_levels(id) ON DELETE CASCADE,
    course_id        UUID              NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester_type    semester_type     NOT NULL DEFAULT 'first',
    plan_course_type plan_course_type  NOT NULL DEFAULT 'mandatory',
    min_grade_to_pass NUMERIC(5, 2)   NOT NULL DEFAULT 60.00,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (academic_level_id, course_id, semester_type)
);

CREATE INDEX idx_spc_tenant_id    ON study_plan_courses(tenant_id);
CREATE INDEX idx_spc_level_id     ON study_plan_courses(academic_level_id);
CREATE INDEX idx_spc_course_id    ON study_plan_courses(course_id);

-- 5.9 Course Prerequisites (FR-TA2.4)
CREATE TABLE course_prerequisites (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    min_grade         NUMERIC(5, 2) NOT NULL DEFAULT 60.00,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    UNIQUE (course_id, prerequisite_id),
    CONSTRAINT chk_no_self_prerequisite CHECK (course_id <> prerequisite_id)
);

CREATE INDEX idx_prerequisites_tenant_id  ON course_prerequisites(tenant_id);
CREATE INDEX idx_prerequisites_course_id  ON course_prerequisites(course_id);

-- 5.10 Academic Semesters / Terms (FR-TA1.2, FR-TA1.4)
CREATE TABLE semesters (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name             VARCHAR(100)      NOT NULL,
    academic_year    VARCHAR(20)       NOT NULL,
    semester_type    semester_type     NOT NULL,
    status           semester_status   NOT NULL DEFAULT 'planning',
    start_date       DATE              NOT NULL,
    end_date         DATE              NOT NULL,
    reg_start        DATE,
    reg_end          DATE,
    add_drop_start   DATE,
    add_drop_end     DATE,
    grade_freeze_at  TIMESTAMPTZ,
    min_credit_hours INT               NOT NULL DEFAULT 12,
    max_credit_hours INT               NOT NULL DEFAULT 18,
    self_reg_enabled BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, academic_year, semester_type),
    CONSTRAINT chk_semester_dates CHECK (start_date < end_date)
);

CREATE TRIGGER trg_semesters_updated_at
    BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_semesters_tenant_id ON semesters(tenant_id);
CREATE INDEX idx_semesters_status    ON semesters(status);

-- 5.11 Venues (FR-TA4.1)
CREATE TABLE venues (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    code         VARCHAR(50),
    venue_type   venue_type   NOT NULL DEFAULT 'lecture_hall',
    capacity     INT          NOT NULL DEFAULT 30,
    building     VARCHAR(100),
    floor        VARCHAR(20),
    has_projector BOOLEAN     NOT NULL DEFAULT TRUE,
    has_ac       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_venues_tenant_id ON venues(tenant_id);

-- 5.12 Course Sections (FR-AM1.2, FR-AM1.3)
CREATE TABLE sections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id           UUID           NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester_id         UUID           NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    section_code        VARCHAR(20)    NOT NULL,
    instructor_id       UUID           REFERENCES profiles(id) ON DELETE SET NULL,
    status              section_status NOT NULL DEFAULT 'open',
    max_capacity        INT            NOT NULL DEFAULT 40,
    enrolled_count      INT            NOT NULL DEFAULT 0,
    merged_into_id      UUID           REFERENCES sections(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, semester_id, course_id, section_code)
);

CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_sections_tenant_id     ON sections(tenant_id);
CREATE INDEX idx_sections_course_id     ON sections(course_id);
CREATE INDEX idx_sections_semester_id   ON sections(semester_id);
CREATE INDEX idx_sections_instructor_id ON sections(instructor_id);

-- 5.13 Student Enrollments (FR-AM1.4, FR-AM1.5, FR-ST1.2)
CREATE TABLE enrollments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id       UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    section_id       UUID              NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    semester_id      UUID              NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    status           enrollment_status NOT NULL DEFAULT 'enrolled',
    final_grade      NUMERIC(5, 2),
    letter_grade     VARCHAR(5),
    enrolled_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    dropped_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    UNIQUE (student_id, section_id)
);

CREATE TRIGGER trg_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_enrollments_tenant_id   ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_student_id  ON enrollments(student_id);
CREATE INDEX idx_enrollments_section_id  ON enrollments(section_id);
CREATE INDEX idx_enrollments_semester_id ON enrollments(semester_id);

-- Trigger: keep sections.enrolled_count in sync
CREATE OR REPLACE FUNCTION sync_section_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
        UPDATE sections SET enrolled_count = enrolled_count + 1 WHERE id = NEW.section_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'enrolled' AND NEW.status <> 'enrolled' THEN
            UPDATE sections SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = NEW.section_id;
        ELSIF OLD.status <> 'enrolled' AND NEW.status = 'enrolled' THEN
            UPDATE sections SET enrolled_count = enrolled_count + 1 WHERE id = NEW.section_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'enrolled' THEN
        UPDATE sections SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = OLD.section_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_enrollments_sync_count
    AFTER INSERT OR UPDATE OR DELETE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION sync_section_enrolled_count();

-- GPA Update Trigger
CREATE TRIGGER trg_enrollments_update_gpa
    AFTER UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_student_gpa_trigger();

-- 5.14 Schedules / Timetable (FR-AM2.1, FR-AM2.2, FR-AM2.3)
CREATE TABLE schedules (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id    UUID            NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    venue_id      UUID            REFERENCES venues(id) ON DELETE SET NULL,
    day_of_week   schedule_day    NOT NULL,
    start_time    TIME            NOT NULL,
    end_time      TIME            NOT NULL,
    status        schedule_status NOT NULL DEFAULT 'draft',
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_schedule_times CHECK (start_time < end_time)
);

CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_schedules_tenant_id   ON schedules(tenant_id);
CREATE INDEX idx_schedules_section_id  ON schedules(section_id);
CREATE INDEX idx_schedules_venue_id    ON schedules(venue_id);
CREATE INDEX idx_schedules_day         ON schedules(day_of_week);

-- 5.15 Conflict Detection Function (FR-AM2.2)
-- Checks spatial, faculty, and student-level conflicts before schedule insert/update
CREATE OR REPLACE FUNCTION check_schedule_conflicts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_instructor_id   UUID;
    v_course_id       UUID;
    v_semester_id     UUID;
    v_academic_level  UUID;
    spatial_conflict  INT;
    faculty_conflict  INT;
    student_conflict  INT;
BEGIN
    -- Retrieve context from the section being scheduled
    SELECT s.instructor_id, s.course_id, s.semester_id
    INTO v_instructor_id, v_course_id, v_semester_id
    FROM sections s WHERE s.id = NEW.section_id;

    -- Spatial Conflict: same venue, same day, overlapping time
    SELECT COUNT(*) INTO spatial_conflict
    FROM schedules sc
    JOIN sections se ON sc.section_id = se.id
    WHERE sc.id <> COALESCE(NEW.id, uuid_generate_v4())
      AND sc.tenant_id = NEW.tenant_id
      AND sc.venue_id = NEW.venue_id
      AND sc.day_of_week = NEW.day_of_week
      AND se.semester_id = v_semester_id
      AND sc.start_time < NEW.end_time
      AND sc.end_time > NEW.start_time;

    IF spatial_conflict > 0 THEN
        RAISE EXCEPTION 'SPATIAL_CONFLICT: Venue is already booked at this time slot.';
    END IF;

    -- Faculty Conflict: same instructor, same day, overlapping time
    IF v_instructor_id IS NOT NULL THEN
        SELECT COUNT(*) INTO faculty_conflict
        FROM schedules sc
        JOIN sections se ON sc.section_id = se.id
        WHERE sc.id <> COALESCE(NEW.id, uuid_generate_v4())
          AND sc.tenant_id = NEW.tenant_id
          AND se.instructor_id = v_instructor_id
          AND sc.day_of_week = NEW.day_of_week
          AND se.semester_id = v_semester_id
          AND sc.start_time < NEW.end_time
          AND sc.end_time > NEW.start_time;

        IF faculty_conflict > 0 THEN
            RAISE EXCEPTION 'FACULTY_CONFLICT: Instructor is already scheduled at this time slot.';
        END IF;
    END IF;

    -- Student Conflict: same academic level, mandatory course, same time (FR-AM2.2)
    -- Check for mandatory course conflicts at same academic level
    SELECT COUNT(*) INTO student_conflict
    FROM schedules sc
    JOIN sections se ON sc.section_id = se.id
    JOIN courses c ON se.course_id = c.id
    JOIN study_plan_courses spc ON c.id = spc.course_id
    WHERE sc.id <> COALESCE(NEW.id, uuid_generate_v4())
      AND sc.tenant_id = NEW.tenant_id
      AND sc.day_of_week = NEW.day_of_week
      AND sc.start_time < NEW.end_time
      AND sc.end_time > NEW.start_time
      AND spc.plan_course_type = 'mandatory'
      AND spc.academic_level_id = (
          SELECT spc2.academic_level_id 
          FROM study_plan_courses spc2
          JOIN courses c2 ON spc2.course_id = c2.id
          WHERE c2.id = v_course_id
          LIMIT 1
      )
      AND se.semester_id = v_semester_id;

    IF student_conflict > 0 THEN
        RAISE EXCEPTION 'STUDENT_CONFLICT: Mandatory course at same academic level is already scheduled at this time slot.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_schedule_conflicts
    BEFORE INSERT OR UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION check_schedule_conflicts();

-- 5.16 Academic Syllabus (FR-FM1.1, FR-AM1.1)
CREATE TABLE syllabi (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id    UUID             NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    instructor_id UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status        syllabus_status  NOT NULL DEFAULT 'draft',
    content       JSONB            NOT NULL DEFAULT '[]',
    reviewed_by   UUID             REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMPTZ,
    review_notes  TEXT,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    UNIQUE (section_id)
);

CREATE TRIGGER trg_syllabi_updated_at
    BEFORE UPDATE ON syllabi
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_syllabi_tenant_id   ON syllabi(tenant_id);
CREATE INDEX idx_syllabi_section_id  ON syllabi(section_id);


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY — Part 1 Tables
-- ============================================================

-- Enable RLS on all Part 1 tables
ALTER TABLE subscription_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_custom_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_majors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_levels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters                ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules                ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabi                  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- Helper: extract current user's tenant_id from JWT custom claims
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::UUID;
$$;

-- Helper: extract current user's role from JWT
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT LANGUAGE SQL STABLE AS $$
    SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$;

-- Helper: extract current user's profile id
CREATE OR REPLACE FUNCTION current_profile_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT auth.uid();
$$;

-- ---------------------------------------------------------------
-- RLS Policies: subscription_plans
-- Super Admin: full access | Others: read only
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_all_on_subscription_plans"
    ON subscription_plans FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "authenticated_read_subscription_plans"
    ON subscription_plans FOR SELECT
    USING (current_user_role() IS NOT NULL);

-- ---------------------------------------------------------------
-- RLS Policies: tenants
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_all_on_tenants"
    ON tenants FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_admin_read_own_tenant"
    ON tenants FOR SELECT
    USING (id = current_tenant_id());

CREATE POLICY "tenant_admin_update_own_tenant"
    ON tenants FOR UPDATE
    USING (id = current_tenant_id() AND current_user_role() = 'tenant_admin');

-- ---------------------------------------------------------------
-- RLS Policies: profiles (most sensitive table)
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_all_on_profiles"
    ON profiles FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_admin_manage_own_tenant_profiles"
    ON profiles FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() = 'tenant_admin');

CREATE POLICY "academic_management_read_tenant_profiles"
    ON profiles FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('academic_management'));

CREATE POLICY "faculty_read_own_section_students"
    ON profiles FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND (
            id = current_profile_id()
            OR role = 'student'
        )
    );

CREATE POLICY "student_read_own_profile"
    ON profiles FOR SELECT
    USING (id = current_profile_id());

CREATE POLICY "student_update_own_profile"
    ON profiles FOR UPDATE
    USING (id = current_profile_id() AND current_user_role() = 'student')
    WITH CHECK (id = current_profile_id());

-- ---------------------------------------------------------------
-- RLS Policies: tenant-scoped tables (colleges, departments,
-- majors, courses, semesters, venues, sections, schedules)
-- Pattern: all roles within same tenant can read;
--          write access restricted to admin / academic_management
-- ---------------------------------------------------------------

-- Generic tenant-isolation read policy factory
-- (Applied individually per table for clarity)

-- colleges
CREATE POLICY "tenant_read_colleges"
    ON colleges FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_admin_write_colleges"
    ON colleges FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

-- departments
CREATE POLICY "tenant_read_departments"
    ON departments FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_admin_write_departments"
    ON departments FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

-- majors
CREATE POLICY "tenant_read_majors"
    ON majors FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_majors"
    ON majors FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- academic_levels
CREATE POLICY "tenant_read_academic_levels"
    ON academic_levels FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_academic_levels"
    ON academic_levels FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- courses
CREATE POLICY "tenant_read_courses"
    ON courses FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_courses"
    ON courses FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

-- study_plan_courses
CREATE POLICY "tenant_read_study_plan_courses"
    ON study_plan_courses FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_study_plan_courses"
    ON study_plan_courses FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- course_prerequisites
CREATE POLICY "tenant_read_prerequisites"
    ON course_prerequisites FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_prerequisites"
    ON course_prerequisites FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- semesters
CREATE POLICY "tenant_read_semesters"
    ON semesters FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_semesters"
    ON semesters FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- venues
CREATE POLICY "tenant_read_venues"
    ON venues FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_write_venues"
    ON venues FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- sections
CREATE POLICY "tenant_read_sections"
    ON sections FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "academic_management_write_sections"
    ON sections FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- schedules
CREATE POLICY "tenant_read_schedules"
    ON schedules FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "academic_management_write_schedules"
    ON schedules FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- enrollments — students see their own; faculty see their sections; admin sees all
CREATE POLICY "student_read_own_enrollments"
    ON enrollments FOR SELECT
    USING (tenant_id = current_tenant_id() AND student_id = current_profile_id());

CREATE POLICY "faculty_read_section_enrollments"
    ON enrollments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND section_id IN (
            SELECT id FROM sections
            WHERE instructor_id = current_profile_id()
        )
    );

CREATE POLICY "admin_all_enrollments"
    ON enrollments FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- syllabi
CREATE POLICY "tenant_read_syllabi"
    ON syllabi FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "faculty_write_own_syllabi"
    ON syllabi FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (current_user_role() = 'faculty' AND instructor_id = current_profile_id())
        )
    );

-- audit_logs — read-only; only tenant_admin and super_admin can view
CREATE POLICY "admin_read_audit_logs"
    ON audit_logs FOR SELECT
    USING (
        current_user_role() = 'super_admin'
        OR (tenant_id = current_tenant_id() AND current_user_role() = 'tenant_admin')
    );

-- custom_roles
CREATE POLICY "tenant_admin_manage_custom_roles"
    ON custom_roles FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "tenant_read_custom_roles"
    ON custom_roles FOR SELECT
    USING (tenant_id = current_tenant_id());

-- student_profiles — students read own, admin/faculty read tenant
CREATE POLICY "student_read_own_student_profile"
    ON student_profiles FOR SELECT
    USING (profile_id = current_profile_id());

CREATE POLICY "admin_faculty_read_student_profiles"
    ON student_profiles FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'faculty'));

CREATE POLICY "system_write_student_profiles"
    ON student_profiles FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

-- faculty_profiles
CREATE POLICY "faculty_read_own_profile"
    ON faculty_profiles FOR SELECT
    USING (profile_id = current_profile_id());

CREATE POLICY "admin_manage_faculty_profiles"
    ON faculty_profiles FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "tenant_read_faculty_profiles"
    ON faculty_profiles FOR SELECT
    USING (tenant_id = current_tenant_id());

-- subscriptions / invoices — super_admin full, tenant_admin read own
CREATE POLICY "super_admin_all_subscriptions"
    ON subscriptions FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_admin_read_own_subscriptions"
    ON subscriptions FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() = 'tenant_admin');

CREATE POLICY "super_admin_all_invoices"
    ON invoices FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "tenant_admin_read_own_invoices"
    ON invoices FOR SELECT
    USING (tenant_id = current_tenant_id() AND current_user_role() = 'tenant_admin');

-- system_announcements — super_admin writes, all authenticated read
CREATE POLICY "super_admin_manage_announcements"
    ON system_announcements FOR ALL
    USING (current_user_role() = 'super_admin');

CREATE POLICY "all_read_active_announcements"
    ON system_announcements FOR SELECT
    USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- student_majors / faculty_departments / profile_custom_roles
CREATE POLICY "admin_manage_student_majors"
    ON student_majors FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "student_read_own_majors"
    ON student_majors FOR SELECT
    USING (student_id = current_profile_id());

CREATE POLICY "admin_manage_faculty_departments"
    ON faculty_departments FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

CREATE POLICY "admin_manage_profile_custom_roles"
    ON profile_custom_roles FOR ALL
    USING (
        current_user_role() IN ('super_admin')
        OR (
            current_user_role() = 'tenant_admin'
            AND profile_id IN (SELECT id FROM profiles WHERE tenant_id = current_tenant_id())
        )
    );


-- ============================================================
-- GPA CALCULATION FUNCTION
-- ============================================================

-- Function to calculate and update student cumulative GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID, p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    total_grade_points NUMERIC := 0;
    total_credit_hours INT := 0;
    new_gpa NUMERIC;
BEGIN
    -- Calculate total grade points and credit hours from completed enrollments
    SELECT 
        COALESCE(SUM(CASE 
            WHEN e.final_grade >= 90 THEN 4.0 * c.credit_hours
            WHEN e.final_grade >= 80 THEN 3.0 * c.credit_hours  
            WHEN e.final_grade >= 70 THEN 2.0 * c.credit_hours
            WHEN e.final_grade >= 60 THEN 1.0 * c.credit_hours
            ELSE 0.0
        END), 0) as total_points,
        COALESCE(SUM(c.credit_hours), 0) as total_hours
    INTO total_grade_points, total_credit_hours
    FROM enrollments e
    JOIN sections s ON e.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE e.student_id = p_student_id
      AND e.tenant_id = p_tenant_id
      AND e.status = 'completed'
      AND e.final_grade IS NOT NULL;

    -- Calculate GPA (avoid division by zero)
    IF total_credit_hours > 0 THEN
        new_gpa := total_grade_points / total_credit_hours;
    ELSE
        new_gpa := 0;
    END IF;

    -- Update student profile with new GPA
    UPDATE student_profiles 
    SET cumulative_gpa = new_gpa,
        total_credit_hours = total_credit_hours,
        earned_credit_hours = (
            SELECT COUNT(c.credit_hours)
            FROM enrollments e
            JOIN sections s ON e.section_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE e.student_id = p_student_id
              AND e.tenant_id = p_tenant_id
              AND e.status = 'completed'
              AND e.final_grade >= 60
        )
    WHERE profile_id = p_student_id;
END;
$$;

-- Trigger to automatically update GPA when enrollment is completed
CREATE OR REPLACE FUNCTION update_student_gpa_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Only update GPA when status changes to 'completed' and final_grade is set
    IF NEW.status = 'completed' AND NEW.final_grade IS NOT NULL THEN
        PERFORM calculate_student_gpa(NEW.student_id, NEW.tenant_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================
-- END OF PART 1
-- ============================================================
-- Tables created: 26
-- ENUMs created: 26
-- Triggers: updated_at (all tables), sync enrolled_count,
--           check_schedule_conflicts
-- RLS Policies: ~50 policies covering all Part 1 tables
-- ============================================================
