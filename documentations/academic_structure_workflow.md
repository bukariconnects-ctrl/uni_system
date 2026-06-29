# Academic Structure & Workflow — UniBot Platform

> **Scope:** This document covers the complete academic structure of the UniBot multi-tenant university platform: how it is modelled in the database, which user roles interact with each layer, and the end-to-end operational workflow from creating a campus to a student sitting in a graded course section.

---

## Table of Contents

1. [System Overview & Multi-Tenancy](#1-system-overview--multi-tenancy)
2. [User Roles & Access Model](#2-user-roles--access-model)
3. [Academic Structure Hierarchy](#3-academic-structure-hierarchy)
4. [Database Tables — Academic Domain](#4-database-tables--academic-domain)
5. [Semester Lifecycle](#5-semester-lifecycle)
6. [Course Catalog & Study Plans](#6-course-catalog--study-plans)
7. [Course Sections](#7-course-sections)
8. [Timetable & Scheduling](#8-timetable--scheduling)
9. [Student Enrollment](#9-student-enrollment)
10. [Attendance System](#10-attendance-system)
11. [Gradebook & GPA](#11-gradebook--gpa)
12. [Syllabus Management](#12-syllabus-management)
13. [Key DB Triggers & Guards](#13-key-db-triggers--guards)
14. [RLS Policy Summary](#14-rls-policy-summary)
15. [End-to-End Setup Walkthrough](#15-end-to-end-setup-walkthrough)
16. [File & Code Map](#16-file--code-map)

---

## 1. System Overview & Multi-Tenancy

UniBot is a **multi-tenant SaaS** platform. Each university is an isolated **tenant**. All academic data — colleges, departments, courses, sections, enrollments, grades — is scoped to a `tenant_id` UUID column that is present on every table.

```
Super Admin (platform level)
  └── Tenant (University)
        ├── tenant_admin       — university IT / admin
        ├── academic_management — registrar / scheduling office
        ├── faculty            — instructors
        └── student
```

The Supabase project URL is `https://leduumxihcngowpaujkr.supabase.co`.  
Row-Level Security (RLS) is enabled on **every** table. JWT custom claims (`tenant_id`, `role`, `profile_id`) are injected by a custom access-token hook and are used by all RLS helper functions:

| Helper Function | Returns |
|---|---|
| `current_tenant_id()` | UUID from JWT claim `tenant_id` |
| `current_user_role()` | Text from JWT claim `role` |
| `current_profile_id()` | `auth.uid()` |

---

## 2. User Roles & Access Model

| Role | Enum Value | Academic Responsibilities |
|---|---|---|
| **Super Admin** | `super_admin` | Platform-wide; creates tenants, subscription plans |
| **Tenant Admin** | `tenant_admin` | Creates campuses, colleges, departments, majors, levels, courses, semesters, venues, study plans |
| **Academic Management** | `academic_management` | Creates sections, schedules, manages enrollments, attendance reports |
| **Faculty** | `faculty` | Manages own section: uploads materials, posts assignments, records attendance, enters grades, writes syllabus |
| **Student** | `student` | Self-registers (if enabled), views schedule/grades/attendance, submits assignments, opens tickets |

---

## 3. Academic Structure Hierarchy

The hierarchy flows strictly top-down. Each node must exist before the next level can be created.

```
Tenant (University)
└── Campus  [optional grouping for multi-campus universities]
    └── College
        └── Department
            ├── Faculty (faculty_departments — many-to-many)
            └── Major (Program)
                └── Academic Level  (Level 1 … Level N, auto-created from duration_years)
                    └── Study Plan Course  (course × level × semester_type × mandatory|elective)
                         └── Course Prerequisite (course → prerequisite course)

Semester  [independent, tenant-scoped]
    └── Section  (course × semester × section_code)
        ├── Lab Section  (parent_section_id → lecture section)
        ├── Schedule     (section × venue × day × time)
        ├── Enrollment   (student → section)
        ├── Attendance Session → Attendance Records → Attendance Summary
        ├── Gradebook Entry
        ├── Course Materials
        ├── Assignments → Submissions
        └── Syllabus
```

---

## 4. Database Tables — Academic Domain

### 4.1 Infrastructure Tables

| Table | Key Columns | Created By |
|---|---|---|
| `campuses` | `tenant_id`, `name`, `location`, `is_active` | `tenant_admin` |
| `colleges` | `tenant_id`, `campus_id`, `name`, `code`, `dean_id`, `absence_threshold` | `tenant_admin` |
| `departments` | `tenant_id`, `college_id`, `name`, `code`, `head_id` | `tenant_admin` |
| `majors` | `tenant_id`, `department_id`, `name`, `code`, `total_credits`, `duration_years` | `tenant_admin` |
| `academic_levels` | `tenant_id`, `major_id`, `level_number`, `name` | `tenant_admin` (auto on major create) |
| `venues` | `tenant_id`, `campus_id`, `name`, `code`, `venue_type`, `capacity`, `is_active` | `tenant_admin` |

### 4.2 Assignment Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `faculty_departments` | `faculty_id`, `department_id`, `tenant_id`, `is_primary` | Maps a faculty member to one or more departments |
| `student_majors` | `student_id`, `major_id`, `tenant_id`, `is_primary` | Maps a student to their major(s) |
| `custom_roles` | `tenant_id`, `name`, `permissions` (JSONB) | Tenant-defined sub-roles (e.g., Dean, Registrar) |
| `profile_custom_roles` | `profile_id`, `custom_role_id` | Assigns custom roles to profiles |

### 4.3 Curriculum Tables

| Table | Key Columns | Unique Constraint |
|---|---|---|
| `courses` | `tenant_id`, `department_id`, `code`, `name`, `credit_hours`, `course_type` | `(tenant_id, code)` |
| `study_plan_courses` | `tenant_id`, `academic_level_id`, `course_id`, `semester_type`, `plan_course_type`, `min_grade_to_pass` | `(academic_level_id, course_id, semester_type)` |
| `course_prerequisites` | `tenant_id`, `course_id`, `prerequisite_id`, `min_grade` | `(course_id, prerequisite_id)` |

`course_type` ∈ `{ theoretical, practical, hybrid }`  
`plan_course_type` ∈ `{ mandatory, elective }`

### 4.4 Semester & Calendar Tables

| Table | Key Columns |
|---|---|
| `semesters` | `tenant_id`, `academic_year`, `semester_type`, `name`, `status`, `start_date`, `end_date`, `reg_start`, `reg_end`, `add_drop_start`, `add_drop_end`, `grade_freeze_at`, `self_reg_enabled` |

`semester_type` ∈ `{ first, second, summer }`  
`semester_status` ∈ `{ planning → registration → active → grade_freeze → archived }`

### 4.5 Section & Schedule Tables

| Table | Key Columns |
|---|---|
| `sections` | `tenant_id`, `course_id`, `semester_id`, `section_code`, `instructor_id`, `status`, `max_capacity`, `enrolled_count`, `section_type`, `parent_section_id`, `merged_into_id` |
| `schedules` | `tenant_id`, `section_id`, `venue_id`, `day_of_week`, `start_time`, `end_time`, `status` |
| `syllabi` | `tenant_id`, `section_id`, `instructor_id`, `status`, `content` (JSONB), `reviewed_by` |

`section_type` ∈ `{ lecture, lab, tutorial }`  
`section_status` ∈ `{ open, closed, archived, merged }`  
`schedule_status` ∈ `{ draft, published }`

### 4.6 Enrollment & Attendance Tables

| Table | Key Columns |
|---|---|
| `enrollments` | `tenant_id`, `student_id`, `section_id`, `semester_id`, `status`, `final_grade`, `letter_grade` |
| `attendance_sessions` | `tenant_id`, `section_id`, `schedule_id`, `session_date`, `start_time`, `qr_code`, `is_open` |
| `attendance_records` | `tenant_id`, `session_id`, `student_id`, `section_id`, `status`, `check_in_time`, `method` |
| `attendance_summaries` | `enrollment_id`, `total_sessions`, `attended_sessions`, `absence_percentage`, `is_dismissed` |

`enrollment_status` ∈ `{ enrolled, dropped, completed, failed, dismissed, withdrawn }`  
`attendance_status` ∈ `{ present, absent, late, excused }`

### 4.7 LMS Tables

| Table | Key Columns |
|---|---|
| `course_materials` | `section_id`, `uploaded_by`, `title`, `content_type`, `is_published`, `is_ai_approved` |
| `assignments` | `section_id`, `created_by`, `title`, `max_grade`, `due_date`, `allow_late`, `is_published` |
| `submissions` | `assignment_id`, `student_id`, `file_url`, `status`, `grade`, `graded_by` |
| `gradebook_entries` | `enrollment_id`, `coursework_grade` (30%), `midterm_grade` (30%), `final_grade` (40%), `total_grade` (GENERATED), `is_published` |

---

## 5. Semester Lifecycle

Semesters are created and managed exclusively by the **Tenant Admin** via `/tenant-admin/calendar`.

### 5.1 State Machine

```
planning ──→ registration ──→ active ──→ grade_freeze ──→ archived
    │                                                         ▲
    └──────────────────────────────────────────────────────────
          (planning → active is also allowed, skipping registration)
```

The `guard_semester_state_transition()` trigger **enforces** this flow at the database level. Any illegal transition (e.g., `archived → planning`) raises `INVALID_STATE_TRANSITION`.

### 5.2 State Meanings

| Status | Meaning |
|---|---|
| `planning` | Semester exists, no enrollments allowed; sections can be created |
| `registration` | Student enrollment is open; sections are being filled |
| `active` | Semester is running; attendance, grades, assignments are live |
| `grade_freeze` | No new grade entries allowed; final grades are being audited |
| `archived` | Semester is closed; all data is read-only |

### 5.3 Server Action

```typescript
// /src/app/tenant-admin/calendar/actions.ts
updateSemesterStatus(id, status)
```

Calling this with `grade_freeze` or `archived` also sets `grade_freeze_at = NOW()`.

---

## 6. Course Catalog & Study Plans

### 6.1 Course Catalog — Tenant Admin

Managed via `/tenant-admin/courses`. A course is a **reusable template** in the tenant catalog; it does not belong to a semester by itself.

```typescript
// createCourse fields
{
  tenant_id, department_id, code, name,
  description, credit_hours, course_type: 'theoretical' | 'practical' | 'hybrid'
}
```

Unique constraint: `(tenant_id, code)` — no two courses can share the same code within a university.

### 6.2 Study Plan — Tenant Admin

Managed via `/tenant-admin/study-plans`. A study plan links a **course** to a specific **academic level** in a **major**, designating which semester type it should be offered and whether it is mandatory or elective.

```typescript
// addStudyPlanCourse fields
{
  tenant_id, academic_level_id, course_id,
  semester_type: 'first' | 'second' | 'summer',
  plan_course_type: 'mandatory' | 'elective',
  min_grade_to_pass: number   // default 60
}
```

Unique constraint: `(academic_level_id, course_id, semester_type)` — a course appears only once per level per semester slot.

### 6.3 Prerequisites — Tenant Admin

Also managed on the study-plans page. A prerequisite declares that a student must pass course X (with a minimum grade) before enrolling in course Y.

```typescript
// addPrerequisite fields
{
  tenant_id, course_id, prerequisite_id, min_grade
}
```

The DB constraint `chk_no_self_prerequisite` prevents a course from being its own prerequisite.

### 6.4 Auto Academic Level Creation

When a Major is created with `duration_years = N`, the `createMajor` server action automatically inserts N rows into `academic_levels` (Level 1 through Level N), naming them in Arabic: المستوى الأول, الثاني, etc.

---

## 7. Course Sections

Sections are the **operational instances** of a course in a given semester. Managed by **Academic Management** via `/academic-management/sections`.

### 7.1 Lecture Section

```typescript
// createSection fields
{
  tenant_id, course_id, semester_id, section_code,
  instructor_id,     // optional at creation; assigned later
  max_capacity,      // default 40
  section_type: 'lecture',
  status: 'open'
}
```

A DB trigger (`trg_auto_create_course_channel`) fires after insert and **automatically creates** a course messaging channel for this section.

### 7.2 Lab Section (Child Section)

For `hybrid` or `practical` courses, lab sections are child sections of a lecture section:

```typescript
// createLabSection fields
{
  tenant_id, course_id (inherited), semester_id (inherited),
  section_code,
  instructor_id,
  max_capacity,      // default 20
  parent_section_id, // UUID of parent lecture section
  section_type: 'lab',
  status: 'open'
}
```

Validation: a lab section cannot be the parent of another lab section.

### 7.3 Section States

| Status | Meaning |
|---|---|
| `open` | Accepting enrollments |
| `closed` | No new enrollments; section is running |
| `archived` | Semester ended; data retained |
| `merged` | Students were merged into another section (`merged_into_id` set) |

### 7.4 Enrolled Count Sync

The `sync_section_enrolled_count()` trigger keeps `sections.enrolled_count` accurate after every insert, update, or delete on `enrollments`.

---

## 8. Timetable & Scheduling

Managed by **Academic Management** via `/academic-management/schedules`.

### 8.1 Schedule Record

```typescript
// createSchedule fields
{
  tenant_id, section_id, venue_id,
  day_of_week: 'sunday' | 'monday' | ... | 'saturday',
  start_time, end_time,
  status: 'draft'   // published by AM after review
}
```

### 8.2 Conflict Detection (DB Trigger)

The `check_schedule_conflicts()` trigger fires **BEFORE INSERT OR UPDATE** on `schedules` and raises an exception for any of three conflict types:

| Conflict | Condition | Error |
|---|---|---|
| **Spatial** | Same venue, same day, overlapping time, same semester | `SPATIAL_CONFLICT` |
| **Faculty** | Same instructor, same day, overlapping time, same semester | `FACULTY_CONFLICT` |
| **Student** | Two **mandatory** courses at the **same academic level**, same day, overlapping time | `STUDENT_CONFLICT` |

The conflict detector also respects **campus isolation**: a venue on Campus A cannot spatially conflict with Campus B even if the venue code is the same.

### 8.3 Schedule Statuses

- `draft` — created but not visible to students
- `published` — visible; triggers `schedule_change` notifications when updated

---

## 9. Student Enrollment

Managed by **Academic Management** via `/academic-management/enrollments`.

### 9.1 Enrollment Guard

The `guard_enrollment_semester_state()` trigger blocks enrollment inserts when the semester is in any status other than `registration` or `active`.

### 9.2 Batch Enrollment

```typescript
batchEnroll(sectionId, semesterId, studentIds[], labSectionId?)
```

- For a `hybrid` lecture section, `labSectionId` **is required**.
- Each student is enrolled in the lecture section first; if hybrid, also in the specified lab section.
- Errors are collected per student and returned as a results summary (non-atomic by design to allow partial success).

### 9.3 Enrollment Status Flow

```
enrolled → dropped     (manual by AM / student during add-drop period)
enrolled → dismissed   (automatic by DB trigger when absence > threshold)
enrolled → completed   (set by system when grades published, final_grade ≥ pass grade)
enrolled → failed      (set by system when final_grade < pass grade)
enrolled → withdrawn   (administrative withdrawal)
```

### 9.4 Auto Channel Membership

The `trg_auto_channel_membership` trigger on `enrollments`:
- On `status = 'enrolled'` → adds student to the course's messaging channel
- On `status IN ('dropped', 'dismissed', 'withdrawn')` → removes them from the channel

---

## 10. Attendance System

### 10.1 Attendance Session

Created by **Faculty** per class meeting. Each session is linked to a section and optionally to a schedule slot.

```
attendance_sessions
  ├── session_date, start_time, end_time
  ├── qr_code + qr_expires_at   (for QR-based check-in)
  ├── geo_latitude/longitude + geo_radius_m  (for geo-fenced check-in)
  └── is_open  (true = students can check in right now)
```

### 10.2 Attendance Record

One row per student per session. Created:
- **By student** (self-check-in via QR or geo) when `is_open = TRUE`
- **By faculty** (manual override) with `modified_by` and `modification_reason`

`status` ∈ `{ present, absent, late, excused }`

### 10.3 Attendance Summary (Auto-calculated)

The `recalculate_attendance_summary()` trigger fires after every insert/update/delete on `attendance_records` and upserts `attendance_summaries`.

Formula:
```
absence_percentage = (unexcused_absences / total_sessions) × 100
```

If `absence_percentage ≥ tenant.absence_threshold` (default 25%), the trigger:
1. Sets `attendance_summaries.is_dismissed = TRUE`
2. Updates `enrollments.status = 'dismissed'`

### 10.4 Absence Threshold Override

The threshold can be overridden at the **college level** via `colleges.absence_threshold`. The system uses the tenant-level threshold in the current trigger implementation, but the column is available for future college-scoped logic.

### 10.5 Absence Notifications

The `notify_absence_warning()` trigger on `attendance_summaries` fires automatically:
- At **70% of the threshold** → sends `absence_warning` notification
- At **100% of the threshold** → sends `absence_dismissal` notification

---

## 11. Gradebook & GPA

### 11.1 Grade Components

Each enrollment has exactly one `gradebook_entries` row:

| Component | Weight |
|---|---|
| `coursework_grade` | 30% |
| `midterm_grade` | 30% |
| `final_grade` | 40% |
| `total_grade` | **GENERATED** (stored computed column) |

### 11.2 Grade Publication

When `is_published` is flipped to `TRUE` by faculty, the `sync_enrollment_final_grade()` trigger:
1. Calculates the letter grade from `total_grade`
2. Writes `final_grade` and `letter_grade` back to `enrollments`
3. Sets `gradebook_entries.published_at = NOW()`

Letter grade scale:

| Range | Grade |
|---|---|
| ≥ 90 | A+ |
| ≥ 85 | A |
| ≥ 80 | B+ |
| ≥ 75 | B |
| ≥ 70 | C+ |
| ≥ 65 | C |
| ≥ 60 | D+ |
| ≥ 55 | D |
| < 55 | F |

### 11.3 Grade Lock

The `guard_grade_entry_state()` trigger blocks any INSERT or UPDATE on `gradebook_entries` when the semester is in `grade_freeze` or `archived` status.

### 11.4 GPA Calculation

`calculate_student_gpa(student_id, tenant_id)` is called by the `update_student_gpa_trigger()` trigger on `enrollments` whenever `status = 'completed'` and `final_grade IS NOT NULL`.

GPA scale used:

| Score | Points |
|---|---|
| ≥ 90 | 4.0 |
| ≥ 80 | 3.0 |
| ≥ 70 | 2.0 |
| ≥ 60 | 1.0 |
| < 60 | 0.0 |

Cumulative GPA = Σ(grade_points × credit_hours) / Σ(credit_hours) across all `completed` enrollments.

---

## 12. Syllabus Management

Each section has exactly one syllabus row (`UNIQUE (section_id)`).

```
Instructor (draft) → submitted → academic_management (approved / rejected)
```

`syllabus_status` ∈ `{ draft, submitted, approved, rejected }`

The `content` column is a JSONB array, allowing structured weekly topics to be stored.

---

## 13. Key DB Triggers & Guards

| Trigger | Table | Event | Action |
|---|---|---|---|
| `trg_check_schedule_conflicts` | `schedules` | BEFORE INSERT/UPDATE | Raises spatial/faculty/student conflict |
| `trg_guard_semester_state` | `semesters` | BEFORE UPDATE (status) | Enforces valid state transitions |
| `trg_guard_enrollment_state` | `enrollments` | BEFORE INSERT | Blocks enrollment when semester not in registration/active |
| `trg_guard_grade_entry` | `gradebook_entries` | BEFORE INSERT/UPDATE | Blocks grade changes when semester frozen/archived |
| `trg_enrollments_sync_count` | `enrollments` | AFTER INSERT/UPDATE/DELETE | Keeps `sections.enrolled_count` accurate |
| `trg_auto_create_course_channel` | `sections` | AFTER INSERT | Creates a messaging channel per section |
| `trg_auto_channel_membership` | `enrollments` | AFTER INSERT/UPDATE | Adds/removes student from course channel |
| `trg_recalc_attendance_summary` | `attendance_records` | AFTER INSERT/UPDATE/DELETE | Recalculates `attendance_summaries` |
| `trg_notify_absence_warning` | `attendance_summaries` | AFTER INSERT/UPDATE | Sends absence warning/dismissal notifications |
| `trg_sync_final_grade` | `gradebook_entries` | BEFORE UPDATE | Writes grade to `enrollments` on publish |
| `trg_enrollments_update_gpa` | `enrollments` | AFTER UPDATE | Recalculates student cumulative GPA |

---

## 14. RLS Policy Summary

### Academic Structure Tables (tenant-wide read)

All members of a tenant can **read** academic structure tables; only privileged roles can **write**.

| Table | Read | Write |
|---|---|---|
| `campuses` | all tenant members | `tenant_admin` |
| `colleges` | all tenant members | `tenant_admin` |
| `departments` | all tenant members | `tenant_admin` |
| `majors` | all tenant members | `tenant_admin`, `academic_management` |
| `academic_levels` | all tenant members | `tenant_admin`, `academic_management` |
| `courses` | all tenant members | `tenant_admin` |
| `study_plan_courses` | all tenant members | `tenant_admin`, `academic_management` |
| `semesters` | all tenant members | `tenant_admin`, `academic_management` |
| `venues` | all tenant members | `tenant_admin`, `academic_management` |
| `sections` | all tenant members | `tenant_admin`, `academic_management` |
| `schedules` | all tenant members | `tenant_admin`, `academic_management` |

### Enrollment & Attendance

| Policy | Subject | Condition |
|---|---|---|
| `student_read_own_enrollments` | Student | `student_id = current_profile_id()` |
| `faculty_read_section_enrollments` | Faculty | section belongs to instructor |
| `admin_all_enrollments` | Admin/AM | full access |
| `student_read_own_attendance_records` | Student | `student_id = JWT.profile_id` |
| `faculty_manage_attendance_records` | Faculty | section belongs to instructor |

### Gradebook

| Policy | Subject |
|---|---|
| `student_read_own_grades` | Student reads own **published** grades |
| `faculty_manage_own_section_gradebook` | Faculty manages grades for their sections |
| Admin/AM have full access |

---

## 15. End-to-End Setup Walkthrough

This is the complete sequence a university follows when setting up a new academic year.

### Phase 1 — Infrastructure (Tenant Admin)

```
1. [Optional] Create Campuses
   → /tenant-admin/campuses → createCampus()

2. Create Colleges
   → /tenant-admin/academic → createCollege()
   Fields: name, code, campus_id, dean_id, absence_threshold (optional override)

3. Create Departments under each College
   → createDepartment(college_id, name, code, head_id)

4. Assign Faculty to Departments
   → faculty_departments table (many-to-many)

5. Create Majors under each Department
   → createMajor(department_id, name, code, total_credits, duration_years)
   ✓ Academic levels (Level 1…N) are auto-created

6. Create Venues
   → /tenant-admin/venues → createVenue()
   Fields: name, code, venue_type, capacity, campus_id
```

### Phase 2 — Curriculum (Tenant Admin)

```
7. Create Course Catalog
   → /tenant-admin/courses → createCourse()
   Fields: code, name, credit_hours, course_type, department_id

8. Build Study Plans per Major
   → /tenant-admin/study-plans → addStudyPlanCourse()
   For each level: add mandatory/elective courses with semester slot

9. Define Prerequisites
   → addPrerequisite(course_id, prerequisite_id, min_grade)
```

### Phase 3 — Semester Setup (Tenant Admin)

```
10. Create Semester
    → /tenant-admin/calendar → createSemester()
    Fields: academic_year, semester_type, name, start_date, end_date,
            reg_start, reg_end, add_drop_start, add_drop_end

11. Advance Semester to 'registration'
    → updateSemesterStatus(id, 'registration')
    ✓ DB guard validates transition
```

### Phase 4 — Sections & Schedule (Academic Management)

```
12. Create Sections (Lecture + Lab)
    → /academic-management/sections → createSection()
    For hybrid/practical courses: createLabSection(parent_section_id)

13. Assign Instructors to Sections
    → updateSectionInstructor(id, instructorId)

14. Build Timetable
    → /academic-management/schedules → createSchedule()
    Fields: section_id, venue_id, day_of_week, start_time, end_time
    ✓ Conflict detector fires; raises error on any conflict

15. Publish Schedules
    → updateScheduleStatus(id, 'published')
```

### Phase 5 — Enrollment (Academic Management)

```
16. Batch Enroll Students into Sections
    → /academic-management/enrollments → batchEnroll()
    For hybrid: must provide labSectionId
    ✓ Guard blocks enrollment if semester not in registration/active
    ✓ enrolled_count auto-incremented
    ✓ Student auto-added to course channel
```

### Phase 6 — Active Semester (Faculty)

```
17. Upload Syllabus
    → /faculty → syllabi table (draft → submitted)
    Reviewed by Academic Management (approved/rejected)

18. Upload Course Materials & Assignments
    → /faculty → course_materials, assignments tables
    → Publish when ready (students see only published content)

19. Take Attendance
    → Create attendance_session (open QR or geo session)
    → Students check in; faculty can override records
    ✓ attendance_summaries auto-recalculated after each record
    ✓ Notifications sent at 70% and 100% of absence threshold

20. Enter Grades
    → gradebook_entries (coursework, midterm, final)
    ✓ guard_grade_entry blocks changes when semester frozen/archived
    → Publish grades → final_grade synced to enrollment, letter grade computed
    → GPA recalculated automatically
```

### Phase 7 — Semester Close (Tenant Admin)

```
21. Advance to 'grade_freeze'
    → updateSemesterStatus(id, 'grade_freeze')
    ✓ No new grade entries possible

22. Review & Archive
    → updateSemesterStatus(id, 'archived')
    ✓ Semester fully locked; all data read-only
```

---

## 16. File & Code Map

### Server Actions (Next.js Server Components)

| File | Role | Manages |
|---|---|---|
| `src/app/tenant-admin/campuses/actions.ts` | `tenant_admin` | `campuses`, `clone_college_to_campus` RPC |
| `src/app/tenant-admin/academic/actions.ts` | `tenant_admin` | `colleges`, `departments`, `majors`, `academic_levels` |
| `src/app/tenant-admin/courses/actions.ts` | `tenant_admin` | `courses`, `study_plan_courses`, `course_prerequisites` |
| `src/app/tenant-admin/study-plans/actions.ts` | `tenant_admin` | `study_plan_courses`, `course_prerequisites` (dedicated view) |
| `src/app/tenant-admin/calendar/actions.ts` | `tenant_admin` | `semesters` — create, update, advance status |
| `src/app/tenant-admin/venues/` | `tenant_admin` | `venues` |
| `src/app/academic-management/sections/actions.ts` | `academic_management` | `sections` — lecture + lab + merge + status |
| `src/app/academic-management/schedules/actions.ts` | `academic_management` | `schedules` — create, update, publish, delete |
| `src/app/academic-management/enrollments/actions.ts` | `academic_management` | `enrollments` — batch enroll, status update |

### Key DB Migrations

| Migration File | Purpose |
|---|---|
| `20260307022710_part1_core_system.sql` | Base schema: tenants, profiles, full academic structure, RLS Part 1 |
| `20260307022727_part2_lms_messaging.sql` | LMS, attendance, messaging, AI, ticketing, RLS Part 2 |
| `20260318001114_align_academic_workflow.sql` | Adds campuses, section_type, grade_freeze, semester state guards, campus-aware conflict detection, cloning function |
| `20260410230000_fix_attendance_dismissal.sql` | Attendance dismissal logic fixes |
| `20260411020000_auto_restore_dismissed_enrollment.sql` | Auto-restore dismissed enrollments |
| `20260411180000_fix_attendance_summary_count.sql` | Attendance summary count accuracy fixes |

### Generated Types

| File | Content |
|---|---|
| `src/lib/supabase/supabase.ts` | Full Supabase TypeScript types generated from live DB (`npx supabase gen types typescript --project-id leduumxihcngowpaujkr`) |
| `src/lib/types/database.ts` | Manual lightweight type aliases used across the app (e.g., `SectionStatus`, `SemesterStatus`, `CourseType`) |

---

*Generated by @explorer-agent + @documentation-writer — UniBot Platform, April 2026*
<!-- apply pull request -->
<!-- apply pull request -->
