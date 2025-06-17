export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_status_changes: {
        Row: {
          appointment_id: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_date: string | null
          new_status: string | null
          old_date: string | null
          old_status: string | null
          reason: string | null
        }
        Insert: {
          appointment_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_date?: string | null
          new_status?: string | null
          old_date?: string | null
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          appointment_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_date?: string | null
          new_status?: string | null
          old_date?: string | null
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_changes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          equipment_ids: string[] | null
          id: string
          notes: string | null
          patient_id: string
          price: number | null
          rescheduled_from: string | null
          room_id: string | null
          scheduled_date: string
          status: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          equipment_ids?: string[] | null
          id?: string
          notes?: string | null
          patient_id: string
          price?: number | null
          rescheduled_from?: string | null
          room_id?: string | null
          scheduled_date: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          equipment_ids?: string[] | null
          id?: string
          notes?: string | null
          patient_id?: string
          price?: number | null
          rescheduled_from?: string | null
          room_id?: string | null
          scheduled_date?: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          calendar_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          calendar_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          calendar_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          acquisition_cost: number | null
          created_at: string | null
          equipment_type: string | null
          id: string
          maintenance_cost_monthly: number | null
          name: string
          room_id: string | null
          updated_at: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          created_at?: string | null
          equipment_type?: string | null
          id?: string
          maintenance_cost_monthly?: number | null
          name: string
          room_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          created_at?: string | null
          equipment_type?: string | null
          id?: string
          maintenance_cost_monthly?: number | null
          name?: string
          room_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_contents: {
        Row: {
          audience: string | null
          content_text: string
          created_at: string | null
          engagement_stats: Json | null
          id: string
          images: Json | null
          is_published: boolean | null
          length: string | null
          platform: string | null
          post_type: string | null
          published_at: string | null
          title: string
          tone: string | null
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audience?: string | null
          content_text: string
          created_at?: string | null
          engagement_stats?: Json | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          length?: string | null
          platform?: string | null
          post_type?: string | null
          published_at?: string | null
          title: string
          tone?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audience?: string | null
          content_text?: string
          created_at?: string | null
          engagement_stats?: Json | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          length?: string | null
          platform?: string | null
          post_type?: string | null
          published_at?: string | null
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_costs: {
        Row: {
          campaign_name: string | null
          cost: number
          created_at: string | null
          date: string
          id: string
          source: string
        }
        Insert: {
          campaign_name?: string | null
          cost: number
          created_at?: string | null
          date: string
          id?: string
          source: string
        }
        Update: {
          campaign_name?: string | null
          cost?: number
          created_at?: string | null
          date?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      patient_custom_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string | null
          field_value: string | null
          id: string
          patient_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          patient_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          patient_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_custom_fields_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tag_assignments: {
        Row: {
          created_at: string | null
          id: string
          patient_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_tag_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "patient_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          acquisition_source: string | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          first_visit_date: string | null
          gender: string | null
          id: string
          last_name: string
          medical_condition: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          acquisition_source?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          first_visit_date?: string | null
          gender?: string | null
          id?: string
          last_name: string
          medical_condition?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          acquisition_source?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          first_visit_date?: string | null
          gender?: string | null
          id?: string
          last_name?: string
          medical_condition?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string | null
          hourly_cost: number | null
          id: string
          name: string
          room_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_cost?: number | null
          id?: string
          name: string
          room_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_cost?: number | null
          id?: string
          name?: string
          room_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          appointment_id: string | null
          base_price: number
          created_at: string | null
          duration_minutes: number
          equipment_ids: string[] | null
          final_price: number
          id: string
          is_first_session: boolean | null
          notes: string | null
          patient_id: string
          room_id: string | null
          session_date: string
          therapist_id: string | null
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          base_price: number
          created_at?: string | null
          duration_minutes: number
          equipment_ids?: string[] | null
          final_price: number
          id?: string
          is_first_session?: boolean | null
          notes?: string | null
          patient_id: string
          room_id?: string | null
          session_date: string
          therapist_id?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          base_price?: number
          created_at?: string | null
          duration_minutes?: number
          equipment_ids?: string[] | null
          final_price?: number
          id?: string
          is_first_session?: boolean | null
          notes?: string | null
          patient_id?: string
          room_id?: string | null
          session_date?: string
          therapist_id?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          created_at: string | null
          hourly_rate: number | null
          id: string
          name: string
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
