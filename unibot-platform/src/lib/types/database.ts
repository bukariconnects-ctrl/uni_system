export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "academic_management"
  | "faculty"
  | "student";

export type TenantStatus = "active" | "suspended" | "deleted";

export type SubscriptionPlan = "basic" | "pro" | "enterprise";

export type SubscriptionStatus = "active" | "pending" | "expired" | "cancelled";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type SemesterType = "fall" | "spring" | "summer";

export type SemesterStatus = "planning" | "active" | "archived";

export type AccountStatus = "active" | "suspended" | "terminated";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "impersonate"
  | "grade_modify"
  | "permission_change"
  | "file_delete"
  | "status_change"
  | "ticket_resolve"
  | "attendance_modify"
  | "data_wipe";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Profile {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  national_id: string | null;
  account_status: AccountStatus;
  is_dnd_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  admin_email: string;
  status: TenantStatus;
  plan_id: string;
  max_users: number;
  max_storage_gb: number;
  storage_used_gb: number;
  absence_threshold: number;
  timezone: string;
  default_language: string;
  welcome_message: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanRow {
  id: string;
  name: SubscriptionPlan;
  price_monthly: number;
  max_users: number;
  max_storage_gb: number;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  tenant_id: string;
  academic_year: string;
  semester_type: SemesterType;
  name: string;
  start_date: string;
  end_date: string;
  reg_start: string | null;
  reg_end: string | null;
  add_drop_start: string | null;
  add_drop_end: string | null;
  grade_freeze_at: string | null;
  status: SemesterStatus;
  created_at: string;
  updated_at: string;
}

export interface AiTokenUsage {
  id: string;
  tenant_id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

export type CourseType = "theoretical" | "practical" | "hybrid";

export type SectionStatus = "open" | "closed" | "archived" | "merged";

export type ScheduleDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ScheduleStatus = "draft" | "published";

export type PlanCourseType = "mandatory" | "elective";

export type EnrollmentStatus =
  | "enrolled"
  | "dropped"
  | "completed"
  | "failed"
  | "dismissed"
  | "withdrawn";

export type VenueType = "lecture_hall" | "lab" | "auditorium" | "other";

export type Gender = "male" | "female";

export interface College {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  dean_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  tenant_id: string;
  college_id: string;
  name: string;
  code: string | null;
  head_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Major {
  id: string;
  tenant_id: string;
  department_id: string;
  name: string;
  code: string | null;
  total_credits: number;
  duration_years: number;
  created_at: string;
  updated_at: string;
}

export interface AcademicLevel {
  id: string;
  tenant_id: string;
  major_id: string;
  level_number: number;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  tenant_id: string;
  department_id: string | null;
  code: string;
  name: string;
  description: string | null;
  credit_hours: number;
  course_type: CourseType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanCourse {
  id: string;
  tenant_id: string;
  academic_level_id: string;
  course_id: string;
  semester_type: SemesterType;
  plan_course_type: PlanCourseType;
  min_grade_to_pass: number;
  created_at: string;
}

export interface CoursePrerequisite {
  id: string;
  tenant_id: string;
  course_id: string;
  prerequisite_id: string;
  min_grade: number;
  created_at: string;
}

export interface Venue {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  venue_type: VenueType;
  capacity: number;
  building: string | null;
  floor: string | null;
  has_projector: boolean;
  has_ac: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  tenant_id: string;
  course_id: string;
  semester_id: string;
  section_code: string;
  instructor_id: string | null;
  status: SectionStatus;
  max_capacity: number;
  enrolled_count: number;
  merged_into_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  tenant_id: string;
  student_id: string;
  section_id: string;
  semester_id: string;
  status: EnrollmentStatus;
  final_grade: number | null;
  letter_grade: string | null;
  enrolled_at: string;
  dropped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  tenant_id: string;
  section_id: string;
  venue_id: string | null;
  day_of_week: ScheduleDay;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  profile_id: string;
  tenant_id: string;
  student_number: string;
  enrollment_year: number | null;
  cumulative_gpa: number;
  total_credit_hours: number;
  earned_credit_hours: number;
  risk_level: RiskLevel;
  risk_score: number;
  risk_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacultyProfile {
  profile_id: string;
  tenant_id: string;
  employee_id: string | null;
  office_hours: unknown[];
  specialization: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, unknown>;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileCustomRole {
  profile_id: string;
  custom_role_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export type ContentType =
  | "video"
  | "pdf"
  | "audio"
  | "presentation"
  | "document"
  | "link"
  | "other";

export type SubmissionStatus =
  | "submitted"
  | "late"
  | "graded"
  | "resubmit_requested";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type SyllabusStatus = "draft" | "submitted" | "approved" | "rejected";

export type MessageType = "direct" | "channel";

export type MessageStatus = "sent" | "delivered" | "read";

export type ChannelType = "course" | "department" | "announcement" | "direct";

export type CircularTargetType =
  | "all"
  | "department"
  | "major"
  | "level"
  | "section"
  | "faculty"
  | "students";

export type NotificationType =
  | "circular"
  | "absence_warning"
  | "absence_dismissal"
  | "grade_released"
  | "assignment_due"
  | "ticket_update"
  | "system"
  | "risk_alert"
  | "recommendation"
  | "schedule_change"
  | "cancellation";

export interface CourseMaterial {
  id: string;
  tenant_id: string;
  section_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  file_url: string | null;
  file_size_bytes: number | null;
  week_number: number | null;
  is_ai_approved: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Syllabus {
  id: string;
  tenant_id: string;
  section_id: string;
  instructor_id: string;
  content: unknown;
  status: SyllabusStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  tenant_id: string;
  section_id: string;
  created_by: string;
  title: string;
  description: string | null;
  max_grade: number;
  due_date: string;
  allow_late: boolean;
  is_published: boolean;
  week_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  text_content: string | null;
  status: SubmissionStatus;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradebookEntry {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  section_id: string;
  student_id: string;
  coursework_grade: number | null;
  midterm_grade: number | null;
  final_grade: number | null;
  total_grade: number | null;
  is_published: boolean;
  published_at: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  tenant_id: string;
  section_id: string;
  schedule_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string | null;
  qr_code: string | null;
  qr_expires_at: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_radius_m: number | null;
  is_open: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  section_id: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  method: string | null;
  modified_by: string | null;
  modified_at: string | null;
  modification_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  student_id: string;
  section_id: string;
  total_sessions: number;
  attended_sessions: number;
  excused_absences: number;
  unexcused_absences: number;
  late_count: number;
  absence_percentage: number;
  is_dismissed: boolean;
  dismissed_at: string | null;
  last_updated: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  tenant_id: string;
  section_id: string | null;
  name: string;
  channel_type: ChannelType;
  is_readonly: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelMember {
  id: string;
  tenant_id: string;
  channel_id: string;
  profile_id: string;
  is_admin: boolean;
  joined_at: string;
  muted_until: string | null;
}

export interface Message {
  id: string;
  tenant_id: string;
  message_type: MessageType;
  conversation_id: string | null;
  channel_id: string | null;
  sender_id: string;
  body: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  reply_to_id: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  tenant_id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_safe: boolean;
  created_at: string;
}

export interface Circular {
  id: string;
  tenant_id: string | null;
  created_by: string;
  title: string;
  body: string;
  target_type: CircularTargetType;
  target_id: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  recipient_id: string;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  reference_table: string | null;
  reference_id: string | null;
  created_at: string;
}

export type AiDocumentType =
  | "regulation"
  | "course_material"
  | "handbook"
  | "policy"
  | "other";

export interface AiKnowledgeDocument {
  id: string;
  tenant_id: string;
  section_id: string | null;
  material_id: string | null;
  uploaded_by: string;
  title: string;
  doc_type: AiDocumentType;
  file_url: string | null;
  is_active: boolean;
  total_chunks: number;
  created_at: string;
  updated_at: string;
}

export interface AiDocumentChunk {
  id: string;
  tenant_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  timestamp_sec: number | null;
  token_count: number | null;
  created_at: string;
}

export interface ChatbotConversation {
  id: string;
  tenant_id: string;
  user_id: string;
  session_id: string | null;
  is_active: boolean;
  created_at: string;
  ended_at: string | null;
  title: string | null;
}

export interface ChatbotMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  source_chunk_ids: string[];
  token_usage: number | null;
  created_at: string;
}

export interface StudentRecommendation {
  id: string;
  tenant_id: string;
  student_id: string;
  section_id: string | null;
  sent_by: string | null;
  title: string;
  body: string;
  material_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface StudentRiskScore {
  id: string;
  tenant_id: string;
  student_id: string;
  section_id: string;
  semester_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  absence_factor: number;
  grade_factor: number;
  engagement_factor: number;
  alert_sent: boolean;
  computed_at: string;
}

export interface CourseRiskFlag {
  id: string;
  tenant_id: string;
  section_id: string;
  semester_id: string;
  avg_risk_score: number;
  high_risk_count: number;
  failure_rate_pct: number;
  engagement_drop: boolean;
  flagged: boolean;
  alert_sent: boolean;
  computed_at: string;
}

export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending_info"
  | "resolved"
  | "closed"
  | "rejected";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "grade_appeal"
  | "absence_excuse"
  | "registration_issue"
  | "schedule_change"
  | "venue_issue"
  | "technical_problem"
  | "administrative"
  | "other";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  created_by: string;
  assigned_to: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  related_section_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  rating: number | null;
  ai_attempted: boolean;
  ai_suggestion: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  tenant_id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  tenant_id: string;
  ticket_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  tenant_id: string;
  ticket_id: string;
  approver_id: string;
  step_order: number;
  status: ApprovalStatus;
  decision_notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}
