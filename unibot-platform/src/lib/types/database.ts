export type UserRole = 
  | "super_admin"
  | "tenant_admin"
  | "academic_management"
  | "faculty"
  | "student";

export type AccountStatus = "active" | "suspended" | "pending";

export type TicketStatus = 
  | "open"
  | "in_progress"
  | "pending_info"
  | "resolved"
  | "closed"
  | "rejected";

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
