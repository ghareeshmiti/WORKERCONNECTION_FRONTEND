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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_daily_rollups: {
        Row: {
          attendance_date: string
          created_at: string
          establishment_id: string | null
          first_checkin_at: string | null
          id: string
          last_checkout_at: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          total_hours: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          establishment_id?: string | null
          first_checkin_at?: string | null
          id?: string
          last_checkout_at?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_hours?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          establishment_id?: string | null
          first_checkin_at?: string | null
          id?: string
          last_checkout_at?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_hours?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_daily_rollups_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_rollups_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          created_at: string
          establishment_id: string | null
          event_type: Database["public"]["Enums"]["attendance_event_type"]
          id: string
          meta: Json | null
          occurred_at: string
          region: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          event_type: Database["public"]["Enums"]["attendance_event_type"]
          id?: string
          meta?: Json | null
          occurred_at?: string
          region: string
          worker_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          event_type?: Database["public"]["Enums"]["attendance_event_type"]
          id?: string
          meta?: Json | null
          occurred_at?: string
          region?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          address_line: string | null
          code: string
          created_at: string
          description: string | null
          district: string
          email: string | null
          id: string
          is_active: boolean
          mandal: string | null
          name: string
          phone: string | null
          pincode: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          code: string
          created_at?: string
          description?: string | null
          district: string
          email?: string | null
          id?: string
          is_active?: boolean
          mandal?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          code?: string
          created_at?: string
          description?: string | null
          district?: string
          email?: string | null
          id?: string
          is_active?: boolean
          mandal?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address_line: string | null
          approved_at: string | null
          approved_by: string | null
          card_reader_id: string | null
          code: string
          construction_type: string | null
          contractor_name: string | null
          created_at: string
          department_id: string
          description: string | null
          district: string
          email: string | null
          establishment_type: string | null
          estimated_workers: number | null
          expected_end_date: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          license_number: string | null
          mandal: string | null
          name: string
          phone: string | null
          pincode: string | null
          project_name: string | null
          start_date: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          approved_at?: string | null
          approved_by?: string | null
          card_reader_id?: string | null
          code: string
          construction_type?: string | null
          contractor_name?: string | null
          created_at?: string
          department_id: string
          description?: string | null
          district: string
          email?: string | null
          establishment_type?: string | null
          estimated_workers?: number | null
          expected_end_date?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          license_number?: string | null
          mandal?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          project_name?: string | null
          start_date?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          approved_at?: string | null
          approved_by?: string | null
          card_reader_id?: string | null
          code?: string
          construction_type?: string | null
          contractor_name?: string | null
          created_at?: string
          department_id?: string
          description?: string | null
          district?: string
          email?: string | null
          establishment_type?: string | null
          estimated_workers?: number | null
          expected_end_date?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          license_number?: string | null
          mandal?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          project_name?: string | null
          start_date?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          department_id: string | null
          establishment_id: string | null
          full_name: string | null
          id: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_mappings: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          is_active: boolean
          mapped_at: string
          mapped_by: string | null
          notes: string | null
          unmapped_at: string | null
          unmapped_by: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          is_active?: boolean
          mapped_at?: string
          mapped_by?: string | null
          notes?: string | null
          unmapped_at?: string | null
          unmapped_by?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_active?: boolean
          mapped_at?: string
          mapped_by?: string | null
          notes?: string | null
          unmapped_at?: string | null
          unmapped_by?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_mappings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_mappings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          aadhaar_last_four: string | null
          access_card_id: string | null
          address_line: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          district: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          experience_years: number | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean
          last_name: string
          mandal: string | null
          phone: string | null
          photo_url: string | null
          pincode: string | null
          skills: string[] | null
          state: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          aadhaar_last_four?: string | null
          access_card_id?: string | null
          address_line?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          district: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          experience_years?: number | null
          first_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          mandal?: string | null
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          skills?: string[] | null
          state: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          aadhaar_last_four?: string | null
          access_card_id?: string | null
          address_line?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          district?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          experience_years?: number | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          mandal?: string | null
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          skills?: string[] | null
          state?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_worker_id: { Args: never; Returns: string }
      get_user_department_id: { Args: { _user_id: string }; Returns: string }
      get_user_establishment_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_worker_id: { Args: { _user_id: string }; Returns: string }
      get_worker_mapped_establishment_ids: {
        Args: { _worker_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      worker_belongs_to_establishment_department: {
        Args: { _establishment_id: string; _worker_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "DEPARTMENT_ADMIN" | "ESTABLISHMENT_ADMIN" | "WORKER"
      attendance_event_type: "CHECK_IN" | "CHECK_OUT"
      attendance_status: "PRESENT" | "PARTIAL" | "ABSENT"
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
      app_role: ["DEPARTMENT_ADMIN", "ESTABLISHMENT_ADMIN", "WORKER"],
      attendance_event_type: ["CHECK_IN", "CHECK_OUT"],
      attendance_status: ["PRESENT", "PARTIAL", "ABSENT"],
    },
  },
} as const
