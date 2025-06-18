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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      business_clients: {
        Row: {
          address: string
          city: string
          company_name: string
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          pec_email: string | null
          phone: string | null
          postal_code: string
          province: string
          sdi_code: string | null
          tax_code: string
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address: string
          city: string
          company_name: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          pec_email?: string | null
          phone?: string | null
          postal_code: string
          province: string
          sdi_code?: string | null
          tax_code: string
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string
          city?: string
          company_name?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          pec_email?: string | null
          phone?: string | null
          postal_code?: string
          province?: string
          sdi_code?: string | null
          tax_code?: string
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
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
      company_settings: {
        Row: {
          address: string
          city: string
          company_name: string
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          invoice_counter: number | null
          pec_email: string | null
          phone: string | null
          postal_code: string
          province: string
          sdi_code: string | null
          tax_code: string
          updated_at: string | null
          user_id: string
          vat_number: string
        }
        Insert: {
          address: string
          city: string
          company_name: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          invoice_counter?: number | null
          pec_email?: string | null
          phone?: string | null
          postal_code: string
          province: string
          sdi_code?: string | null
          tax_code: string
          updated_at?: string | null
          user_id: string
          vat_number: string
        }
        Update: {
          address?: string
          city?: string
          company_name?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          invoice_counter?: number | null
          pec_email?: string | null
          phone?: string | null
          postal_code?: string
          province?: string
          sdi_code?: string | null
          tax_code?: string
          updated_at?: string | null
          user_id?: string
          vat_number?: string
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
          duration_minutes: number | null
          id: string
          instructions: string | null
          name: string
          repetitions: number | null
          sets: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_part?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          name: string
          repetitions?: number | null
          sets?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_part?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          name?: string
          repetitions?: number | null
          sets?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      instagram_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          instagram_user_id: string
          is_active: boolean | null
          profile_data: Json | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          instagram_user_id: string
          is_active?: boolean | null
          profile_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          instagram_user_id?: string
          is_active?: boolean | null
          profile_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tax_amount: number
          tax_rate?: number
          total_amount: number
          unit_price: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_default: boolean | null
          name: string
          tax_rate: number
          unit_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_default?: boolean | null
          name: string
          tax_rate?: number
          unit_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_default?: boolean | null
          name?: string
          tax_rate?: number
          unit_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          business_client_id: string | null
          client_type: string
          created_at: string | null
          due_date: string | null
          health_card_data: Json | null
          id: string
          invoice_date: string
          invoice_number: string
          is_health_service: boolean | null
          notes: string | null
          patient_id: string | null
          payment_method: string | null
          payment_terms: string | null
          sdi_identifier: string | null
          sent_to_sdi_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          ts_sent_at: string | null
          ts_status: string | null
          ts_transmission_id: string | null
          updated_at: string | null
          user_id: string
          xml_file_path: string | null
        }
        Insert: {
          business_client_id?: string | null
          client_type: string
          created_at?: string | null
          due_date?: string | null
          health_card_data?: Json | null
          id?: string
          invoice_date: string
          invoice_number: string
          is_health_service?: boolean | null
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          sdi_identifier?: string | null
          sent_to_sdi_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          ts_sent_at?: string | null
          ts_status?: string | null
          ts_transmission_id?: string | null
          updated_at?: string | null
          user_id: string
          xml_file_path?: string | null
        }
        Update: {
          business_client_id?: string | null
          client_type?: string
          created_at?: string | null
          due_date?: string | null
          health_card_data?: Json | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_health_service?: boolean | null
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          sdi_identifier?: string | null
          sent_to_sdi_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          ts_sent_at?: string | null
          ts_status?: string | null
          ts_transmission_id?: string | null
          updated_at?: string | null
          user_id?: string
          xml_file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_client_id_fkey"
            columns: ["business_client_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      patient_exercise_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          exercise_id: string
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
          assigned_by: string
          created_at?: string
          exercise_id: string
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
          assigned_by?: string
          created_at?: string
          exercise_id?: string
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
          birth_place: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          exemption_code: string | null
          first_name: string
          first_visit_date: string | null
          gender: string | null
          health_card_expiry: string | null
          health_card_number: string | null
          id: string
          last_name: string
          medical_condition: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acquisition_source?: string | null
          address?: string | null
          birth_place?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          exemption_code?: string | null
          first_name: string
          first_visit_date?: string | null
          gender?: string | null
          health_card_expiry?: string | null
          health_card_number?: string | null
          id?: string
          last_name: string
          medical_condition?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acquisition_source?: string | null
          address?: string | null
          birth_place?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          exemption_code?: string | null
          first_name?: string
          first_visit_date?: string | null
          gender?: string | null
          health_card_expiry?: string | null
          health_card_number?: string | null
          id?: string
          last_name?: string
          medical_condition?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          gohighlevel_api_key: string | null
          id: string
          last_name: string | null
          organization_name: string | null
          phone: string | null
          privacy_consent: boolean | null
          terms_consent: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gohighlevel_api_key?: string | null
          id: string
          last_name?: string | null
          organization_name?: string | null
          phone?: string | null
          privacy_consent?: boolean | null
          terms_consent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gohighlevel_api_key?: string | null
          id?: string
          last_name?: string | null
          organization_name?: string | null
          phone?: string | null
          privacy_consent?: boolean | null
          terms_consent?: boolean | null
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
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_cost?: number | null
          id?: string
          name: string
          room_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_cost?: number | null
          id?: string
          name?: string
          room_type?: string | null
          updated_at?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      tessera_sanitaria_transmissions: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          response_data: Json | null
          sent_at: string | null
          status: string
          transmission_id: string
          updated_at: string
          user_id: string
          xml_content: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          response_data?: Json | null
          sent_at?: string | null
          status?: string
          transmission_id: string
          updated_at?: string
          user_id: string
          xml_content?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          response_data?: Json | null
          sent_at?: string | null
          status?: string
          transmission_id?: string
          updated_at?: string
          user_id?: string
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tessera_sanitaria_transmissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_content: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: undefined
      }
      get_next_invoice_number: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_contents: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          title: string
          content_text: string
          topic: string
          audience: string
          platform: string
          post_type: string
          tone: string
          length: string
          images: Json
          engagement_stats: Json
          is_published: boolean
          published_at: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_instagram_connections: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          instagram_user_id: string
          username: string
          profile_data: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      insert_generated_content: {
        Args: {
          p_user_id: string
          p_title: string
          p_content_text: string
          p_topic: string
          p_audience?: string
          p_platform?: string
          p_post_type?: string
          p_tone?: string
          p_length?: string
          p_images?: string
        }
        Returns: {
          id: string
          user_id: string
          title: string
          content_text: string
          topic: string
          audience: string
          platform: string
          post_type: string
          tone: string
          length: string
          images: Json
          is_published: boolean
          created_at: string
          updated_at: string
        }[]
      }
      mark_content_published: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: undefined
      }
      upsert_instagram_connection: {
        Args: {
          p_user_id: string
          p_instagram_user_id: string
          p_username: string
          p_access_token: string
          p_refresh_token?: string
          p_token_expires_at?: string
          p_profile_data?: Json
        }
        Returns: string
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
