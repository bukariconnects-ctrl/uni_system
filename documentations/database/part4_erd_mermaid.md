# UniBot Platform — Entity Relationship Diagram
**Deliverable 3 | Mermaid.js ERD**

> Render this diagram using any Mermaid-compatible viewer:
> - VS Code extension: "Mermaid Preview"
> - Online: https://mermaid.live
> - GitHub Markdown (renders natively)

---

> **Note on scale:** The full schema has 52 tables. The ERD is split into
> **5 focused domain diagrams** to remain readable, followed by a
> **master relationship summary**. Each diagram is self-contained and
> valid Mermaid `erDiagram` syntax.

---

## Diagram 1 — Platform & Tenant Management + Identity

```mermaid
erDiagram
    SUBSCRIPTION_PLANS {
        UUID id PK
        VARCHAR name
        TEXT description
        NUMERIC priceMonthly
        INT maxUsers
        INT maxStorageGb
        JSONB features
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    TENANTS {
        UUID id PK
        VARCHAR name
        VARCHAR subdomain
        VARCHAR customDomain
        TEXT logoUrl
        VARCHAR primaryColor
        VARCHAR secondaryColor
        TEXT welcomeMessage
        VARCHAR defaultLanguage
        VARCHAR timezone
        VARCHAR status
        UUID planId FK
        INT maxUsers
        INT maxStorageGb
        NUMERIC storageUsedGb
        NUMERIC absenceThreshold
        DATE contractStart
        DATE contractEnd
        VARCHAR adminEmail
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
        TIMESTAMPTZ deletedAt
    }

    SUBSCRIPTIONS {
        UUID id PK
        UUID tenantid FK
        UUID planId FK
        VARCHAR status
        DATE startDate
        DATE endDate
        BOOLEAN autoRenew
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    INVOICES {
        UUID id PK
        UUID tenantid FK
        UUID subscriptionId FK
        NUMERIC amount
        VARCHAR currency
        VARCHAR status
        DATE dueDate
        TIMESTAMPTZ paidAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    SYSTEM_ANNOUNCEMENTS {
        UUID id PK
        VARCHAR title
        TEXT body
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ expiresAt
    }

    PROFILES {
        UUID id PK
        UUID tenantid FK
        VARCHAR role
        VARCHAR firstName
        VARCHAR lastName
        VARCHAR nationalId
        VARCHAR gender
        DATE dateOfBirth
        VARCHAR phone
        TEXT avatarUrl
        VARCHAR accountStatus
        BOOLEAN isDndActive
        TEXT dndMessage
        TIMESTAMPTZ lastLoginAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    CUSTOM_ROLES {
        UUID id PK
        UUID tenantid FK
        VARCHAR name
        TEXT description
        JSONB permissions
        VARCHAR scope
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    PROFILE_CUSTOM_ROLES {
        UUID profileId FK
        UUID customRoleId FK
        TIMESTAMPTZ assignedAt
        UUID assignedBy FK
    }

    FACULTY_PROFILES {
        UUID profileId PK_FK
        UUID tenantid FK
        VARCHAR employeeId
        JSONB officeHours
        VARCHAR specialization
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    STUDENT_PROFILES {
        UUID profileId PK_FK
        UUID tenantid FK
        VARCHAR studentNumber
        INT enrollmentYear
        NUMERIC cumulativeGpa
        INT totalCreditHours
        INT earnedCreditHours
        VARCHAR riskLevel
        NUMERIC riskScore
        TIMESTAMPTZ riskUpdatedAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    AUDIT_LOGS {
        BIGINT id PK
        UUID tenantid FK
        UUID actorId FK
        VARCHAR actorRole
        VARCHAR action
        VARCHAR targetTable
        UUID targetId
        JSONB oldData
        JSONB newData
        INET ipAddress
        TEXT userAgent
        TIMESTAMPTZ createdAt
    }

    SUBSCRIPTION_PLANS ||--o{ TENANTS : "plan_id"
    SUBSCRIPTION_PLANS ||--o{ SUBSCRIPTIONS : "plan_id"
    TENANTS ||--o{ SUBSCRIPTIONS : "tenantid"
    TENANTS ||--o{ INVOICES : "tenantid"
    SUBSCRIPTIONS ||--o{ INVOICES : "subscription_id"
    TENANTS ||--o{ PROFILES : "tenantid"
    TENANTS ||--o{ CUSTOM_ROLES : "tenantid"
    PROFILES ||--o{ PROFILE_CUSTOM_ROLES : "profileId"
    CUSTOM_ROLES ||--o{ PROFILE_CUSTOM_ROLES : "custom_role_id"
    PROFILES ||--o| FACULTY_PROFILES : "profileId"
    PROFILES ||--o| STUDENT_PROFILES : "profileId"
    TENANTS ||--o{ AUDIT_LOGS : "tenantid"
    PROFILES ||--o{ AUDIT_LOGS : "actor_id"
```

---

## Diagram 2 — Academic Structure

```mermaid
erDiagram
    TENANTS {
        UUID id PK
    }

    COLLEGES {
        UUID id PK
        UUID tenantid FK
        VARCHAR name
        VARCHAR code
        UUID deanId FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    DEPARTMENTS {
        UUID id PK
        UUID tenantid FK
        UUID collegeId FK
        VARCHAR name
        VARCHAR code
        UUID headId FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    FACULTY_DEPARTMENTS {
        UUID facultyId FK
        UUID departmentId FK
        UUID tenantid FK
        BOOLEAN isPrimary
    }

    MAJORS {
        UUID id PK
        UUID tenantid FK
        UUID departmentId FK
        VARCHAR name
        VARCHAR code
        INT totalCredits
        INT durationYears
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    STUDENT_MAJORS {
        UUID studentId FK
        UUID majorId FK
        UUID tenantid FK
        BOOLEAN isPrimary
        TIMESTAMPTZ enrolledAt
    }

    ACADEMIC_LEVELS {
        UUID id PK
        UUID tenantid FK
        UUID majorId FK
        INT levelNumber
        VARCHAR name
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    COURSES {
        UUID id PK
        UUID tenantid FK
        UUID departmentId FK
        VARCHAR code
        VARCHAR name
        TEXT description
        INT creditHours
        VARCHAR courseType
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    STUDY_PLAN_COURSES {
        UUID id PK
        UUID tenantid FK
        UUID academicLevelId FK
        UUID courseId FK
        VARCHAR semesterType
        VARCHAR planCourseType
        NUMERIC minGradeToPass
        TIMESTAMPTZ createdAt
    }

    COURSE_PREREQUISITES {
        UUID id PK
        UUID tenantid FK
        UUID courseId FK
        UUID prerequisiteId FK
        NUMERIC minGrade
        TIMESTAMPTZ createdAt
    }

    SEMESTERS {
        UUID id PK
        UUID tenantid FK
        VARCHAR name
        VARCHAR academicYear
        VARCHAR semesterType
        VARCHAR status
        DATE startDate
        DATE endDate
        DATE regStart
        DATE regEnd
        DATE addDropStart
        DATE addDropEnd
        TIMESTAMPTZ gradeFreezeAt
        INT minCreditHours
        INT maxCreditHours
        BOOLEAN selfRegEnabled
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    VENUES {
        UUID id PK
        UUID tenantid FK
        VARCHAR name
        VARCHAR code
        VARCHAR venueType
        INT capacity
        VARCHAR building
        VARCHAR floor
        BOOLEAN hasProjector
        BOOLEAN hasAc
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    SECTIONS {
        UUID id PK
        UUID tenantid FK
        UUID courseId FK
        UUID semesterId FK
        VARCHAR sectionCode
        UUID instructorId FK
        VARCHAR status
        INT maxCapacity
        INT enrolledCount
        UUID mergedIntoId FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    ENROLLMENTS {
        UUID id PK
        UUID tenantid FK
        UUID studentId FK
        UUID sectionId FK
        UUID semesterId FK
        VARCHAR status
        NUMERIC finalGrade
        VARCHAR letterGrade
        TIMESTAMPTZ enrolledAt
        TIMESTAMPTZ droppedAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    SCHEDULES {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID venueId FK
        VARCHAR dayOfWeek
        TIME startTime
        TIME endTime
        VARCHAR status
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    SYLLABI {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID instructorId FK
        VARCHAR status
        JSONB content
        UUID reviewedBy FK
        TIMESTAMPTZ reviewedAt
        TEXT reviewNotes
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    TENANTS ||--o{ COLLEGES : "tenantid"
    COLLEGES ||--o{ DEPARTMENTS : "collegeId"
    TENANTS ||--o{ DEPARTMENTS : "tenantid"
    DEPARTMENTS ||--o{ MAJORS : "departmentId"
    DEPARTMENTS ||--o{ FACULTY_DEPARTMENTS : "departmentId"
    MAJORS ||--o{ STUDENT_MAJORS : "majorId"
    MAJORS ||--o{ ACADEMIC_LEVELS : "majorId"
    ACADEMIC_LEVELS ||--o{ STUDY_PLAN_COURSES : "academicLevelId"
    COURSES ||--o{ STUDY_PLAN_COURSES : "courseId"
    COURSES ||--o{ COURSE_PREREQUISITES : "courseId"
    COURSES ||--o{ COURSE_PREREQUISITES : "prerequisiteId"
    TENANTS ||--o{ SEMESTERS : "tenantid"
    TENANTS ||--o{ VENUES : "tenantid"
    COURSES ||--o{ SECTIONS : "courseId"
    SEMESTERS ||--o{ SECTIONS : "semesterId"
    SECTIONS ||--o{ ENROLLMENTS : "sectionId"
    SEMESTERS ||--o{ ENROLLMENTS : "semesterId"
    SECTIONS ||--o{ SCHEDULES : "sectionId"
    VENUES ||--o{ SCHEDULES : "venueId"
    SECTIONS ||--|| SYLLABI : "sectionId"
    SECTIONS ||--o{ SECTIONS : "mergedIntoId"
```

---

## Diagram 3 — LMS, Attendance & Messaging

```mermaid
erDiagram
    SECTIONS {
        UUID id PK
        UUID tenantid FK
        UUID instructorId FK
    }

    ENROLLMENTS {
        UUID id PK
        UUID studentId FK
        UUID sectionId FK
    }

    COURSE_MATERIALS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID uploadedBy FK
        VARCHAR title
        TEXT description
        VARCHAR contentType
        TEXT fileUrl
        BIGINT fileSizeBytes
        INT weekNumber
        BOOLEAN isAiApproved
        BOOLEAN isPublished
        INT viewCount
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    ASSIGNMENTS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID createdBy FK
        VARCHAR title
        TEXT description
        NUMERIC maxGrade
        TIMESTAMPTZ dueDate
        BOOLEAN allowLate
        BOOLEAN isPublished
        INT weekNumber
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    SUBMISSIONS {
        UUID id PK
        UUID tenantid FK
        UUID assignmentId FK
        UUID studentId FK
        TEXT fileUrl
        TEXT textContent
        VARCHAR status
        TIMESTAMPTZ submittedAt
        NUMERIC grade
        TEXT feedback
        TIMESTAMPTZ gradedAt
        UUID gradedBy FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    GRADEBOOK_ENTRIES {
        UUID id PK
        UUID tenantid FK
        UUID enrollmentId FK
        UUID sectionId FK
        UUID studentId FK
        NUMERIC courseworkGrade
        NUMERIC midtermGrade
        NUMERIC finalGrade
        NUMERIC totalGrade
        BOOLEAN isPublished
        TIMESTAMPTZ publishedAt
        UUID recordedBy FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    ATTENDANCE_SESSIONS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID scheduleId FK
        DATE sessionDate
        TIME startTime
        TIME endTime
        TEXT qrCode
        TIMESTAMPTZ qrExpiresAt
        NUMERIC geoLatitude
        NUMERIC geoLongitude
        INT geoRadiusM
        BOOLEAN isOpen
        UUID createdBy FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    ATTENDANCE_RECORDS {
        UUID id PK
        UUID tenantid FK
        UUID sessionId FK
        UUID studentId FK
        UUID sectionId FK
        VARCHAR status
        TIMESTAMPTZ checkInTime
        VARCHAR method
        UUID modifiedBy FK
        TIMESTAMPTZ modifiedAt
        TEXT modificationReason
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    ATTENDANCE_SUMMARIES {
        UUID id PK
        UUID tenantid FK
        UUID enrollmentId FK
        UUID studentId FK
        UUID sectionId FK
        INT totalSessions
        INT attendedSessions
        INT excusedAbsences
        INT unexcusedAbsences
        INT lateCount
        NUMERIC absencePercentage
        BOOLEAN isDismissed
        TIMESTAMPTZ dismissedAt
        TIMESTAMPTZ lastUpdated
    }

    CONVERSATIONS {
        UUID id PK
        UUID tenantid FK
        UUID participantA FK
        UUID participantB FK
        TIMESTAMPTZ lastMessageAt
        TIMESTAMPTZ createdAt
    }

    CHANNELS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        VARCHAR name
        VARCHAR channelType
        BOOLEAN isReadonly
        UUID createdBy FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    CHANNEL_MEMBERS {
        UUID id PK
        UUID tenantid FK
        UUID channelId FK
        UUID profileId FK
        BOOLEAN isAdmin
        TIMESTAMPTZ joinedAt
        TIMESTAMPTZ mutedUntil
    }

    MESSAGES {
        UUID id PK
        UUID tenantid FK
        VARCHAR messageType
        UUID conversationId FK
        UUID channelId FK
        UUID senderId FK
        TEXT body
        BOOLEAN isPinned
        BOOLEAN isDeleted
        TIMESTAMPTZ deletedAt
        UUID deletedBy FK
        UUID replyToId FK
        VARCHAR status
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    MESSAGE_ATTACHMENTS {
        UUID id PK
        UUID tenantid FK
        UUID messageId FK
        VARCHAR fileName
        TEXT fileUrl
        BIGINT fileSizeBytes
        VARCHAR mimeType
        BOOLEAN isSafe
        TIMESTAMPTZ createdAt
    }

    SECTIONS ||--o{ COURSE_MATERIALS : "sectionId"
    SECTIONS ||--o{ ASSIGNMENTS : "sectionId"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "assignmentId"
    ENROLLMENTS ||--|| GRADEBOOK_ENTRIES : "enrollmentId"
    SECTIONS ||--o{ ATTENDANCE_SESSIONS : "sectionId"
    ATTENDANCE_SESSIONS ||--o{ ATTENDANCE_RECORDS : "sessionId"
    ENROLLMENTS ||--|| ATTENDANCE_SUMMARIES : "enrollmentId"
    SECTIONS ||--o| CHANNELS : "sectionId"
    CHANNELS ||--o{ CHANNEL_MEMBERS : "channelId"
    CHANNELS ||--o{ MESSAGES : "channelId"
    CONVERSATIONS ||--o{ MESSAGES : "conversationId"
    MESSAGES ||--o{ MESSAGE_ATTACHMENTS : "messageId"
    MESSAGES ||--o{ MESSAGES : "replyToId"
```

---

## Diagram 4 — AI, Analytics & Circulars

```mermaid
erDiagram
    TENANTS {
        UUID id PK
    }

    PROFILES {
        UUID id PK
        UUID tenantid FK
    }

    SECTIONS {
        UUID id PK
        UUID instructorId FK
    }

    COURSE_MATERIALS {
        UUID id PK
        UUID sectionId FK
        BOOLEAN isAiApproved
    }

    CIRCULARS {
        UUID id PK
        UUID tenantid FK
        UUID createdBy FK
        VARCHAR title
        TEXT body
        VARCHAR targetType
        UUID targetId
        BOOLEAN isMandatory
        BOOLEAN isPublished
        TIMESTAMPTZ publishedAt
        TIMESTAMPTZ expiresAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    NOTIFICATIONS {
        UUID id PK
        UUID tenantid FK
        UUID recipientId FK
        VARCHAR notificationType
        VARCHAR title
        TEXT body
        BOOLEAN isRead
        TIMESTAMPTZ readAt
        VARCHAR referenceTable
        UUID referenceId
        TIMESTAMPTZ createdAt
    }

    AI_KNOWLEDGE_DOCUMENTS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID materialId FK
        UUID uploadedBy FK
        VARCHAR title
        VARCHAR docType
        TEXT fileUrl
        BOOLEAN isActive
        INT totalChunks
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    AI_DOCUMENT_CHUNKS {
        UUID id PK
        UUID tenantid FK
        UUID documentId FK
        INT chunkIndex
        TEXT content
        INT pageNumber
        INT timestampSec
        VECTOR_1536 embedding
        INT tokenCount
        TIMESTAMPTZ createdAt
    }

    CHATBOT_CONVERSATIONS {
        UUID id PK
        UUID tenantid FK
        UUID userId FK
        VARCHAR sessionId
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ endedAt
    }

    CHATBOT_MESSAGES {
        UUID id PK
        UUID tenantid FK
        UUID conversationId FK
        VARCHAR role
        TEXT content
        UUID_ARRAY sourceChunkIds
        INT tokenUsage
        TIMESTAMPTZ createdAt
    }

    STUDENT_RECOMMENDATIONS {
        UUID id PK
        UUID tenantid FK
        UUID studentId FK
        UUID sectionId FK
        UUID sentBy FK
        VARCHAR title
        TEXT body
        TEXT materialUrl
        BOOLEAN isRead
        TIMESTAMPTZ createdAt
    }

    AI_TOKEN_USAGE {
        BIGINT id PK
        UUID tenantid FK
        UUID userId FK
        VARCHAR model
        INT promptTokens
        INT completionTokens
        INT totalTokens
        NUMERIC costUsd
        TIMESTAMPTZ createdAt
    }

    STUDENT_RISK_SCORES {
        UUID id PK
        UUID tenantid FK
        UUID studentId FK
        UUID sectionId FK
        UUID semesterId FK
        VARCHAR riskLevel
        NUMERIC riskScore
        NUMERIC absenceFactor
        NUMERIC gradeFactor
        NUMERIC engagementFactor
        BOOLEAN alertSent
        TIMESTAMPTZ computedAt
    }

    COURSE_RISK_FLAGS {
        UUID id PK
        UUID tenantid FK
        UUID sectionId FK
        UUID semesterId FK
        NUMERIC avgRiskScore
        INT highRiskCount
        NUMERIC failureRatePct
        BOOLEAN engagementDrop
        BOOLEAN flagged
        BOOLEAN alertSent
        TIMESTAMPTZ computedAt
    }

    TENANTS ||--o{ CIRCULARS : "tenantid"
    PROFILES ||--o{ CIRCULARS : "createdBy"
    TENANTS ||--o{ NOTIFICATIONS : "tenantid"
    PROFILES ||--o{ NOTIFICATIONS : "recipientId"
    TENANTS ||--o{ AI_KNOWLEDGE_DOCUMENTS : "tenantid"
    SECTIONS ||--o{ AI_KNOWLEDGE_DOCUMENTS : "sectionId"
    COURSE_MATERIALS ||--o{ AI_KNOWLEDGE_DOCUMENTS : "materialId"
    AI_KNOWLEDGE_DOCUMENTS ||--o{ AI_DOCUMENT_CHUNKS : "documentId"
    TENANTS ||--o{ CHATBOT_CONVERSATIONS : "tenantid"
    PROFILES ||--o{ CHATBOT_CONVERSATIONS : "userId"
    CHATBOT_CONVERSATIONS ||--o{ CHATBOT_MESSAGES : "conversationId"
    TENANTS ||--o{ STUDENT_RECOMMENDATIONS : "tenantid"
    PROFILES ||--o{ STUDENT_RECOMMENDATIONS : "studentId"
    SECTIONS ||--o{ STUDENT_RECOMMENDATIONS : "sectionId"
    TENANTS ||--o{ AI_TOKEN_USAGE : "tenantid"
    PROFILES ||--o{ AI_TOKEN_USAGE : "userId"
    TENANTS ||--o{ STUDENT_RISK_SCORES : "tenantid"
    PROFILES ||--o{ STUDENT_RISK_SCORES : "studentId"
    SECTIONS ||--o{ STUDENT_RISK_SCORES : "sectionId"
    TENANTS ||--o{ COURSE_RISK_FLAGS : "tenantid"
    SECTIONS ||--o{ COURSE_RISK_FLAGS : "sectionId"
```

---

## Diagram 5 — Academic Ticketing System

```mermaid
erDiagram
    TENANTS {
        UUID id PK
    }

    PROFILES {
        UUID id PK
    }

    SECTIONS {
        UUID id PK
    }

    TICKETS {
        UUID id PK
        UUID tenantid FK
        VARCHAR ticketNumber
        UUID createdBy FK
        UUID assignedTo FK
        VARCHAR category
        VARCHAR priority
        VARCHAR status
        VARCHAR title
        TEXT description
        UUID relatedSectionId FK
        TIMESTAMPTZ resolvedAt
        TIMESTAMPTZ closedAt
        SMALLINT rating
        BOOLEAN aiAttempted
        TEXT aiSuggestion
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    TICKET_MESSAGES {
        UUID id PK
        UUID tenantid FK
        UUID ticketId FK
        UUID senderId FK
        TEXT body
        BOOLEAN isInternal
        TIMESTAMPTZ createdAt
    }

    TICKET_ATTACHMENTS {
        UUID id PK
        UUID tenantid FK
        UUID ticketId FK
        UUID uploadedBy FK
        VARCHAR fileName
        TEXT fileUrl
        BIGINT fileSizeBytes
        VARCHAR mimeType
        TIMESTAMPTZ createdAt
    }

    APPROVAL_WORKFLOWS {
        UUID id PK
        UUID tenantid FK
        UUID ticketId FK
        UUID approverId FK
        INT stepOrder
        VARCHAR status
        TEXT decisionNotes
        TIMESTAMPTZ decidedAt
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    TENANTS ||--o{ TICKETS : "tenantid"
    PROFILES ||--o{ TICKETS : "createdBy"
    PROFILES ||--o{ TICKETS : "assignedTo"
    SECTIONS ||--o{ TICKETS : "relatedSectionId"
    TICKETS ||--o{ TICKET_MESSAGES : "ticketId"
    PROFILES ||--o{ TICKET_MESSAGES : "senderId"
    TICKETS ||--o{ TICKET_ATTACHMENTS : "ticketId"
    PROFILES ||--o{ TICKET_ATTACHMENTS : "uploadedBy"
    TICKETS ||--o{ APPROVAL_WORKFLOWS : "ticketId"
    PROFILES ||--o{ APPROVAL_WORKFLOWS : "approverId"
```

---

## Master Relationship Summary

The following diagram shows the **top-level cross-module relationships** between the primary hub tables. This is the highest-level view of the system's data topology.

```mermaid
erDiagram
    TENANTS ||--o{ PROFILES : "houses"
    TENANTS ||--o{ COLLEGES : "has"
    TENANTS ||--o{ SEMESTERS : "defines"
    TENANTS ||--o{ SUBSCRIPTIONS : "billed via"

    PROFILES ||--o| STUDENT_PROFILES : "extends (student)"
    PROFILES ||--o| FACULTY_PROFILES : "extends (faculty)"

    COLLEGES ||--o{ DEPARTMENTS : "contains"
    DEPARTMENTS ||--o{ MAJORS : "offers"
    DEPARTMENTS ||--o{ COURSES : "owns"

    MAJORS ||--o{ ACADEMIC_LEVELS : "divided into"
    ACADEMIC_LEVELS ||--o{ STUDY_PLAN_COURSES : "prescribes"
    COURSES ||--o{ STUDY_PLAN_COURSES : "assigned via"
    COURSES ||--o{ COURSE_PREREQUISITES : "requires"

    COURSES ||--o{ SECTIONS : "instantiated as"
    SEMESTERS ||--o{ SECTIONS : "in semester"
    PROFILES ||--o{ SECTIONS : "taught by (instructor)"

    SECTIONS ||--o{ ENROLLMENTS : "has"
    PROFILES ||--o{ ENROLLMENTS : "enrolled in (student)"

    SECTIONS ||--o{ SCHEDULES : "scheduled via"
    VENUES ||--o{ SCHEDULES : "booked for"

    SECTIONS ||--o{ COURSE_MATERIALS : "contains"
    SECTIONS ||--o{ ASSIGNMENTS : "contains"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"
    ENROLLMENTS ||--|| GRADEBOOK_ENTRIES : "graded in"

    SECTIONS ||--o{ ATTENDANCE_SESSIONS : "tracks"
    ATTENDANCE_SESSIONS ||--o{ ATTENDANCE_RECORDS : "records"
    ENROLLMENTS ||--|| ATTENDANCE_SUMMARIES : "summarized in"

    SECTIONS ||--o| CHANNELS : "auto-generates"
    CHANNELS ||--o{ CHANNEL_MEMBERS : "has"
    CHANNELS ||--o{ MESSAGES : "receives"

    PROFILES ||--o{ CONVERSATIONS : "participates in"
    CONVERSATIONS ||--o{ MESSAGES : "carries"

    COURSE_MATERIALS ||--o{ AI_KNOWLEDGE_DOCUMENTS : "indexed in"
    AI_KNOWLEDGE_DOCUMENTS ||--o{ AI_DOCUMENT_CHUNKS : "chunked into"
    PROFILES ||--o{ CHATBOT_CONVERSATIONS : "has"
    CHATBOT_CONVERSATIONS ||--o{ CHATBOT_MESSAGES : "contains"

    PROFILES ||--o{ STUDENT_RISK_SCORES : "scored in"
    SECTIONS ||--o{ STUDENT_RISK_SCORES : "analyzed per"
    SECTIONS ||--o{ COURSE_RISK_FLAGS : "flagged as"

    PROFILES ||--o{ TICKETS : "submits"
    TICKETS ||--o{ TICKET_MESSAGES : "threaded in"
    TICKETS ||--o{ APPROVAL_WORKFLOWS : "approved via"

    PROFILES ||--o{ NOTIFICATIONS : "receives"
    TENANTS ||--o{ CIRCULARS : "broadcasts"
```

---

## ERD Legend

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `PK_FK` | Primary Key that is also a Foreign Key (1:1 extension pattern) |
| `\|\|--o{` | One-to-Many (mandatory one side) |
| `\|\|--\|\|` | One-to-One (mandatory both sides) |
| `\|\|--o\|` | One-to-Zero-or-One |
| `o{--o{` | Many-to-Many (via junction table) |
| `VECTOR_1536` | pgvector column, 1536 dimensions (OpenAI embedding) |
| `UUID_ARRAY` | PostgreSQL UUID[] array column |
| `JSONB` | PostgreSQL JSONB (binary JSON) column |

---

## Table Count by Module

| Module | Tables | Part |
|--------|--------|------|
| Platform & Tenant Management | 5 | Part 1 |
| Identity & Users | 6 | Part 1 |
| Academic Structure | 15 | Part 1 |
| LMS & Attendance | 7 | Part 2 |
| Messaging & Interaction | 5 | Part 2 |
| Circulars & Notifications | 2 | Part 2 |
| AI / Vector Database | 6 | Part 2 |
| Analytics & Predictive | 2 | Part 2 |
| Academic Ticketing | 4 | Part 2 |
| **Total** | **52** | |

---

*ERD generated for UniBot Platform — Version 1.0*
*Mermaid.js syntax compatible with v10+*
