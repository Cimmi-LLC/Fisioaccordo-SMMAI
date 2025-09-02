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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounting_costs: {
        Row: {
          cost_name: string
          cost_value: number
          created_at: string
          id: string
          is_predefined: boolean
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_name: string
          cost_value?: number
          created_at?: string
          id?: string
          is_predefined?: boolean
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_name?: string
          cost_value?: number
          created_at?: string
          id?: string
          is_predefined?: boolean
          section_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accounting_scenarios: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          results: Json
          scenario_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          results: Json
          scenario_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          results?: Json
          scenario_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_custom_fields: {
        Row: {
          appointment_id: string
          created_at: string
          field_name: string
          field_type: string
          field_value: string | null
          id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          field_name: string
          field_type?: string
          field_value?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          field_name?: string
          field_type?: string
          field_value?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_custom_fields_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
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
      appointment_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_tag_id: string | null
          appointment_type: string | null
          booking_source: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          equipment_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          patient_id: string | null
          price: number | null
          rescheduled_from: string | null
          room_id: string | null
          scheduled_date: string
          status: string | null
          therapist_id: string
          treatment_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_tag_id?: string | null
          appointment_type?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          price?: number | null
          rescheduled_from?: string | null
          room_id?: string | null
          scheduled_date: string
          status?: string | null
          therapist_id: string
          treatment_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_tag_id?: string | null
          appointment_type?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          price?: number | null
          rescheduled_from?: string | null
          room_id?: string | null
          scheduled_date?: string
          status?: string | null
          therapist_id?: string
          treatment_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_tag_id_fkey"
            columns: ["appointment_tag_id"]
            isOneToOne: false
            referencedRelation: "appointment_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "fk_appointments_treatment_id"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_failure_logs: {
        Row: {
          attempted_at: string
          attempted_email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          attempted_email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          attempted_email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      clinic_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          apply_withholding_tax: boolean | null
          city: string | null
          civic_number: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          entity_type: string | null
          first_name: string | null
          id: string
          invoice_counter: number | null
          is_agricultural: boolean | null
          is_non_profit: boolean | null
          is_occasional_performer: boolean | null
          is_public_administration: boolean | null
          is_tax_exempt: boolean | null
          is_vat_liable: boolean | null
          last_name: string | null
          pec_email: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          reminder_hours: number | null
          reminder_message: string | null
          sdi_code: string | null
          tax_code: string | null
          tax_regime: string | null
          ts_certificate_path: string | null
          ts_enabled: boolean | null
          ts_password_hash: string | null
          ts_transmitter_code: string | null
          ts_username: string | null
          updated_at: string | null
          use_electronic_invoicing: boolean | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          apply_withholding_tax?: boolean | null
          city?: string | null
          civic_number?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          entity_type?: string | null
          first_name?: string | null
          id?: string
          invoice_counter?: number | null
          is_agricultural?: boolean | null
          is_non_profit?: boolean | null
          is_occasional_performer?: boolean | null
          is_public_administration?: boolean | null
          is_tax_exempt?: boolean | null
          is_vat_liable?: boolean | null
          last_name?: string | null
          pec_email?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          reminder_hours?: number | null
          reminder_message?: string | null
          sdi_code?: string | null
          tax_code?: string | null
          tax_regime?: string | null
          ts_certificate_path?: string | null
          ts_enabled?: boolean | null
          ts_password_hash?: string | null
          ts_transmitter_code?: string | null
          ts_username?: string | null
          updated_at?: string | null
          use_electronic_invoicing?: boolean | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          apply_withholding_tax?: boolean | null
          city?: string | null
          civic_number?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          entity_type?: string | null
          first_name?: string | null
          id?: string
          invoice_counter?: number | null
          is_agricultural?: boolean | null
          is_non_profit?: boolean | null
          is_occasional_performer?: boolean | null
          is_public_administration?: boolean | null
          is_tax_exempt?: boolean | null
          is_vat_liable?: boolean | null
          last_name?: string | null
          pec_email?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          reminder_hours?: number | null
          reminder_message?: string | null
          sdi_code?: string | null
          tax_code?: string | null
          tax_regime?: string | null
          ts_certificate_path?: string | null
          ts_enabled?: boolean | null
          ts_password_hash?: string | null
          ts_transmitter_code?: string | null
          ts_username?: string | null
          updated_at?: string | null
          use_electronic_invoicing?: boolean | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      custom_sections: {
        Row: {
          created_at: string | null
          group_key: string
          id: string
          section_key: string
          section_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_key: string
          id?: string
          section_key: string
          section_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_key?: string
          id?: string
          section_key?: string
          section_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deletion_logs: {
        Row: {
          action: string | null
          created_at: string | null
          error: string | null
          id: string
          result: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          result?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          result?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          template_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      exercise_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          created_at: string
          duration_minutes: number | null
          fatigue_rating: number | null
          id: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          fatigue_rating?: number | null
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          fatigue_rating?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "patient_exercise_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_completions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_materials: {
        Row: {
          created_at: string
          description: string | null
          exercise_id: string
          external_url: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          material_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_id: string
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          material_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_id?: string
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          material_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_exercise_materials_exercise"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          instructions: string | null
          name: string
          therapist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_part?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          name: string
          therapist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_part?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          name?: string
          therapist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
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
      invoices: {
        Row: {
          created_at: string
          description: string
          document_type: string
          id: string
          invoice_date: string
          invoice_number: string
          natura: string | null
          pdf_url: string | null
          quantity: number
          session_id: string | null
          tax_rate: number
          taxable_amount: number
          total_amount: number
          unit_price: number
          updated_at: string
          user_id: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          description: string
          document_type: string
          id?: string
          invoice_date: string
          invoice_number: string
          natura?: string | null
          pdf_url?: string | null
          quantity?: number
          session_id?: string | null
          tax_rate?: number
          taxable_amount: number
          total_amount: number
          unit_price: number
          updated_at?: string
          user_id: string
          vat_amount: number
        }
        Update: {
          created_at?: string
          description?: string
          document_type?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          natura?: string | null
          pdf_url?: string | null
          quantity?: number
          session_id?: string | null
          tax_rate?: number
          taxable_amount?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          birth_place: string | null
          city: string | null
          civic_number: string | null
          codice_destinatario: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          denominazione: string | null
          email: string | null
          first_name: string
          fonte_acquisizione: string | null
          id: string
          last_name: string
          nationality: string | null
          notes: string | null
          pec_destinatario: string | null
          phone: string | null
          piva: string | null
          postal_code: string | null
          province: string | null
          referring_patient_id: string | null
          tax_code: string | null
          temperatura: string | null
          therapist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_place?: string | null
          city?: string | null
          civic_number?: string | null
          codice_destinatario?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          denominazione?: string | null
          email?: string | null
          first_name: string
          fonte_acquisizione?: string | null
          id?: string
          last_name: string
          nationality?: string | null
          notes?: string | null
          pec_destinatario?: string | null
          phone?: string | null
          piva?: string | null
          postal_code?: string | null
          province?: string | null
          referring_patient_id?: string | null
          tax_code?: string | null
          temperatura?: string | null
          therapist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          birth_place?: string | null
          city?: string | null
          civic_number?: string | null
          codice_destinatario?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          denominazione?: string | null
          email?: string | null
          first_name?: string
          fonte_acquisizione?: string | null
          id?: string
          last_name?: string
          nationality?: string | null
          notes?: string | null
          pec_destinatario?: string | null
          phone?: string | null
          piva?: string | null
          postal_code?: string | null
          province?: string | null
          referring_patient_id?: string | null
          tax_code?: string | null
          temperatura?: string | null
          therapist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_referring_patient_id_fkey"
            columns: ["referring_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_costs: {
        Row: {
          campaign_name: string | null
          cost: number
          created_at: string | null
          date: string
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          campaign_name?: string | null
          cost: number
          created_at?: string | null
          date: string
          id?: string
          source: string
          user_id?: string | null
        }
        Update: {
          campaign_name?: string | null
          cost?: number
          created_at?: string | null
          date?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          created_at: string
          document_data: Json
          document_type: string
          generated_at: string
          id: string
          patient_id: string
          pdf_url: string | null
          template_id: string | null
          therapist_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_data?: Json
          document_type?: string
          generated_at?: string
          id?: string
          patient_id: string
          pdf_url?: string | null
          template_id?: string | null
          therapist_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_data?: Json
          document_type?: string
          generated_at?: string
          id?: string
          patient_id?: string
          pdf_url?: string | null
          template_id?: string | null
          therapist_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_exercise_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          exercise_id: string
          frequency_type: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          patient_id: string
          target_duration_minutes: number | null
          target_frequency_per_week: number | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          exercise_id: string
          frequency_type?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id: string
          target_duration_minutes?: number | null
          target_frequency_per_week?: number | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          exercise_id?: string
          frequency_type?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id?: string
          target_duration_minutes?: number | null
          target_frequency_per_week?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_exercise_assignments_exercise"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_patient_exercise_assignments_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exercise_logs: {
        Row: {
          assignment_id: string
          completed_at: string
          created_at: string
          difficulty_rating: number | null
          duration_minutes: number | null
          id: string
          mood_rating: number | null
          notes: string | null
          pain_level: number | null
          patient_id: string
          repetitions_completed: number | null
          sets_completed: number | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          created_at?: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          pain_level?: number | null
          patient_id: string
          repetitions_completed?: number | null
          sets_completed?: number | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          created_at?: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          pain_level?: number | null
          patient_id?: string
          repetitions_completed?: number | null
          sets_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_exercise_logs_assignment"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "patient_exercise_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_patient_exercise_logs_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_referti: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          referto_data: Json
          session_id: string | null
          template_id: string | null
          therapist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          referto_data?: Json
          session_id?: string | null
          template_id?: string | null
          therapist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          referto_data?: Json
          session_id?: string | null
          template_id?: string | null
          therapist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_referti_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          birth_place: string | null
          city: string | null
          civic_number: string | null
          codice_destinatario: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          denominazione: string | null
          email: string | null
          first_name: string
          fonte_acquisizione: string | null
          id: string
          last_name: string
          nationality: string | null
          notes: string | null
          pec_destinatario: string | null
          phone: string | null
          piva: string | null
          postal_code: string | null
          province: string | null
          referring_patient_id: string | null
          tax_code: string | null
          temperatura: string
          therapist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_place?: string | null
          city?: string | null
          civic_number?: string | null
          codice_destinatario?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          denominazione?: string | null
          email?: string | null
          first_name: string
          fonte_acquisizione?: string | null
          id?: string
          last_name: string
          nationality?: string | null
          notes?: string | null
          pec_destinatario?: string | null
          phone?: string | null
          piva?: string | null
          postal_code?: string | null
          province?: string | null
          referring_patient_id?: string | null
          tax_code?: string | null
          temperatura?: string
          therapist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          birth_place?: string | null
          city?: string | null
          civic_number?: string | null
          codice_destinatario?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          denominazione?: string | null
          email?: string | null
          first_name?: string
          fonte_acquisizione?: string | null
          id?: string
          last_name?: string
          nationality?: string | null
          notes?: string | null
          pec_destinatario?: string | null
          phone?: string | null
          piva?: string | null
          postal_code?: string | null
          province?: string | null
          referring_patient_id?: string | null
          tax_code?: string | null
          temperatura?: string
          therapist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_referring_patient_id_fkey"
            columns: ["referring_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_scenarios: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          period: string | null
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          period?: string | null
          results: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          period?: string | null
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          organization_name: string | null
          parent_account_id: string | null
          phone: string | null
          privacy_consent: boolean | null
          terms_consent: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          organization_name?: string | null
          parent_account_id?: string | null
          phone?: string | null
          privacy_consent?: boolean | null
          terms_consent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_name?: string | null
          parent_account_id?: string | null
          phone?: string | null
          privacy_consent?: boolean | null
          terms_consent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_scenarios: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          period: string | null
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          period?: string | null
          results: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          period?: string | null
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          blotato_post_id: string | null
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          platforms: string[]
          published_at: string | null
          scheduled_for: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blotato_post_id?: string | null
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          platforms: string[]
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blotato_post_id?: string | null
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          platforms?: string[]
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referto_template_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          sequence_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          sequence_order?: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          sequence_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referto_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "referto_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      referto_templates: {
        Row: {
          created_at: string | null
          id: string
          name: string
          therapist_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          therapist_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          therapist_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referto_templates_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_scenarios: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          results: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_scenarios: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          period: string | null
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          period?: string | null
          results: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          period?: string | null
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string
          room_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          room_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          room_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_access_logs: {
        Row: {
          accessed_at: string | null
          auth_role: string | null
          auth_uid: string | null
          blocked: boolean | null
          db_user: string | null
          id: string
          operation: string | null
          table_name: string | null
        }
        Insert: {
          accessed_at?: string | null
          auth_role?: string | null
          auth_uid?: string | null
          blocked?: boolean | null
          db_user?: string | null
          id?: string
          operation?: string | null
          table_name?: string | null
        }
        Update: {
          accessed_at?: string | null
          auth_role?: string | null
          auth_uid?: string | null
          blocked?: boolean | null
          db_user?: string | null
          id?: string
          operation?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          appointment_id: string | null
          base_price: number
          created_at: string | null
          duration_minutes: number
          equipment_id: string | null
          final_price: number
          id: string
          is_first_session: boolean | null
          notes: string | null
          patient_id: string
          room_id: string | null
          session_date: string
          therapist_id: string | null
          treatment_id: string | null
          treatment_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          base_price: number
          created_at?: string | null
          duration_minutes: number
          equipment_id?: string | null
          final_price: number
          id?: string
          is_first_session?: boolean | null
          notes?: string | null
          patient_id: string
          room_id?: string | null
          session_date: string
          therapist_id?: string | null
          treatment_id?: string | null
          treatment_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          base_price?: number
          created_at?: string | null
          duration_minutes?: number
          equipment_id?: string | null
          final_price?: number
          id?: string
          is_first_session?: boolean | null
          notes?: string | null
          patient_id?: string
          room_id?: string | null
          session_date?: string
          therapist_id?: string | null
          treatment_id?: string | null
          treatment_type?: string | null
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "sessions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
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
          {
            foreignKeyName: "sessions_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_accounts: {
        Row: {
          created_at: string | null
          id: string
          mother_account_id: string
          profile_id: string
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mother_account_id: string
          profile_id: string
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mother_account_id?: string
          profile_id?: string
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_accounts_mother_account_id_fkey"
            columns: ["mother_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_accounts_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: true
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          therapist_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          therapist_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          therapist_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_availability_therapist_id_fkey"
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
          id: string
          name: string
          specialization: string | null
          status: string
          surname: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          specialization?: string | null
          status?: string
          surname?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          specialization?: string | null
          status?: string
          surname?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      treatment_path_items: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          path_id: string
          sequence_order: number
          sessions_count: number
          treatment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          path_id: string
          sequence_order: number
          sessions_count?: number
          treatment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          path_id?: string
          sequence_order?: number
          sessions_count?: number
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_path_items_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "treatment_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_path_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_paths: {
        Row: {
          created_at: string
          description: string | null
          duration_unit: string | null
          duration_value: number | null
          final_price: number | null
          id: string
          is_active: boolean
          name: string
          price_type: string
          session_price: number | null
          target_outcomes: string | null
          therapist_id: string | null
          total_price: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_type?: string
          session_price?: number | null
          target_outcomes?: string | null
          therapist_id?: string | null
          total_price?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_type?: string
          session_price?: number | null
          target_outcomes?: string | null
          therapist_id?: string | null
          total_price?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_paths_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          therapist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          therapist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          therapist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          cac_value: number | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cac_value?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cac_value?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_appointment_tag: {
        Args: { p_color: string; p_name: string }
        Returns: string
      }
      delete_user_content: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: undefined
      }
      ensure_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_effective_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_contents: {
        Args: { p_user_id: string }
        Returns: {
          audience: string
          content_text: string
          created_at: string
          engagement_stats: Json
          id: string
          images: Json
          is_published: boolean
          length: string
          platform: string
          post_type: string
          published_at: string
          title: string
          tone: string
          topic: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_instagram_connections: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          instagram_user_id: string
          is_active: boolean
          profile_data: Json
          updated_at: string
          username: string
        }[]
      }
      insert_generated_content: {
        Args: {
          p_audience?: string
          p_content_text: string
          p_images?: string
          p_length?: string
          p_platform?: string
          p_post_type?: string
          p_title: string
          p_tone?: string
          p_topic: string
          p_user_id: string
        }
        Returns: {
          audience: string
          content_text: string
          created_at: string
          id: string
          images: Json
          is_published: boolean
          length: string
          platform: string
          post_type: string
          title: string
          tone: string
          topic: string
          updated_at: string
          user_id: string
        }[]
      }
      log_rls_violation: {
        Args: { operation: string; table_name: string; user_id?: string }
        Returns: undefined
      }
      mark_content_published: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: undefined
      }
      upsert_instagram_connection: {
        Args: {
          p_access_token: string
          p_instagram_user_id: string
          p_profile_data?: Json
          p_refresh_token?: string
          p_token_expires_at?: string
          p_user_id: string
          p_username: string
        }
        Returns: string
      }
      validate_healthcare_access: {
        Args: { patient_id: string; requesting_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
