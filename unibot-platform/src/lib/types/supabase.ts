export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_levels: {
        Row: {
          created_at: string
          id: string
          level_number: number
          major_id: string
          name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_number: number
          major_id: string
          name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level_number?: number
          major_id?: string
          name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_levels_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_management_departments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          department_id: string
          profile_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          department_id: string
          profile_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          department_id?: string
          profile_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_management_departments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_management_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_management_departments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_management_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          page_number: number | null
          tenant_id: string
          timestamp_sec: number | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          page_number?: number | null
          tenant_id: string
          timestamp_sec?: number | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          page_number?: number | null
          tenant_id?: string
          timestamp_sec?: number | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["ai_document_type"]
          file_url: string | null
          id: string
          is_active: boolean
          material_id: string | null
          section_id: string | null
          tenant_id: string
          title: string
          total_chunks: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["ai_document_type"]
          file_url?: string | null
          id?: string
          is_active?: boolean
          material_id?: string | null
          section_id?: string | null
          tenant_id: string
          title: string
          total_chunks?: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["ai_document_type"]
          file_url?: string | null
          id?: string
          is_active?: boolean
          material_id?: string | null
          section_id?: string | null
          tenant_id?: string
          title?: string
          total_chunks?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_documents_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string
          id: number
          model: string | null
          prompt_tokens: number
          tenant_id: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: number
          model?: string | null
          prompt_tokens?: number
          tenant_id: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: number
          model?: string | null
          prompt_tokens?: number
          tenant_id?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_token_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          approver_id: string
          created_at: string
          decided_at: string | null
          decision_notes: string | null
          id: string
          status: Database["public"]["Enums"]["approval_status"]
          step_order: number
          tenant_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
          tenant_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late: boolean
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          is_published: boolean
          max_grade: number
          section_id: string
          tenant_id: string
          title: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          allow_late?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          is_published?: boolean
          max_grade?: number
          section_id: string
          tenant_id: string
          title: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          allow_late?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          is_published?: boolean
          max_grade?: number
          section_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_time: string | null
          created_at: string
          id: string
          method: string | null
          modification_reason: string | null
          modified_at: string | null
          modified_by: string | null
          section_id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string
          id?: string
          method?: string | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          section_id: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          check_in_time?: string | null
          created_at?: string
          id?: string
          method?: string | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          section_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string | null
          geo_latitude: number | null
          geo_longitude: number | null
          geo_radius_m: number | null
          id: string
          is_open: boolean
          qr_code: string | null
          qr_expires_at: string | null
          schedule_id: string | null
          section_id: string
          session_date: string
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_radius_m?: number | null
          id?: string
          is_open?: boolean
          qr_code?: string | null
          qr_expires_at?: string | null
          schedule_id?: string | null
          section_id: string
          session_date: string
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_radius_m?: number | null
          id?: string
          is_open?: boolean
          qr_code?: string | null
          qr_expires_at?: string | null
          schedule_id?: string | null
          section_id?: string
          session_date?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_summaries: {
        Row: {
          absence_percentage: number
          attended_sessions: number
          dismissed_at: string | null
          enrollment_id: string
          excused_absences: number
          id: string
          is_dismissed: boolean
          last_updated: string
          late_count: number
          section_id: string
          student_id: string
          tenant_id: string
          total_sessions: number
          unexcused_absences: number
        }
        Insert: {
          absence_percentage?: number
          attended_sessions?: number
          dismissed_at?: string | null
          enrollment_id: string
          excused_absences?: number
          id?: string
          is_dismissed?: boolean
          last_updated?: string
          late_count?: number
          section_id: string
          student_id: string
          tenant_id: string
          total_sessions?: number
          unexcused_absences?: number
        }
        Update: {
          absence_percentage?: number
          attended_sessions?: number
          dismissed_at?: string | null
          enrollment_id?: string
          excused_absences?: number
          id?: string
          is_dismissed?: boolean
          last_updated?: string
          late_count?: number
          section_id?: string
          student_id?: string
          tenant_id?: string
          total_sessions?: number
          unexcused_absences?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_summaries_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summaries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          id: number
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_table: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          is_admin: boolean
          joined_at: string
          muted_until: string | null
          profile_id: string
          tenant_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          muted_until?: string | null
          profile_id: string
          tenant_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          muted_until?: string | null
          profile_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          created_by: string | null
          id: string
          is_readonly: boolean
          name: string
          section_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_readonly?: boolean
          name: string
          section_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_readonly?: boolean
          name?: string
          section_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          session_id: string | null
          tenant_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          session_id?: string | null
          tenant_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          session_id?: string | null
          tenant_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          source_chunk_ids: string[] | null
          tenant_id: string
          token_usage: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          source_chunk_ids?: string[] | null
          tenant_id: string
          token_usage?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          source_chunk_ids?: string[] | null
          tenant_id?: string
          token_usage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      circulars: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_mandatory: boolean
          is_published: boolean
          published_at: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["circular_target_type"]
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          published_at?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["circular_target_type"]
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          published_at?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["circular_target_type"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circulars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          absence_threshold: number | null
          campus_id: string | null
          code: string | null
          created_at: string
          dean_id: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          absence_threshold?: number | null
          campus_id?: string | null
          code?: string | null
          created_at?: string
          dean_id?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          absence_threshold?: number | null
          campus_id?: string | null
          code?: string | null
          created_at?: string
          dean_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colleges_dean_id_fkey"
            columns: ["dean_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colleges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_a: string
          participant_b: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_a: string
          participant_b: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_a?: string
          participant_b?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          description: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_ai_approved: boolean
          is_published: boolean
          section_id: string
          tenant_id: string
          title: string
          updated_at: string
          uploaded_by: string
          view_count: number
          week_number: number | null
        }
        Insert: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_ai_approved?: boolean
          is_published?: boolean
          section_id: string
          tenant_id: string
          title: string
          updated_at?: string
          uploaded_by: string
          view_count?: number
          week_number?: number | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_ai_approved?: boolean
          is_published?: boolean
          section_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
          view_count?: number
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          min_grade: number
          prerequisite_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          min_grade?: number
          prerequisite_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          min_grade?: number
          prerequisite_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_risk_flags: {
        Row: {
          alert_sent: boolean
          avg_risk_score: number
          computed_at: string
          engagement_drop: boolean
          failure_rate_pct: number
          flagged: boolean
          high_risk_count: number
          id: string
          section_id: string
          semester_id: string
          tenant_id: string
        }
        Insert: {
          alert_sent?: boolean
          avg_risk_score?: number
          computed_at?: string
          engagement_drop?: boolean
          failure_rate_pct?: number
          flagged?: boolean
          high_risk_count?: number
          id?: string
          section_id: string
          semester_id: string
          tenant_id: string
        }
        Update: {
          alert_sent?: boolean
          avg_risk_score?: number
          computed_at?: string
          engagement_drop?: boolean
          failure_rate_pct?: number
          flagged?: boolean
          high_risk_count?: number
          id?: string
          section_id?: string
          semester_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_risk_flags_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_risk_flags_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_risk_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          credit_hours: number
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          credit_hours?: number
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          credit_hours?: number
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          scope: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          scope?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          scope?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          college_id: string
          created_at: string
          head_id: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          college_id: string
          created_at?: string
          head_id?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          college_id?: string
          created_at?: string
          head_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          dropped_at: string | null
          enrolled_at: string
          final_grade: number | null
          id: string
          letter_grade: string | null
          section_id: string
          semester_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropped_at?: string | null
          enrolled_at?: string
          final_grade?: number | null
          id?: string
          letter_grade?: string | null
          section_id: string
          semester_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropped_at?: string | null
          enrolled_at?: string
          final_grade?: number | null
          id?: string
          letter_grade?: string | null
          section_id?: string
          semester_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_departments: {
        Row: {
          department_id: string
          faculty_id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          department_id: string
          faculty_id: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          department_id?: string
          faculty_id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_profiles: {
        Row: {
          created_at: string
          employee_id: string | null
          office_hours: Json | null
          profile_id: string
          specialization: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          office_hours?: Json | null
          profile_id: string
          specialization?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          office_hours?: Json | null
          profile_id?: string
          specialization?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gradebook_entries: {
        Row: {
          coursework_grade: number | null
          created_at: string
          enrollment_id: string
          final_grade: number | null
          id: string
          is_published: boolean
          midterm_grade: number | null
          published_at: string | null
          recorded_by: string | null
          section_id: string
          student_id: string
          tenant_id: string
          total_grade: number | null
          updated_at: string
        }
        Insert: {
          coursework_grade?: number | null
          created_at?: string
          enrollment_id: string
          final_grade?: number | null
          id?: string
          is_published?: boolean
          midterm_grade?: number | null
          published_at?: string | null
          recorded_by?: string | null
          section_id: string
          student_id: string
          tenant_id: string
          total_grade?: number | null
          updated_at?: string
        }
        Update: {
          coursework_grade?: number | null
          created_at?: string
          enrollment_id?: string
          final_grade?: number | null
          id?: string
          is_published?: boolean
          midterm_grade?: number | null
          published_at?: string | null
          recorded_by?: string | null
          section_id?: string
          student_id?: string
          tenant_id?: string
          total_grade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradebook_entries_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      majors: {
        Row: {
          code: string | null
          created_at: string
          department_id: string
          duration_years: number
          id: string
          name: string
          tenant_id: string
          total_credits: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id: string
          duration_years?: number
          id?: string
          name: string
          tenant_id: string
          total_credits?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string
          duration_years?: number
          id?: string
          name?: string
          tenant_id?: string
          total_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "majors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "majors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          is_safe: boolean
          message_id: string
          mime_type: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_safe?: boolean
          message_id: string
          mime_type?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_safe?: boolean
          message_id?: string
          mime_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          channel_id: string | null
          conversation_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          is_pinned: boolean
          message_type: Database["public"]["Enums"]["message_type"]
          reply_to_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          reply_to_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          reply_to_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          read_at: string | null
          recipient_id: string
          reference_id: string | null
          reference_table: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          read_at?: string | null
          recipient_id: string
          reference_id?: string | null
          reference_table?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          read_at?: string | null
          recipient_id?: string
          reference_id?: string | null
          reference_table?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          custom_role_id: string
          profile_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id: string
          profile_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_custom_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_custom_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_custom_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          dnd_message: string | null
          email: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_dnd_active: boolean
          last_login_at: string | null
          last_name: string
          national_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          search_vector: unknown
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          dnd_message?: string | null
          email?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_dnd_active?: boolean
          last_login_at?: string | null
          last_name: string
          national_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          dnd_message?: string | null
          email?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_dnd_active?: boolean
          last_login_at?: string | null
          last_name?: string
          national_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          day_of_week: Database["public"]["Enums"]["schedule_day"]
          end_time: string
          id: string
          section_id: string
          start_time: string
          status: Database["public"]["Enums"]["schedule_status"]
          tenant_id: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: Database["public"]["Enums"]["schedule_day"]
          end_time: string
          id?: string
          section_id: string
          start_time: string
          status?: Database["public"]["Enums"]["schedule_status"]
          tenant_id: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["schedule_day"]
          end_time?: string
          id?: string
          section_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          tenant_id?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          enrolled_count: number
          id: string
          instructor_id: string | null
          max_capacity: number
          merged_into_id: string | null
          parent_section_id: string | null
          section_code: string
          section_type: Database["public"]["Enums"]["section_type"]
          semester_id: string
          status: Database["public"]["Enums"]["section_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          max_capacity?: number
          merged_into_id?: string | null
          parent_section_id?: string | null
          section_code: string
          section_type?: Database["public"]["Enums"]["section_type"]
          semester_id: string
          status?: Database["public"]["Enums"]["section_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          max_capacity?: number
          merged_into_id?: string | null
          parent_section_id?: string | null
          section_code?: string
          section_type?: Database["public"]["Enums"]["section_type"]
          semester_id?: string
          status?: Database["public"]["Enums"]["section_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          academic_year: string
          add_drop_end: string | null
          add_drop_start: string | null
          created_at: string
          end_date: string
          grade_freeze_at: string | null
          id: string
          max_credit_hours: number
          min_credit_hours: number
          name: string
          reg_end: string | null
          reg_start: string | null
          self_reg_enabled: boolean
          semester_type: Database["public"]["Enums"]["semester_type"]
          start_date: string
          status: Database["public"]["Enums"]["semester_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          add_drop_end?: string | null
          add_drop_start?: string | null
          created_at?: string
          end_date: string
          grade_freeze_at?: string | null
          id?: string
          max_credit_hours?: number
          min_credit_hours?: number
          name: string
          reg_end?: string | null
          reg_start?: string | null
          self_reg_enabled?: boolean
          semester_type: Database["public"]["Enums"]["semester_type"]
          start_date: string
          status?: Database["public"]["Enums"]["semester_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          add_drop_end?: string | null
          add_drop_start?: string | null
          created_at?: string
          end_date?: string
          grade_freeze_at?: string | null
          id?: string
          max_credit_hours?: number
          min_credit_hours?: number
          name?: string
          reg_end?: string | null
          reg_start?: string | null
          self_reg_enabled?: boolean
          semester_type?: Database["public"]["Enums"]["semester_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["semester_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_majors: {
        Row: {
          academic_level_id: string | null
          enrolled_at: string
          is_primary: boolean
          major_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          academic_level_id?: string | null
          enrolled_at?: string
          is_primary?: boolean
          major_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          academic_level_id?: string | null
          enrolled_at?: string
          is_primary?: boolean
          major_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_majors_academic_level_id_fkey"
            columns: ["academic_level_id"]
            isOneToOne: false
            referencedRelation: "academic_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_majors_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_majors_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_majors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          cumulative_gpa: number | null
          earned_credit_hours: number | null
          enrollment_year: number | null
          profile_id: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number | null
          risk_updated_at: string | null
          student_number: string
          tenant_id: string
          total_credit_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cumulative_gpa?: number | null
          earned_credit_hours?: number | null
          enrollment_year?: number | null
          profile_id: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          risk_updated_at?: string | null
          student_number: string
          tenant_id: string
          total_credit_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cumulative_gpa?: number | null
          earned_credit_hours?: number | null
          enrollment_year?: number | null
          profile_id?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          risk_updated_at?: string | null
          student_number?: string
          tenant_id?: string
          total_credit_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_recommendations: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          material_url: string | null
          section_id: string | null
          sent_by: string | null
          student_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          material_url?: string | null
          section_id?: string | null
          sent_by?: string | null
          student_id: string
          tenant_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          material_url?: string | null
          section_id?: string | null
          sent_by?: string | null
          student_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_recommendations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_recommendations_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_risk_scores: {
        Row: {
          absence_factor: number
          alert_sent: boolean
          computed_at: string
          engagement_factor: number
          grade_factor: number
          id: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          section_id: string
          semester_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          absence_factor?: number
          alert_sent?: boolean
          computed_at?: string
          engagement_factor?: number
          grade_factor?: number
          id?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          section_id: string
          semester_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          absence_factor?: number
          alert_sent?: boolean
          computed_at?: string
          engagement_factor?: number
          grade_factor?: number
          id?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          section_id?: string
          semester_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_risk_scores_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_scores_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_courses: {
        Row: {
          academic_level_id: string
          course_id: string
          created_at: string
          id: string
          min_grade_to_pass: number
          plan_course_type: Database["public"]["Enums"]["plan_course_type"]
          semester_type: Database["public"]["Enums"]["semester_type"]
          tenant_id: string
        }
        Insert: {
          academic_level_id: string
          course_id: string
          created_at?: string
          id?: string
          min_grade_to_pass?: number
          plan_course_type?: Database["public"]["Enums"]["plan_course_type"]
          semester_type?: Database["public"]["Enums"]["semester_type"]
          tenant_id: string
        }
        Update: {
          academic_level_id?: string
          course_id?: string
          created_at?: string
          id?: string
          min_grade_to_pass?: number
          plan_course_type?: Database["public"]["Enums"]["plan_course_type"]
          semester_type?: Database["public"]["Enums"]["semester_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_courses_academic_level_id_fkey"
            columns: ["academic_level_id"]
            isOneToOne: false
            referencedRelation: "academic_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string
          tenant_id: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string
          tenant_id: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string
          tenant_id?: string
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_storage_gb: number
          max_users: number
          name: Database["public"]["Enums"]["subscription_plan"]
          price_monthly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_storage_gb?: number
          max_users?: number
          name: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_storage_gb?: number
          max_users?: number
          name?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          end_date: string
          id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          end_date: string
          id?: string
          plan_id: string
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabi: {
        Row: {
          content: Json
          created_at: string
          id: string
          instructor_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_id: string
          status: Database["public"]["Enums"]["syllabus_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          instructor_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id: string
          status?: Database["public"]["Enums"]["syllabus_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          instructor_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string
          status?: Database["public"]["Enums"]["syllabus_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabi_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabi_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabi_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabi_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          absence_threshold: number
          admin_email: string
          contract_end: string | null
          contract_start: string | null
          created_at: string
          custom_domain: string | null
          default_language: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          max_storage_gb: number
          max_users: number
          name: string
          plan_id: string | null
          primary_color: string | null
          secondary_color: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          storage_used_gb: number
          subdomain: string
          timezone: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          absence_threshold?: number
          admin_email: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number
          max_users?: number
          name: string
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          storage_used_gb?: number
          subdomain: string
          timezone?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          absence_threshold?: number
          admin_email?: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number
          max_users?: number
          name?: string
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          storage_used_gb?: number
          subdomain?: string
          timezone?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          tenant_id: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          tenant_id: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          tenant_id?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          tenant_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_number_sequences: {
        Row: {
          next_number: number
          tenant_id: string
        }
        Insert: {
          next_number?: number
          tenant_id: string
        }
        Update: {
          next_number?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_number_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_attempted: boolean
          ai_suggestion: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          rating: number | null
          related_section_id: string | null
          resolved_at: string | null
          search_vector: unknown
          status: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_attempted?: boolean
          ai_suggestion?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          related_section_id?: string | null
          resolved_at?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_attempted?: boolean
          ai_suggestion?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          related_section_id?: string | null
          resolved_at?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id?: string
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_related_section_id_fkey"
            columns: ["related_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          building: string | null
          campus_id: string | null
          capacity: number
          code: string | null
          created_at: string
          floor: string | null
          has_ac: boolean
          has_projector: boolean
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          building?: string | null
          campus_id?: string | null
          capacity?: number
          code?: string | null
          created_at?: string
          floor?: string | null
          has_ac?: boolean
          has_projector?: boolean
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          building?: string | null
          campus_id?: string | null
          capacity?: number
          code?: string | null
          created_at?: string
          floor?: string | null
          has_ac?: boolean
          has_projector?: boolean
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "venues_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_tenant_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      calculate_student_gpa: {
        Args: { p_student_id: string; p_tenant_id: string }
        Returns: undefined
      }
      clone_college_to_campus: {
        Args: {
          p_source_college_id: string
          p_target_campus_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      current_profile_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      generate_renewal_invoices: { Args: never; Returns: undefined }
      get_my_channel_ids: { Args: never; Returns: string[] }
      get_my_managed_departments: { Args: never; Returns: string[] }
      get_my_role: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      match_chunks: {
        Args: {
          match_count?: number
          match_tenant_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          page_number: number
          similarity: number
          timestamp_sec: number
        }[]
      }
      private_get_profile_claims: {
        Args: { uid: string }
        Returns: {
          user_role: string
          user_tenant_id: string
        }[]
      }
      refresh_student_risk_levels: { Args: never; Returns: undefined }
      send_risk_alerts: { Args: never; Returns: undefined }
    }
    Enums: {
      account_status: "active" | "suspended" | "terminated"
      ai_document_type:
        | "regulation"
        | "course_material"
        | "handbook"
        | "policy"
        | "other"
      approval_status: "pending" | "approved" | "rejected"
      attendance_status: "present" | "absent" | "late" | "excused"
      audit_action:
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
        | "data_wipe"
      channel_type: "course" | "department" | "announcement" | "direct"
      circular_target_type:
        | "all"
        | "department"
        | "major"
        | "level"
        | "section"
        | "faculty"
        | "students"
      content_type:
        | "video"
        | "pdf"
        | "audio"
        | "presentation"
        | "document"
        | "link"
        | "other"
      course_type: "theoretical" | "practical" | "hybrid"
      enrollment_status:
        | "enrolled"
        | "dropped"
        | "completed"
        | "failed"
        | "dismissed"
        | "withdrawn"
      gender: "male" | "female"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      message_status: "sent" | "delivered" | "read"
      message_type: "direct" | "channel"
      notification_type:
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
        | "cancellation"
      plan_course_type: "mandatory" | "elective"
      risk_level: "low" | "medium" | "high" | "critical"
      schedule_day:
        | "sunday"
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
      schedule_status: "draft" | "published"
      section_status: "open" | "closed" | "archived" | "merged"
      section_type: "lecture" | "lab" | "tutorial"
      semester_status:
        | "planning"
        | "registration"
        | "active"
        | "grade_freeze"
        | "archived"
      semester_type: "first" | "second" | "summer"
      submission_status: "submitted" | "late" | "graded" | "resubmit_requested"
      subscription_plan: "basic" | "pro" | "enterprise"
      subscription_status: "active" | "pending" | "expired" | "cancelled"
      syllabus_status: "draft" | "submitted" | "approved" | "rejected"
      tenant_status: "active" | "suspended" | "deleted"
      ticket_category:
        | "grade_appeal"
        | "absence_excuse"
        | "registration_issue"
        | "schedule_change"
        | "venue_issue"
        | "technical_problem"
        | "administrative"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "pending_info"
        | "resolved"
        | "closed"
        | "rejected"
      user_role:
        | "super_admin"
        | "tenant_admin"
        | "academic_management"
        | "faculty"
        | "student"
      venue_type: "lecture_hall" | "lab" | "auditorium" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "terminated"],
      ai_document_type: [
        "regulation",
        "course_material",
        "handbook",
        "policy",
        "other",
      ],
      approval_status: ["pending", "approved", "rejected"],
      attendance_status: ["present", "absent", "late", "excused"],
      audit_action: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "impersonate",
        "grade_modify",
        "permission_change",
        "file_delete",
        "status_change",
        "ticket_resolve",
        "attendance_modify",
        "data_wipe",
      ],
      channel_type: ["course", "department", "announcement", "direct"],
      circular_target_type: [
        "all",
        "department",
        "major",
        "level",
        "section",
        "faculty",
        "students",
      ],
      content_type: [
        "video",
        "pdf",
        "audio",
        "presentation",
        "document",
        "link",
        "other",
      ],
      course_type: ["theoretical", "practical", "hybrid"],
      enrollment_status: [
        "enrolled",
        "dropped",
        "completed",
        "failed",
        "dismissed",
        "withdrawn",
      ],
      gender: ["male", "female"],
      invoice_status: ["draft", "sent", "paid", "overdue"],
      message_status: ["sent", "delivered", "read"],
      message_type: ["direct", "channel"],
      notification_type: [
        "circular",
        "absence_warning",
        "absence_dismissal",
        "grade_released",
        "assignment_due",
        "ticket_update",
        "system",
        "risk_alert",
        "recommendation",
        "schedule_change",
        "cancellation",
      ],
      plan_course_type: ["mandatory", "elective"],
      risk_level: ["low", "medium", "high", "critical"],
      schedule_day: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      schedule_status: ["draft", "published"],
      section_status: ["open", "closed", "archived", "merged"],
      section_type: ["lecture", "lab", "tutorial"],
      semester_status: [
        "planning",
        "registration",
        "active",
        "grade_freeze",
        "archived",
      ],
      semester_type: ["first", "second", "summer"],
      submission_status: ["submitted", "late", "graded", "resubmit_requested"],
      subscription_plan: ["basic", "pro", "enterprise"],
      subscription_status: ["active", "pending", "expired", "cancelled"],
      syllabus_status: ["draft", "submitted", "approved", "rejected"],
      tenant_status: ["active", "suspended", "deleted"],
      ticket_category: [
        "grade_appeal",
        "absence_excuse",
        "registration_issue",
        "schedule_change",
        "venue_issue",
        "technical_problem",
        "administrative",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "pending_info",
        "resolved",
        "closed",
        "rejected",
      ],
      user_role: [
        "super_admin",
        "tenant_admin",
        "academic_management",
        "faculty",
        "student",
      ],
      venue_type: ["lecture_hall", "lab", "auditorium", "other"],
    },
  },
} as const
