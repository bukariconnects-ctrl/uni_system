# UniBot Platform — Database Documentation
**Deliverable 2 | Senior Database Architect Review**
**Technology Stack:** Supabase · PostgreSQL · pgvector · pg_cron · Row Level Security

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack & Extensions](#2-technology-stack--extensions)
3. [Schema Design — Module by Module](#3-schema-design--module-by-module)
   - 3.1 Platform & Tenant Management
   - 3.2 Users & Identity
   - 3.3 Academic Structure
   - 3.4 LMS & Attendance
   - 3.5 Messaging & Interaction
   - 3.6 Circulars & Notifications
   - 3.7 AI / Vector Database
   - 3.8 Analytics & Predictive
   - 3.9 Academic Ticketing
4. [Multi-Tenancy Design Pattern](#4-multi-tenancy-design-pattern)
5. [Row Level Security (RLS) Implementation](#5-row-level-security-rls-implementation)
6. [Supabase Auth Integration](#6-supabase-auth-integration)
7. [pgvector Implementation](#7-pgvector-implementation)
8. [Triggers & Automated Functions](#8-triggers--automated-functions)
9. [pg_cron Scheduled Jobs](#9-pg_cron-scheduled-jobs)
10. [Requirements Traceability Matrix](#10-requirements-traceability-matrix)
11. [ENUM Reference](#11-enum-reference)
12. [Complete Table Inventory](#12-complete-table-inventory)
13. [Architectural Improvements & Suggestions](#13-architectural-improvements--suggestions)

---

## 1. Architecture Overview

### Design Philosophy

The UniBot database is designed on three core pillars:

| Pillar | Implementation |
|--------|---------------|
| **Isolation** | Every table carries `tenant_id`; RLS policies enforce zero cross-tenant leakage (NFR-SEC1) |
| **Intelligence** | `pgvector` columns store AI embeddings; `pg_cron` drives batch analytics (SR-6, SR-7) |
| **Auditability** | `audit_logs`, non-editable append-only records, and `updated_at` triggers on every mutable table |

### Multi-tenancy Strategy

The platform uses a **Shared Schema, Shared Database** pattern with strict logical isolation:

```
auth.users (Supabase managed)
    │
    └── profiles (tenant_id + role)
            │
            ├── Super Admin     → tenant_id IS NULL
            ├── Tenant Admin    → tenant_id = university UUID
            ├── Academic Mgmt   → tenant_id = university UUID
            ├── Faculty         → tenant_id = university UUID
            └── Student         → tenant_id = university UUID
```

All tables share the same PostgreSQL schema (`public`) but are logically partitioned by `tenant_id`. RLS policies act as the enforcement boundary — no query can ever return rows from a different tenant.

---

## 2. Technology Stack & Extensions

### Extensions Used

| Extension | Purpose | Requirement |
|-----------|---------|-------------|
| `uuid-ossp` | Generate UUID v4 primary keys | All tables |
| `pgvector` | Store and query AI embedding vectors (1536 dimensions) | SR-6, FR-ST5.1 |
| `pg_cron` | Schedule recurring DB-level jobs (risk refresh, invoice generation) | NFR-AI2, FR-SA2.2 |

### Why Shared Schema Over Schema-per-Tenant?

| Factor | Shared Schema | Schema-per-Tenant |
|--------|--------------|-------------------|
| **Scalability** | ✅ Scales to 1000s of tenants | ❌ PostgreSQL schema limit ~10k |
| **Migration** | ✅ Single migration for all tenants | ❌ Run migration N times |
| **Cross-tenant queries** (Super Admin) | ✅ Simple JOINs | ❌ Dynamic SQL needed |
| **Isolation enforcement** | ✅ RLS policies | ✅ Schema boundaries |
| **Supabase compatibility** | ✅ Native support | ⚠️ Requires custom setup |

**Decision:** Shared schema with `tenant_id` + RLS is the optimal choice for this platform's scale and Supabase compatibility.

---

## 3. Schema Design — Module by Module

### 3.1 Platform & Tenant Management

**Tables:** `subscription_plans`, `tenants`, `subscriptions`, `invoices`, `system_announcements`

#### `tenants`
The root table of the entire SaaS architecture. Every university instance is one row here.

| Key Column | Type | Justification |
|------------|------|---------------|
| `subdomain` | `VARCHAR UNIQUE` | FR-SA1.2 — custom subdomain per tenant |
| `status` | `tenant_status ENUM` | FR-SA1.3 — Active/Suspended/Deleted lifecycle |
| `absence_threshold` | `NUMERIC(5,2)` | FR-TA1.2 — configurable dismissal % per university |
| `max_users`, `max_storage_gb` | `INT` | FR-SA1.4 — per-tenant resource quotas |
| `contract_start`, `contract_end` | `DATE` | FR-SA2.2 — for renewal invoice automation |
| `logo_url`, `primary_color`, `welcome_message` | various | FR-TA1.1 — branding customization |

The `absence_threshold` column is stored at the tenant level so different universities can configure their own dismissal policies (e.g., 25% or 30%). The `recalculate_attendance_summary()` trigger reads this value dynamically.

#### `subscription_plans`
Stores plan definitions (Basic/Pro/Enterprise). The `features` JSONB column allows flexible feature flags without schema migrations as new features are added.

#### `subscriptions` + `invoices`
Tracks billing history. The `pg_cron` job `generate_renewal_invoices` queries `subscriptions` where `end_date` is within 30 days and inserts rows into `invoices`. This fulfills **FR-SA2.2**.

---

### 3.2 Users & Identity

**Tables:** `profiles`, `custom_roles`, `profile_custom_roles`, `faculty_profiles`, `student_profiles`, `audit_logs`

#### `profiles`
The central user table. It extends Supabase's `auth.users` by sharing the same UUID as the primary key. This is the Supabase-recommended pattern for custom user data.

```sql
profiles.id UUID REFERENCES auth.users(id)
```

The `role` column stores the base system role. Fine-grained permissions are handled by `custom_roles` (RBAC), fulfilling **FR-TA3.2**.

A `super_admin` user has `tenant_id = NULL`, making them the only profile not scoped to any university. RLS policies explicitly check for this.

#### `student_profiles` / `faculty_profiles`
These tables extend `profiles` with domain-specific fields, following the **Single Table Inheritance** variant pattern. A student row always has a corresponding `profiles` row, but the academic-specific data (GPA, risk score, student number) lives in `student_profiles` to keep `profiles` lean and fast.

The `risk_level` and `risk_score` columns on `student_profiles` are **denormalized summaries** updated daily by `pg_cron` from `student_risk_scores`. This allows O(1) dashboard queries for "show all at-risk students" without a full table scan of `student_risk_scores`.

#### `audit_logs`
Append-only table (no UPDATE/DELETE policies defined, only INSERT by trusted service roles). Records every sensitive action with: `actor_id`, `action` (ENUM), `target_table`, `target_id`, `old_data` (JSONB), `new_data` (JSONB), and `ip_address`. This fulfills **FR-TA6.2** and **FR-SA5.3** (impersonation logging).

---

### 3.3 Academic Structure

**Tables:** `colleges`, `departments`, `faculty_departments`, `majors`, `student_majors`, `academic_levels`, `courses`, `study_plan_courses`, `course_prerequisites`, `semesters`, `venues`, `sections`, `enrollments`, `schedules`, `syllabi`

This module models the complete university organizational hierarchy:

```
tenants
  └── colleges                    (FR-TA2.1)
        └── departments           (FR-TA2.1)
              ├── majors          (FR-TA2.1)
              │     └── academic_levels  (FR-TA2.2)
              │           └── study_plan_courses (FR-TA2.4)
              │                 └── courses (FR-TA2.3)
              │                       └── course_prerequisites (FR-TA2.4)
              └── courses
```

#### `semesters`
Contains all temporal configuration: `reg_start`, `reg_end`, `add_drop_start`, `add_drop_end`, and `grade_freeze_at`. When `grade_freeze_at` is reached, the application layer should prevent new gradebook entries. The `status` transitions through `planning → active → archived`, which drives **FR-TA1.4** (Semester Archiving).

#### `sections`
Each section links a `course_id` to a `semester_id` with an `instructor_id`. The `enrolled_count` is a **denormalized counter** kept in sync by the `sync_section_enrolled_count()` trigger — this avoids expensive `COUNT(*)` queries on `enrollments` for capacity checks.

#### `schedules` + Conflict Detection
The `check_schedule_conflicts()` trigger fires `BEFORE INSERT OR UPDATE` on `schedules`. It performs three checks:
1. **Spatial Conflict** — same venue, same day, overlapping time (FR-AM2.2)
2. **Faculty Conflict** — same instructor, same day, overlapping time (FR-AM2.2)

A student-level conflict (two mandatory courses at the same time for the same level) is best handled at the application layer, as it requires knowledge of which students are enrolled — too expensive for a per-row trigger.

#### `study_plan_courses` + `course_prerequisites`
These two tables together form the **academic graph**. `study_plan_courses` maps courses to levels/semesters. `course_prerequisites` defines directed prerequisite edges. The application enforces prerequisite checking during enrollment by querying this graph (FR-TA2.4).

#### `enrollments`
The junction table between `students` and `sections`. The `status` field follows the lifecycle: `enrolled → dropped | completed | failed | dismissed | withdrawn`. The `dismissed` status is automatically set by the `recalculate_attendance_summary()` trigger when absence exceeds `tenant.absence_threshold`.

---

### 3.4 LMS & Attendance

**Tables:** `course_materials`, `assignments`, `submissions`, `gradebook_entries`, `attendance_sessions`, `attendance_records`, `attendance_summaries`

#### `course_materials`
The `is_ai_approved` boolean column is the gatekeeper for **FR-FM1.3**. Only materials with `is_ai_approved = TRUE` are linked to `ai_knowledge_documents` and indexed for semantic search. When this flag is set to `FALSE`, the corresponding chunks in `ai_document_chunks` should be deactivated (handled via application or a trigger on the AI document table).

#### `gradebook_entries`
Contains three grade components: `coursework_grade` (30%), `midterm_grade` (30%), `final_grade` (40%). The `total_grade` is a **PostgreSQL Generated Column** (`GENERATED ALWAYS AS ... STORED`) — the database computes and stores it automatically, ensuring it is always consistent without application-side calculation logic. This fulfills **FR-FM2.3**.

When `is_published` is flipped to `TRUE`, the `sync_enrollment_final_grade()` trigger:
1. Computes the letter grade
2. Updates `enrollments.final_grade` and `enrollments.letter_grade`
3. Sets `published_at` timestamp

#### `attendance_sessions`
One row per scheduled class meeting. Supports two smart attendance modes (**FR-FM3.2**):
- **QR Code:** `qr_code` (dynamic token, refreshed every ~10 seconds by app) + `qr_expires_at`
- **Geolocation:** `geo_latitude`, `geo_longitude`, `geo_radius_m` — student's location is validated against these coordinates at check-in

#### `attendance_summaries`
A **materialized summary** table refreshed by the `recalculate_attendance_summary()` trigger after every `attendance_records` change. Stores precomputed `absence_percentage` and `is_dismissed`. This avoids runtime aggregation queries for dashboards (FR-AM3.3, FR-ST3.2).

The trigger also fires the dismissal action: when `absence_percentage >= tenant.absence_threshold`, it sets `is_dismissed = TRUE` and updates `enrollments.status = 'dismissed'`.

---

### 3.5 Messaging & Interaction

**Tables:** `conversations`, `channels`, `channel_members`, `messages`, `message_attachments`

#### Design Decision: Unified `messages` Table
Rather than having separate tables for direct messages and channel messages, a single `messages` table is used with a `message_type` ENUM discriminator. A `CHECK` constraint ensures:
- `direct` messages have `conversation_id` set and `channel_id` NULL
- `channel` messages have `channel_id` set and `conversation_id` NULL

This simplifies queries and notifications.

#### `channels` — Auto-provisioned
When a `sections` row is inserted, the `auto_create_course_channel()` trigger automatically creates a corresponding `channels` row. When a student's `enrollments.status` changes to `enrolled`, the `auto_add_to_course_channel()` trigger adds them to the channel's `channel_members`. Dropping/dismissal removes them. This automates **SR-4** without any application-side provisioning logic.

#### Security Constraint — Executable Files
The `message_attachments` table has a `CHECK` constraint on `mime_type` that blocks common executable MIME types (`.exe`, `.bat`, `.sh`). This provides **database-level enforcement** of **FR-ST4.2**, supplementing application-layer scanning (NFR-SEC4).

---

### 3.6 Circulars & Notifications

**Tables:** `circulars`, `notifications`

#### `circulars`
The `target_type` ENUM (`all`, `department`, `major`, `level`, `section`, `faculty`, `students`) combined with `target_id` (UUID pointing to the relevant entity) implements the targeted broadcast system (**FR-AM4.1**). A `NULL` `tenant_id` on a circular means it was sent by the Super Admin to all universities (**FR-SA3.4**).

#### `notifications`
A fan-out inbox table. The `reference_table` + `reference_id` columns provide a polymorphic pointer to the source entity (e.g., a ticket, an attendance record) enabling deep-linking in the UI. Automated notifications are inserted by:
- `notify_absence_warning()` trigger — for absence warnings/dismissals
- `notify_ticket_status_change()` trigger — for ticket updates
- `send_risk_alerts()` pg_cron job — for risk alerts to instructors

---

### 3.7 AI / Vector Database

**Tables:** `ai_knowledge_documents`, `ai_document_chunks`, `chatbot_conversations`, `chatbot_messages`, `student_recommendations`, `ai_token_usage`

#### Two-Tier Knowledge Base Design

The AI knowledge base is split into two tiers:

| Tier | Source | Table | Who Uploads |
|------|--------|-------|-------------|
| **University Regulations** | Handbooks, bylaws, policies | `ai_knowledge_documents` (section_id = NULL) | Tenant Admin (FR-TA5.1) |
| **Course Content** | Lecture PDFs, slides | `ai_knowledge_documents` (section_id = UUID) | Faculty (FR-FM1.3) |

Only documents where `course_materials.is_ai_approved = TRUE` are processed into chunks.

#### `ai_document_chunks` with `pgvector`

```sql
embedding vector(1536)
```

The `vector(1536)` column stores OpenAI `text-embedding-3-small` output (or any 1536-dimension model). Each chunk is a semantically meaningful paragraph/segment of the source document.

For semantic search, the RAG (Retrieval-Augmented Generation) pipeline:
1. Embeds the user's query into a 1536-dim vector
2. Runs approximate nearest-neighbor search using the IVFFlat index
3. Returns top-K chunks as context for the LLM
4. The `source_chunk_ids` array in `chatbot_messages` records which chunks were used, enabling **citation** (FR-ST5.1 — "page number or video timestamp")

```sql
-- IVFFlat index for fast cosine similarity search
CREATE INDEX idx_chunks_embedding ON ai_document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

The `page_number` and `timestamp_sec` columns allow the chatbot to cite the exact location in the source document.

#### Tenant Isolation in AI
Every `ai_document_chunk` carries `tenant_id`. The RLS policy on `ai_document_chunks` ensures that a student's query only searches vectors from their own university. **University A's lecture notes are never accessible to University B's students** — fulfilling **NFR-SEC1** and **NFR-SEC3**.

#### `ai_token_usage`
Append-only log of every LLM API call with token counts and cost. This enables **FR-SA4.2** (per-tenant AI cost reporting and throttling).

---

### 3.8 Analytics & Predictive

**Tables:** `student_risk_scores`, `course_risk_flags`

#### `student_risk_scores`
The result table populated by the daily `pg_cron` job (or an Edge Function called by pg_cron). Each row represents the risk profile of one student in one section for one semester. The risk score is a composite of three factors:

| Factor | Source Data |
|--------|------------|
| `absence_factor` | `attendance_summaries.absence_percentage` |
| `grade_factor` | `gradebook_entries.total_grade` (coursework + midterm) |
| `engagement_factor` | Message count, material views, submission timeliness |

When `risk_level IN ('high', 'critical')`, the `send_risk_alerts()` pg_cron job inserts notifications to the section's instructor (**FR-AM6.1**, **FR-FM5.1**).

#### `course_risk_flags`
Aggregated at the section level. When `failure_rate_pct` exceeds a threshold or `engagement_drop = TRUE`, the section is `flagged = TRUE` and management is alerted (**FR-AM6.2**).

---

### 3.9 Academic Ticketing

**Tables:** `tickets`, `ticket_messages`, `ticket_attachments`, `approval_workflows`

#### `tickets`
The `ticket_number` column (e.g., `TKT-000042`) is auto-generated by the `generate_ticket_number()` `BEFORE INSERT` trigger, ensuring sequential, human-readable references per tenant (**Section 8 of system_and_supsystems_description.md**).

The `ai_attempted` boolean and `ai_suggestion` text columns implement **FR-ST6.2**: before a ticket is finalized, the application invokes UniBot and stores the result here. If the AI resolved the issue, the student never submits the ticket.

#### `approval_workflows`
Supports multi-step approval chains for sensitive tickets (e.g., grade modification). Each step has an `approver_id`, `step_order`, and `status`. This implements **FR-AM5.4**.

The `notify_ticket_status_change()` trigger automatically notifies `tickets.created_by` on any status transition (**FR-AM5.5**, **FR-ST6.3**).

---

## 4. Multi-Tenancy Design Pattern

### The `tenant_id` Contract

Every table in the system (except `subscription_plans` and `system_announcements`) carries a `tenant_id` FK to `tenants.id`. This is the **architectural contract**:

> **No row belongs to the platform; every row belongs to a university.**

### Helper Functions for RLS

Three helper functions extract tenant context from the JWT:

```sql
-- Reads tenant_id from Supabase JWT custom claim
current_tenant_id() → UUID

-- Reads role from JWT
current_user_role() → TEXT

-- Returns auth.uid()
current_profile_id() → UUID
```

These are `STABLE` SQL functions, so PostgreSQL can inline and cache them within a single query execution. Custom claims must be set during JWT generation (in a Supabase `auth` hook or Edge Function):

```json
{
  "sub": "user-uuid",
  "role": "student",
  "tenant_id": "university-uuid"
}
```

### Data Wipe (FR-SA5.1)
When a contract terminates, a cascade delete on `tenants` will propagate to all `ON DELETE CASCADE` foreign keys, removing all university data. For a "Legal Hard Delete", the Super Admin triggers `DELETE FROM tenants WHERE id = $1` — all 50+ tables clean up via FK cascades.

---

## 5. Row Level Security (RLS) Implementation

### Policy Architecture

RLS is enabled on **all 52 tables**. Policies follow a layered permission model:

```
Super Admin     → Global access (no tenant_id filter)
  └── Tenant Admin   → All rows WHERE tenant_id = current_tenant_id()
        └── Academic Mgmt  → Read-heavy within tenant scope
              └── Faculty   → Own sections only (write), tenant-read (read)
                    └── Student  → Own data only
```

### Policy Naming Convention

```
{role}_{action}_{table}
Examples:
  student_read_own_enrollments
  faculty_manage_own_materials
  admin_all_tickets
  super_admin_all_on_tenants
```

### Key RLS Decisions

| Table | Critical Policy | Reasoning |
|-------|----------------|-----------|
| `profiles` | Students cannot read other students' profiles | Privacy protection |
| `gradebook_entries` | `is_published = TRUE` required for student read | Grades hidden until faculty releases |
| `attendance_records` | Students can INSERT only into open sessions | Prevents retroactive self-check-in |
| `messages` | Only participants in a conversation can read it | DM privacy |
| `ai_document_chunks` | Filtered by `tenant_id` on every query | Cross-tenant AI isolation |
| `audit_logs` | No UPDATE/DELETE policies (append-only) | Tamper-proof audit trail |
| `ticket_messages` | `is_internal = FALSE` filter for non-admins | Hides internal staff notes from students |

---

## 6. Supabase Auth Integration

### Profile Linkage

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ...
);
```

The `profiles.id` is identical to `auth.users.id` (Supabase Auth UUID). This eliminates the need for a separate foreign key lookup. On user deletion from `auth.users`, the profile cascades automatically.

### Custom Claims via JWT Hook

Role and tenant context are injected into the JWT via a Supabase Auth Hook (Edge Function or Database Function):

```sql
-- Example custom_access_token hook (runs on every token issue)
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = (event->>'user_id')::UUID;
    RETURN jsonb_set(
        event,
        '{claims}',
        event->'claims'
            || jsonb_build_object('role', v_profile.role)
            || jsonb_build_object('tenant_id', v_profile.tenant_id)
    );
END;
$$;
```

This ensures every API request carries the user's role and tenant_id in the JWT, which the RLS helper functions (`current_user_role()`, `current_tenant_id()`) read via `current_setting('request.jwt.claims')`.

### Bulk Import (FR-TA3.1)
For CSV bulk import, the Tenant Admin calls a service-role Edge Function that:
1. Creates users in `auth.users` via Supabase Admin API
2. Inserts corresponding rows in `profiles`, `student_profiles`/`faculty_profiles`
3. Inserts `student_majors` links
4. All in a single database transaction

---

## 7. pgvector Implementation

### Embedding Pipeline

```
Faculty uploads PDF (is_ai_approved = TRUE)
    ↓
Edge Function triggered (via Supabase Storage webhook)
    ↓
Text extraction (PDF → text chunks, ~500 tokens each)
    ↓
OpenAI Embeddings API (text-embedding-3-small → 1536 dims)
    ↓
INSERT into ai_document_chunks (content, embedding, page_number, ...)
    ↓
UPDATE ai_knowledge_documents SET total_chunks = N
```

### Semantic Search Query

```sql
-- Find top 5 most relevant chunks to a user's query embedding
SELECT
    adc.content,
    adc.page_number,
    adc.timestamp_sec,
    akd.title AS document_title,
    1 - (adc.embedding <=> $1::vector) AS similarity
FROM ai_document_chunks adc
JOIN ai_knowledge_documents akd ON akd.id = adc.document_id
WHERE adc.tenant_id = $2
  AND akd.is_active = TRUE
ORDER BY adc.embedding <=> $1::vector
LIMIT 5;
```

The `<=>` operator computes cosine distance. The IVFFlat index (`lists = 100`) accelerates this from O(n) to approximately O(√n), suitable for millions of chunks.

### Tenant Isolation in Vector Search
The `WHERE adc.tenant_id = $2` clause (enforced by RLS) guarantees university-specific semantic search. University A's faculty notes are never returned for University B's student queries.

### AI Knowledge Base Deactivation (FR-TA5.2)
When a Tenant Admin deletes a knowledge document:
```sql
UPDATE ai_knowledge_documents SET is_active = FALSE WHERE id = $1;
-- Chunks remain for audit; RLS filters out inactive docs from search
```
This implements "soft delete" — the AI immediately stops using the document (RLS only returns `is_active = TRUE` docs) while preserving data for audit.

---

## 8. Triggers & Automated Functions

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `trg_*_updated_at` | All mutable tables | BEFORE UPDATE | Sets `updated_at = NOW()` |
| `trg_enrollments_sync_count` | `enrollments` | AFTER INSERT/UPDATE/DELETE | Updates `sections.enrolled_count` |
| `trg_check_schedule_conflicts` | `schedules` | BEFORE INSERT/UPDATE | Raises exception on venue/faculty conflict |
| `trg_sync_final_grade` | `gradebook_entries` | BEFORE UPDATE | Syncs letter grade to `enrollments` on publish |
| `trg_recalc_attendance_summary` | `attendance_records` | AFTER INSERT/UPDATE/DELETE | Recomputes `attendance_summaries`, triggers dismissal |
| `trg_notify_absence_warning` | `attendance_summaries` | AFTER INSERT/UPDATE | Inserts warning/dismissal notification |
| `trg_auto_create_course_channel` | `sections` | AFTER INSERT | Creates messaging channel for new section |
| `trg_auto_channel_membership` | `enrollments` | AFTER INSERT/UPDATE | Adds/removes student from course channel |
| `trg_update_conversation_timestamp` | `messages` | AFTER INSERT | Updates `conversations.last_message_at` |
| `trg_generate_ticket_number` | `tickets` | BEFORE INSERT | Generates sequential `TKT-XXXXXX` number |
| `trg_notify_ticket_status` | `tickets` | AFTER UPDATE | Notifies ticket creator on status change |

### Trigger Design Philosophy

- **BEFORE triggers** are used for validation and data mutation (conflict check, number generation)
- **AFTER triggers** are used for side-effects (notifications, channel membership, counter sync)
- All trigger functions use `COALESCE(NEW, OLD)` to handle both INSERT and DELETE safely

---

## 9. pg_cron Scheduled Jobs

| Job Name | Schedule | Action | Requirement |
|----------|----------|--------|-------------|
| `refresh-student-risk-levels` | `0 2 * * *` (2am daily) | Syncs `student_profiles.risk_level` from latest `student_risk_scores` | NFR-AI2 |
| `send-risk-alerts` | `30 2 * * *` (2:30am daily) | Inserts notifications for unalerted high/critical risk students | FR-AM6.1 |
| `generate-renewal-invoices` | `0 8 1 * *` (8am, 1st of month) | Creates invoices for subscriptions expiring within 30 days | FR-SA2.2 |
| `archive-old-chatbot-sessions` | `0 3 * * 0` (3am Sunday) | Marks chatbot sessions >90 days old as inactive | Data hygiene |

> **Note:** The actual ML risk scoring computation (combining attendance, grades, engagement) is expected to run in a Supabase Edge Function (Python/JS) triggered by pg_cron or an HTTP call. The `student_risk_scores` table receives the results. The DB-level `refresh_student_risk_levels()` function then propagates those results to the denormalized `student_profiles` columns.

---

## 10. Requirements Traceability Matrix

| Requirement ID | Description | Tables / Features |
|----------------|-------------|-------------------|
| **SR-1** | Multi-tenant SaaS | `tenants`, `tenant_id` on all tables, RLS |
| **SR-2** | Academic Affairs | `colleges`, `departments`, `majors`, `courses`, `schedules` |
| **SR-3** | LMS & Attendance | `course_materials`, `assignments`, `submissions`, `gradebook_entries`, `attendance_*` |
| **SR-4** | Messaging | `conversations`, `channels`, `messages`, `message_attachments` |
| **SR-5** | Circulars & Alerts | `circulars`, `notifications`, `notify_absence_warning()` trigger |
| **SR-6** | UniBot AI | `ai_knowledge_documents`, `ai_document_chunks` (pgvector), `chatbot_*` |
| **SR-7** | Predictive Analytics | `student_risk_scores`, `course_risk_flags`, pg_cron jobs |
| **SR-8** | Ticketing | `tickets`, `ticket_messages`, `ticket_attachments`, `approval_workflows` |
| **FR-SA1.1** | Tenant provisioning | `tenants` INSERT + cascade schema |
| **FR-SA1.2** | Domain mapping | `tenants.subdomain`, `tenants.custom_domain` |
| **FR-SA1.3** | Tenant status | `tenants.status` ENUM |
| **FR-SA1.4** | Resource quotas | `tenants.max_users`, `tenants.max_storage_gb` |
| **FR-SA2.1** | Subscription plans | `subscription_plans` |
| **FR-SA2.2** | Renewal invoices | `invoices`, `generate_renewal_invoices()` pg_cron |
| **FR-SA4.2** | AI token monitoring | `ai_token_usage` |
| **FR-SA5.1** | Data wipe | CASCADE DELETE on `tenants` |
| **FR-SA5.3** | Impersonation logging | `audit_logs` with `action = 'impersonate'` |
| **FR-TA1.1** | Branding | `tenants.logo_url`, `primary_color`, `secondary_color` |
| **FR-TA1.2** | Academic calendar | `semesters.reg_start/end`, `add_drop_start/end` |
| **FR-TA1.4** | Semester archiving | `semesters.status = 'archived'` |
| **FR-TA2.1** | Org tree | `colleges → departments → majors` |
| **FR-TA2.2** | Levels & semesters | `academic_levels`, `semesters` |
| **FR-TA2.3** | Course catalog | `courses` |
| **FR-TA2.4** | Study plan + prerequisites | `study_plan_courses`, `course_prerequisites` |
| **FR-TA3.2** | RBAC | `custom_roles`, `profile_custom_roles` |
| **FR-TA4.1** | Venue definition | `venues` |
| **FR-TA5.1** | AI knowledge base upload | `ai_knowledge_documents` (doc_type = 'regulation') |
| **FR-TA5.2** | AI knowledge deactivation | `ai_knowledge_documents.is_active = FALSE` |
| **FR-TA6.1** | Global circulars | `circulars` (target_type = 'all') |
| **FR-TA6.2** | Audit logs | `audit_logs` |
| **FR-AM1.1** | Syllabus approval | `syllabi.status = 'approved'` |
| **FR-AM1.2** | Teaching workload | `sections.instructor_id` |
| **FR-AM1.3** | Section management | `sections.status`, `sections.merged_into_id` |
| **FR-AM1.4** | Registration rules | `semesters.min/max_credit_hours`, `semesters.self_reg_enabled` |
| **FR-AM1.5** | Batch enrollment | `enrollments` (bulk INSERT) |
| **FR-AM2.1** | Schedule construction | `schedules` |
| **FR-AM2.2** | Conflict detection | `check_schedule_conflicts()` trigger |
| **FR-AM2.3** | Schedule publishing | `schedules.status = 'published'` |
| **FR-AM4.1** | Targeted circulars | `circulars.target_type`, `circulars.target_id` |
| **FR-AM5.1** | Ticket dashboard | `tickets` with category/priority/status filters |
| **FR-AM5.4** | Approval workflows | `approval_workflows` |
| **FR-AM5.5** | Ticket resolution notification | `notify_ticket_status_change()` trigger |
| **FR-AM6.1** | At-risk alerts | `student_risk_scores`, `send_risk_alerts()` pg_cron |
| **FR-AM6.2** | Course risk flags | `course_risk_flags` |
| **FR-FM1.2** | Content upload | `course_materials` |
| **FR-FM1.3** | AI tagging | `course_materials.is_ai_approved` |
| **FR-FM2.1** | Assignment creation | `assignments` |
| **FR-FM2.2** | Grading submissions | `submissions.grade`, `submissions.feedback` |
| **FR-FM2.3** | Gradebook | `gradebook_entries` |
| **FR-FM3.1** | Manual attendance | `attendance_records` (status = 'present'/'absent') |
| **FR-FM3.2** | Smart attendance | `attendance_sessions.qr_code`, `geo_latitude/longitude` |
| **FR-FM3.3** | Retrospective attendance | `attendance_records.modified_by`, `modification_reason` |
| **FR-FM4.1** | Channel admin | `channels.is_readonly`, `messages.is_pinned` |
| **FR-FM4.2** | Office hours | `faculty_profiles.office_hours` (JSONB) |
| **FR-FM4.3** | DND mode | `profiles.is_dnd_active`, `profiles.dnd_message` |
| **FR-FM5.2** | Recommendations | `student_recommendations` |
| **FR-FM6.1** | Faculty ticket submission | `tickets` (created_by = faculty profile_id) |
| **FR-ST2.2** | Assignment submission | `submissions` |
| **FR-ST2.3** | Grade tracking | `gradebook_entries` (is_published = TRUE) |
| **FR-ST3.1** | QR / Geo check-in | `attendance_records` INSERT policy (open sessions only) |
| **FR-ST3.2** | Absence monitoring | `attendance_summaries.absence_percentage`, `notify_absence_warning()` |
| **FR-ST5.1** | Academic AI queries | `ai_document_chunks` semantic search, `source_chunk_ids` citations |
| **FR-ST5.2** | Admin AI queries | `ai_knowledge_documents` (doc_type = 'regulation') |
| **FR-ST6.1** | Ticket submission | `tickets` (student RLS INSERT policy) |
| **FR-ST6.2** | AI pre-resolution | `tickets.ai_attempted`, `tickets.ai_suggestion` |
| **FR-ST6.3** | Ticket tracking | `tickets.status`, `ticket_messages` |
| **NFR-SEC1** | Tenant data isolation | `tenant_id` + RLS on all 52 tables |
| **NFR-SEC3** | AI data privacy | Chunk-level `tenant_id` isolation in vector search |
| **NFR-AI2** | 24h risk refresh | `refresh-student-risk-levels` pg_cron job |

---

## 11. ENUM Reference

| ENUM Name | Values |
|-----------|--------|
| `tenant_status` | active, suspended, deleted |
| `subscription_plan` | basic, pro, enterprise |
| `subscription_status` | active, pending, expired, cancelled |
| `invoice_status` | draft, sent, paid, overdue |
| `user_role` | super_admin, tenant_admin, academic_management, faculty, student |
| `account_status` | active, suspended, terminated |
| `gender` | male, female |
| `course_type` | theoretical, practical, hybrid |
| `semester_type` | first, second, summer |
| `semester_status` | planning, active, archived |
| `section_status` | open, closed, archived, merged |
| `schedule_day` | sunday, monday, tuesday, wednesday, thursday, friday, saturday |
| `venue_type` | lecture_hall, lab, auditorium, other |
| `schedule_status` | draft, published |
| `plan_course_type` | mandatory, elective |
| `enrollment_status` | enrolled, dropped, completed, failed, dismissed, withdrawn |
| `attendance_status` | present, absent, late, excused |
| `content_type` | video, pdf, audio, presentation, document, link, other |
| `submission_status` | submitted, late, graded, resubmit_requested |
| `syllabus_status` | draft, submitted, approved, rejected |
| `message_type` | direct, channel |
| `message_status` | sent, delivered, read |
| `channel_type` | course, department, announcement, direct |
| `notification_type` | circular, absence_warning, absence_dismissal, grade_released, assignment_due, ticket_update, system, risk_alert, recommendation, schedule_change, cancellation |
| `circular_target_type` | all, department, major, level, section, faculty, students |
| `ai_document_type` | regulation, course_material, handbook, policy, other |
| `risk_level` | low, medium, high, critical |
| `ticket_status` | open, in_progress, pending_info, resolved, closed, rejected |
| `ticket_priority` | low, medium, high, urgent |
| `ticket_category` | grade_appeal, absence_excuse, registration_issue, schedule_change, venue_issue, technical_problem, administrative, other |
| `approval_status` | pending, approved, rejected |
| `audit_action` | create, update, delete, login, logout, impersonate, grade_modify, permission_change, file_delete, status_change, ticket_resolve, attendance_modify, data_wipe |

---

## 12. Complete Table Inventory

### Part 1 — Core System (26 tables)

| # | Table | Module |
|---|-------|--------|
| 1 | `subscription_plans` | Platform |
| 2 | `tenants` | Platform |
| 3 | `subscriptions` | Platform |
| 4 | `invoices` | Platform |
| 5 | `system_announcements` | Platform |
| 6 | `profiles` | Identity |
| 7 | `custom_roles` | Identity |
| 8 | `profile_custom_roles` | Identity |
| 9 | `faculty_profiles` | Identity |
| 10 | `student_profiles` | Identity |
| 11 | `audit_logs` | Identity |
| 12 | `colleges` | Academic Structure |
| 13 | `departments` | Academic Structure |
| 14 | `faculty_departments` | Academic Structure |
| 15 | `majors` | Academic Structure |
| 16 | `student_majors` | Academic Structure |
| 17 | `academic_levels` | Academic Structure |
| 18 | `courses` | Academic Structure |
| 19 | `study_plan_courses` | Academic Structure |
| 20 | `course_prerequisites` | Academic Structure |
| 21 | `semesters` | Academic Structure |
| 22 | `venues` | Academic Structure |
| 23 | `sections` | Academic Structure |
| 24 | `enrollments` | Academic Structure |
| 25 | `schedules` | Academic Structure |
| 26 | `syllabi` | Academic Structure |

### Part 2 — Application Modules (26 tables)

| # | Table | Module |
|---|-------|--------|
| 27 | `course_materials` | LMS |
| 28 | `assignments` | LMS |
| 29 | `submissions` | LMS |
| 30 | `gradebook_entries` | LMS |
| 31 | `attendance_sessions` | Attendance |
| 32 | `attendance_records` | Attendance |
| 33 | `attendance_summaries` | Attendance |
| 34 | `conversations` | Messaging |
| 35 | `channels` | Messaging |
| 36 | `channel_members` | Messaging |
| 37 | `messages` | Messaging |
| 38 | `message_attachments` | Messaging |
| 39 | `circulars` | Circulars |
| 40 | `notifications` | Circulars |
| 41 | `ai_knowledge_documents` | AI |
| 42 | `ai_document_chunks` | AI |
| 43 | `chatbot_conversations` | AI |
| 44 | `chatbot_messages` | AI |
| 45 | `student_recommendations` | AI |
| 46 | `ai_token_usage` | AI |
| 47 | `student_risk_scores` | Analytics |
| 48 | `course_risk_flags` | Analytics |
| 49 | `tickets` | Ticketing |
| 50 | `ticket_messages` | Ticketing |
| 51 | `ticket_attachments` | Ticketing |
| 52 | `approval_workflows` | Ticketing |

**Total: 52 tables | 26 ENUMs | 11 triggers | 4 pg_cron jobs | ~110 RLS policies**

---

## 13. Architectural Improvements & Suggestions

Based on expert analysis of the requirements and the designed schema, the following improvements are recommended for production hardening:

### 13.1 Partitioning for High-Volume Tables

As the platform grows to serve hundreds of universities, three tables will accumulate millions of rows rapidly:

| Table | Partitioning Strategy | Rationale |
|-------|-----------------------|-----------|
| `notifications` | By `created_at` (monthly range partitioning) | Queried by date; old notifications rarely accessed |
| `audit_logs` | By `created_at` (monthly range partitioning) | Compliance retention windows |
| `chatbot_messages` | By `tenant_id` (hash partitioning) | Uniform distribution; AI queries are per-tenant |

```sql
-- Example: partition notifications by month
CREATE TABLE notifications PARTITION BY RANGE (created_at);
CREATE TABLE notifications_2025_01 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 13.2 Materialized Views for Dashboards

The "Department Pulse" dashboard (FR-AM3.1) and "Risk Zone" views (FR-FM5.1) involve aggregating across multiple tables. Recommend creating **materialized views** refreshed every 15 minutes:

```sql
-- Example: department pulse materialized view
CREATE MATERIALIZED VIEW mv_department_pulse AS
SELECT
    d.id AS department_id,
    d.tenant_id,
    COUNT(DISTINCT e.student_id) AS active_students,
    AVG(at_sum.absence_percentage) AS avg_absence_pct,
    COUNT(DISTINCT a.id) AS assignments_due_today
FROM departments d
JOIN majors m ON m.department_id = d.id
-- ... joins omitted for brevity
GROUP BY d.id, d.tenant_id;

CREATE UNIQUE INDEX ON mv_department_pulse(department_id);
```

### 13.3 Full-Text Search Complement to pgvector

For ticket search and message search (where semantic meaning matters less than keyword matching), add a `tsvector` column with a GIN index:

```sql
ALTER TABLE tickets ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('arabic', coalesce(title,'') || ' ' || coalesce(description,''))
    ) STORED;
CREATE INDEX idx_tickets_search ON tickets USING GIN(search_vector);
```

This enables efficient Arabic full-text search over ticket content.

### 13.4 Soft Delete Pattern

Currently, `ON DELETE CASCADE` is used on most FK relationships. For a production SaaS, **soft deletes** (adding `deleted_at TIMESTAMPTZ`) are recommended on key tables like `sections`, `course_materials`, and `enrollments`. This allows:
- Data recovery after accidental deletion
- Historical audit of what existed during a semester
- Gradual archiving rather than hard deletes

The `tenants` table already implements this pattern with `deleted_at`.

### 13.5 GPA Calculation Denormalization

The `student_profiles.cumulative_gpa` and `earned_credit_hours` columns are currently manual fields. Recommend a trigger on `gradebook_entries` (when `is_published = TRUE`) that:
1. Sums weighted grade points from all completed enrollments
2. Divides by total credit hours
3. Updates `student_profiles.cumulative_gpa` automatically

This powers the **Virtual GPA Calculator** (FR-ST1.3) with live data.

### 13.6 pgvector HNSW Index for Production

The current IVFFlat index is good for initial deployment. For production at scale (>1M chunks per tenant), upgrade to **HNSW** (Hierarchical Navigable Small World), which offers:
- Better recall accuracy (>99% vs ~95% for IVFFlat)
- Faster query times at high vector counts
- No need for a training step (unlike IVFFlat's `lists` parameter)

```sql
-- Production upgrade path
DROP INDEX idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding_hnsw ON ai_document_chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

### 13.7 Rate Limiting via pg_cron

To implement **FR-SA5.2** (rate limiting per tenant) at the database level, maintain a `tenant_api_usage` table and use pg_cron to reset counters every minute. Alternatively, handle this at the API Gateway level (Supabase Edge Functions + Upstash Redis), which is more appropriate for sub-second rate limiting.

### 13.8 Prerequisite Validation at Enrollment

Currently, `course_prerequisites` stores the graph but enforcement is expected at the application layer. For a truly safe system, add a database-level check function:

```sql
CREATE OR REPLACE FUNCTION check_prerequisites(
    p_student_id UUID,
    p_course_id UUID,
    p_tenant_id UUID
) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM course_prerequisites cp
        WHERE cp.course_id = p_course_id
          AND cp.tenant_id = p_tenant_id
          AND NOT EXISTS (
              SELECT 1 FROM enrollments e
              JOIN sections sec ON sec.id = e.section_id
              WHERE e.student_id = p_student_id
                AND sec.course_id = cp.prerequisite_id
                AND e.status = 'completed'
                AND COALESCE(e.final_grade, 0) >= cp.min_grade
          )
    );
$$;
```

Call this function in an enrollment trigger or as a pre-check in the application.

---

*Document generated for UniBot Platform Database — Version 1.0*
*Architecture: Supabase / PostgreSQL 15+ | pgvector 0.7+ | pg_cron 1.6+*
