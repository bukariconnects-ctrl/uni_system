export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "academic_management"
  | "head_of_department"
  | "secretary"
  | "ticket_technician"
  | "lecturer"
  | "faculty"
  | "student";

export type SectionStatus = "open" | "closed" | "archived" | "merged";

export type SectionType = "lecture" | "lab" | "tutorial";

export type SemesterStatus =
  | "planning"
  | "registration"
  | "active"
  | "grade_freeze"
  | "archived";

export type SemesterType = "first" | "second" | "summer";

export type ScheduleDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ScheduleStatus = "draft" | "published";

export type VenueType = "lecture_hall" | "lab" | "auditorium" | "other";

export type CourseType = "theoretical" | "practical" | "hybrid";

export type PlanCourseType = "mandatory" | "elective";

export type AccountStatus = "active" | "suspended" | "pending";

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
  | "course_content_query"
  | "leave_excuse_request"
  | "schedule_conflict"
  | "other";

export type TicketEscalationStatus = "pending" | "approved" | "rejected";

export type TenantStatus = "active" | "suspended" | "trial" | "deleted";

export type AiDocumentType =
  | "regulation"
  | "course_material"
  | "handbook"
  | "policy"
  | "other";

export type ContentType = "lecture" | "assignment" | "resource" | "announcement";

export interface Ticket {
  id: string;
  tenant_id: string;
  created_by: string;
  ticket_number: string;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  priority: string;
  assigned_to?: string | null;
  related_section_id?: string | null;
  related_course_id?: string | null;
  is_direct_to_faculty: boolean;
  escalated_from?: string | null;
  priority_reason?: string | null;
  rating?: number | null;
  ai_attempted: boolean;
  ai_suggestion?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketEscalation {
  id: string;
  tenant_id: string;
  ticket_id: string;
  escalated_by: string;
  escalated_to: string;
  from_role: string;
  to_role: string;
  reason: string;
  previous_status: TicketStatus;
  created_at: string;
}

export interface Semester {
  id: string;
  tenant_id: string;
  name: string;
  type: SemesterType;
  semester_type: string;
  academic_year: string;
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

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  body: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  name: string;
  max_users: number;
  max_storage_gb: number;
  price_monthly: number;
  features: string[];
}

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  max_users: number;
  max_storage_gb: number;
  price_monthly: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiKnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  doc_type: AiDocumentType;
  file_url: string;
  is_active: boolean;
  chunk_count: number;
  total_chunks: number;
  created_at: string;
  updated_at: string;
}

export interface ChatbotConversation {
  id: string;
  tenant_id: string;
  student_id: string;
  user_id?: string;
  session_id?: string | null;
  title?: string | null;
  is_active: boolean;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  email?: string | null;
  national_id?: string | null;
  gender?: "male" | "female" | null;
  date_of_birth?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  account_status: AccountStatus;
  is_dnd_active: boolean;
  dnd_message?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  welcome_message?: string | null;
  default_language?: string | null;
  absence_threshold?: number | null;
  absence_limit_count?: number | null;
  status: "active" | "suspended" | "trial";
  language: string;
  timezone: string;
  absence_limit_percent: number;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  admin_email?: string | null;
  max_users?: number | null;
  storage_limit_gb?: number | null;
  created_at: string;
  updated_at: string;
}
