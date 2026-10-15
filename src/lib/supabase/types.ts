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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_snapshots: {
        Row: {
          active_balance: number | null
          balance: number | null
          equity: number | null
          free_margin: number | null
          id: number
          leverage: number | null
          margin: number | null
          margin_level: number | null
          snapshotted_at: string
          trade_allowed: boolean | null
          tradesync_account_id: string
          user_id: string
        }
        Insert: {
          active_balance?: number | null
          balance?: number | null
          equity?: number | null
          free_margin?: number | null
          id?: number
          leverage?: number | null
          margin?: number | null
          margin_level?: number | null
          snapshotted_at?: string
          trade_allowed?: boolean | null
          tradesync_account_id: string
          user_id: string
        }
        Update: {
          active_balance?: number | null
          balance?: number | null
          equity?: number | null
          free_margin?: number | null
          id?: number
          leverage?: number | null
          margin?: number | null
          margin_level?: number | null
          snapshotted_at?: string
          trade_allowed?: boolean | null
          tradesync_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_snapshots_tradesync_account_id_fkey"
            columns: ["tradesync_account_id"]
            isOneToOne: false
            referencedRelation: "tradesync_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          payload: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          ip_address: unknown
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          season: string | null
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          season?: string | null
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          season?: string | null
          slug?: string
        }
        Relationships: []
      }
      broker_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          broker_id: number | null
          id: string
          investor_password_encrypted: string
          mt_login: string
          mt_platform: string
          mt_server: string
          pu_account_number: string
          pu_currency: string | null
          pu_email: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          submitted_at: string
          user_id: string
          verification_message: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          broker_id?: number | null
          id?: string
          investor_password_encrypted: string
          mt_login: string
          mt_platform: string
          mt_server: string
          pu_account_number: string
          pu_currency?: string | null
          pu_email?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          submitted_at?: string
          user_id: string
          verification_message?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          broker_id?: number | null
          id?: string
          investor_password_encrypted?: string
          mt_login?: string
          mt_platform?: string
          mt_server?: string
          pu_account_number?: string
          pu_currency?: string | null
          pu_email?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          submitted_at?: string
          user_id?: string
          verification_message?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          created_at: string
          csv_format: string
          display_name: string
          ib_referral_link: string | null
          id: number
          is_active: boolean
          is_default: boolean
          name: string
          region_hint: string | null
          signup_help: string | null
          slug: string
          tradesync_broker_id: number | null
          updated_at: string
          verification_mode: string
        }
        Insert: {
          created_at?: string
          csv_format?: string
          display_name: string
          ib_referral_link?: string | null
          id?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          region_hint?: string | null
          signup_help?: string | null
          slug: string
          tradesync_broker_id?: number | null
          updated_at?: string
          verification_mode?: string
        }
        Update: {
          created_at?: string
          csv_format?: string
          display_name?: string
          ib_referral_link?: string | null
          id?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          region_hint?: string | null
          signup_help?: string | null
          slug?: string
          tradesync_broker_id?: number | null
          updated_at?: string
          verification_mode?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["post_status"]
          tags: string[] | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          tags?: string[] | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          tags?: string[] | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_entries: {
        Row: {
          competition_id: string
          joined_at: string
          points: number
          rank: number | null
          user_id: string
        }
        Insert: {
          competition_id: string
          joined_at?: string
          points?: number
          rank?: number | null
          user_id: string
        }
        Update: {
          competition_id?: string
          joined_at?: string
          points?: number
          rank?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          rules: Json | null
          slug: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          rules?: Json | null
          slug: string
          starts_at: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          rules?: Json | null
          slug?: string
          starts_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          module_order: number
          pdf_filename: string | null
          pdf_pages: number | null
          pdf_text: string | null
          pdf_url: string | null
          pdf_word_count: number | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          module_order: number
          pdf_filename?: string | null
          pdf_pages?: number | null
          pdf_text?: string | null
          pdf_url?: string | null
          pdf_word_count?: number | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          module_order?: number
          pdf_filename?: string | null
          pdf_pages?: number | null
          pdf_text?: string | null
          pdf_url?: string | null
          pdf_word_count?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          lesson_id: string
          progress_pct: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          lesson_id: string
          progress_pct?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          lesson_id?: string
          progress_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          is_published: boolean
          order_index: number
          slug: string
          thumbnail_url: string | null
          tier_min: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_published?: boolean
          order_index?: number
          slug: string
          thumbnail_url?: string | null
          tier_min?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_published?: boolean
          order_index?: number
          slug?: string
          thumbnail_url?: string | null
          tier_min?: number
          title?: string
        }
        Relationships: []
      }
      feedback_clarifications: {
        Row: {
          created_at: string
          feedback_round: string
          id: string
          item_key: string
          item_type: string
          our_question: string | null
          our_reading: string
          responded_at: string | null
          responded_by: string | null
          response_notes: string | null
          response_status: string | null
          section: string
          sort_order: number
          timecode: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_round: string
          id?: string
          item_key: string
          item_type: string
          our_question?: string | null
          our_reading: string
          responded_at?: string | null
          responded_by?: string | null
          response_notes?: string | null
          response_status?: string | null
          section: string
          sort_order?: number
          timecode?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_round?: string
          id?: string
          item_key?: string
          item_type?: string
          our_question?: string | null
          our_reading?: string
          responded_at?: string | null
          responded_by?: string | null
          response_notes?: string | null
          response_status?: string | null
          section?: string
          sort_order?: number
          timecode?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ib_allocations: {
        Row: {
          account: number | null
          amount: number | null
          content: string | null
          created_at_pu: string
          details: string | null
          id: number
          ingested_at: string
          kind: Database["public"]["Enums"]["allocation_kind"]
          pu_user_id: number
        }
        Insert: {
          account?: number | null
          amount?: number | null
          content?: string | null
          created_at_pu: string
          details?: string | null
          id?: number
          ingested_at?: string
          kind: Database["public"]["Enums"]["allocation_kind"]
          pu_user_id: number
        }
        Update: {
          account?: number | null
          amount?: number | null
          content?: string | null
          created_at_pu?: string
          details?: string | null
          id?: number
          ingested_at?: string
          kind?: Database["public"]["Enums"]["allocation_kind"]
          pu_user_id?: number
        }
        Relationships: []
      }
      ib_pulled_accounts: {
        Row: {
          account: number
          account_type: string | null
          approved_at: string
          broker_id: number | null
          currency: string | null
          first_seen_at: string
          id: number
          last_polled_at: string
          platform: string | null
          pu_user_id: number
        }
        Insert: {
          account: number
          account_type?: string | null
          approved_at: string
          broker_id?: number | null
          currency?: string | null
          first_seen_at?: string
          id?: number
          last_polled_at?: string
          platform?: string | null
          pu_user_id: number
        }
        Update: {
          account?: number
          account_type?: string | null
          approved_at?: string
          broker_id?: number | null
          currency?: string | null
          first_seen_at?: string
          id?: number
          last_polled_at?: string
          platform?: string | null
          pu_user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ib_pulled_accounts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_ai_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          model: string | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          model?: string | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          model?: string | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_ai_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          is_draft: boolean
          mood: string | null
          notes: string | null
          screenshots: Json | null
          tags: string[] | null
          trade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_draft?: boolean
          mood?: string | null
          notes?: string | null
          screenshots?: Json | null
          tags?: string[] | null
          trade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_draft?: boolean
          mood?: string | null
          notes?: string | null
          screenshots?: Json | null
          tags?: string[] | null
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          body_md: string
          category: string | null
          id: string
          is_published: boolean
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          body_md: string
          category?: string | null
          id?: string
          is_published?: boolean
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          body_md?: string
          category?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          bunny_video_id: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_sec: number | null
          id: string
          lesson_content: Json | null
          module_order: number
          module_title: string | null
          order_index: number
          slug: string
          title: string
        }
        Insert: {
          bunny_video_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          id?: string
          lesson_content?: Json | null
          module_order?: number
          module_title?: string | null
          order_index?: number
          slug: string
          title: string
        }
        Update: {
          bunny_video_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          id?: string
          lesson_content?: Json | null
          module_order?: number
          module_title?: string | null
          order_index?: number
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_events: {
        Row: {
          banner_image_url: string | null
          created_at: string
          delivery_mode: string
          description: string | null
          ends_at: string
          host_name: string | null
          host_user_id: string | null
          id: string
          is_published: boolean
          language: string | null
          recording_url: string | null
          recurrence: string
          series_id: string | null
          slug: string | null
          starts_at: string
          stream_meeting_id: string | null
          stream_recording_id: string | null
          stream_host_join_link: string | null
          stream_join_link: string | null
          tier_min: number
          title: string
          topic: string | null
          transcript_url: string | null
          zoom_join_url: string | null
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          delivery_mode?: string
          description?: string | null
          ends_at: string
          host_name?: string | null
          host_user_id?: string | null
          id?: string
          is_published?: boolean
          language?: string | null
          recording_url?: string | null
          recurrence?: string
          series_id?: string | null
          slug?: string | null
          starts_at: string
          stream_meeting_id?: string | null
          stream_recording_id?: string | null
          stream_host_join_link?: string | null
          stream_join_link?: string | null
          tier_min?: number
          title: string
          topic?: string | null
          transcript_url?: string | null
          zoom_join_url?: string | null
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          delivery_mode?: string
          description?: string | null
          ends_at?: string
          host_name?: string | null
          host_user_id?: string | null
          id?: string
          is_published?: boolean
          language?: string | null
          recording_url?: string | null
          recurrence?: string
          series_id?: string | null
          slug?: string | null
          starts_at?: string
          stream_meeting_id?: string | null
          stream_recording_id?: string | null
          stream_host_join_link?: string | null
          stream_join_link?: string | null
          tier_min?: number
          title?: string
          topic?: string | null
          transcript_url?: string | null
          zoom_join_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_events_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_events_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_rsvps: {
        Row: {
          attended: boolean | null
          event_id: string
          rsvp_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          event_id: string
          rsvp_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          event_id?: string
          rsvp_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "live_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_comments: {
        Row: {
          comment: string
          created_at: string | null
          dev_note: string | null
          id: string
          image_url: string | null
          priority: string | null
          section_id: string
          section_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          dev_note?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          section_id: string
          section_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          dev_note?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          section_id?: string
          section_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      master_chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
          role: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "master_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "master_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          category: string
          channel: string
          enabled: boolean
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          enabled?: boolean
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          enabled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          data: Json | null
          id: string
          link: string | null
          priority: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_comments: {
        Row: {
          author_name: string | null
          comment: string
          created_at: string | null
          dev_note: string | null
          id: string
          image_url: string | null
          priority: string | null
          section_id: string
          section_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          comment: string
          created_at?: string | null
          dev_note?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          section_id: string
          section_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          comment?: string
          created_at?: string | null
          dev_note?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          section_id?: string
          section_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prize_redemptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          fulfilment_note: string | null
          id: string
          prize_id: string
          rejected_reason: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: string
          tracking_number: string | null
          updated_at: string
          user_id: string
          xp_spent: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fulfilment_note?: string | null
          id?: string
          prize_id: string
          rejected_reason?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          xp_spent: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fulfilment_note?: string | null
          id?: string
          prize_id?: string
          rejected_reason?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "prize_redemptions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_redemptions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_redemptions_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          category: string
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          raffle_draws_at: string | null
          retail_value_usd: number | null
          ships_to: string[] | null
          slug: string
          stock: number | null
          updated_at: string
          xp_cost: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          raffle_draws_at?: string | null
          retail_value_usd?: number | null
          ships_to?: string[] | null
          slug: string
          stock?: number | null
          updated_at?: string
          xp_cost: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          raffle_draws_at?: string | null
          retail_value_usd?: number | null
          ships_to?: string[] | null
          slug?: string
          stock?: number | null
          updated_at?: string
          xp_cost?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notif_email: boolean
          admin_notif_telegram: boolean
          admin_on_duty: boolean
          admin_telegram_user_id: number | null
          avatar_url: string | null
          banner: string | null
          bio: string | null
          completed_onboarding: boolean
          country: string | null
          created_at: string
          display_name: string | null
          email: string
          first_name: string | null
          id: string
          is_public_profile: boolean
          language: string | null
          last_login_at: string | null
          last_name: string | null
          marketing_opt_in: boolean
          notif_email_milestones: boolean
          notif_email_signals: boolean
          notif_email_verification: boolean
          notif_email_weekly_recap: boolean
          notif_telegram_milestones: boolean
          notif_telegram_signals: boolean
          notif_telegram_verification: boolean
          onboarding_checklist_dismissed: boolean
          onboarding_tour_seen: boolean
          profile_field_visibility: Json
          profile_visibility: string
          pu_referral_link: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          telegram_user_id: number | null
          telegram_username: string | null
          tier: number
          timezone: string | null
          updated_at: string
          username: string | null
          xp_total: number
        }
        Insert: {
          admin_notif_email?: boolean
          admin_notif_telegram?: boolean
          admin_on_duty?: boolean
          admin_telegram_user_id?: number | null
          avatar_url?: string | null
          banner?: string | null
          bio?: string | null
          completed_onboarding?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          first_name?: string | null
          id: string
          is_public_profile?: boolean
          language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          marketing_opt_in?: boolean
          notif_email_milestones?: boolean
          notif_email_signals?: boolean
          notif_email_verification?: boolean
          notif_email_weekly_recap?: boolean
          notif_telegram_milestones?: boolean
          notif_telegram_signals?: boolean
          notif_telegram_verification?: boolean
          onboarding_checklist_dismissed?: boolean
          onboarding_tour_seen?: boolean
          profile_field_visibility?: Json
          profile_visibility?: string
          pu_referral_link?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          telegram_user_id?: number | null
          telegram_username?: string | null
          tier?: number
          timezone?: string | null
          updated_at?: string
          username?: string | null
          xp_total?: number
        }
        Update: {
          admin_notif_email?: boolean
          admin_notif_telegram?: boolean
          admin_on_duty?: boolean
          admin_telegram_user_id?: number | null
          avatar_url?: string | null
          banner?: string | null
          bio?: string | null
          completed_onboarding?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_public_profile?: boolean
          language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          marketing_opt_in?: boolean
          notif_email_milestones?: boolean
          notif_email_signals?: boolean
          notif_email_verification?: boolean
          notif_email_weekly_recap?: boolean
          notif_telegram_milestones?: boolean
          notif_telegram_signals?: boolean
          notif_telegram_verification?: boolean
          onboarding_checklist_dismissed?: boolean
          onboarding_tour_seen?: boolean
          profile_field_visibility?: Json
          profile_visibility?: string
          pu_referral_link?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          telegram_user_id?: number | null
          telegram_username?: string | null
          tier?: number
          timezone?: string | null
          updated_at?: string
          username?: string | null
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_runs: {
        Row: {
          abandoned_at: string | null
          build_version: string | null
          completed_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["qa_run_status"]
          steps_blocked: number
          steps_failed: number
          steps_passed: number
          steps_skipped: number
          steps_total: number
          summary: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          build_version?: string | null
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["qa_run_status"]
          steps_blocked?: number
          steps_failed?: number
          steps_passed?: number
          steps_skipped?: number
          steps_total?: number
          summary?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          build_version?: string | null
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["qa_run_status"]
          steps_blocked?: number
          steps_failed?: number
          steps_passed?: number
          steps_skipped?: number
          steps_total?: number
          summary?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_step_results: {
        Row: {
          id: string
          notes: string | null
          result: Database["public"]["Enums"]["qa_step_result"]
          run_id: string
          screenshot_url: string | null
          step_index: number
          step_key: string
          step_title: string
          tested_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["qa_step_result"]
          run_id: string
          screenshot_url?: string | null
          step_index: number
          step_key: string
          step_title: string
          tested_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["qa_step_result"]
          run_id?: string
          screenshot_url?: string | null
          step_index?: number
          step_key?: string
          step_title?: string
          tested_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_step_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "qa_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_step_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "v_qa_runs_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_step_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_step_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quizzes: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          lesson_id: string
          options: Json
          order_index: number
          question: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id: string
          options: Json
          order_index?: number
          question: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_translations: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          language: string
          options: Json
          question: string
          quiz_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          language: string
          options: Json
          question: string
          quiz_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          language?: string
          options?: Json
          question?: string
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_translations_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lesson_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string
          id: string
          lesson_id: string
          passed: boolean
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string
          id?: string
          lesson_id: string
          passed?: boolean
          score: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          correct_idx: number
          id: string
          lesson_id: string
          options: Json
          order_index: number
          question: string
        }
        Insert: {
          correct_idx: number
          id?: string
          lesson_id: string
          options: Json
          order_index?: number
          question: string
        }
        Update: {
          correct_idx?: number
          id?: string
          lesson_id?: string
          options?: Json
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          clawed_back: boolean
          clawed_back_at: string | null
          code: string
          id: string
          qualified: boolean
          qualified_at: string | null
          referee_id: string
          referrer_id: string
          signed_up_at: string
        }
        Insert: {
          clawed_back?: boolean
          clawed_back_at?: string | null
          code: string
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          referee_id: string
          referrer_id: string
          signed_up_at?: string
        }
        Update: {
          clawed_back?: boolean
          clawed_back_at?: string | null
          code?: string
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          referee_id?: string
          referrer_id?: string
          signed_up_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_streams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          telegram_topic_id: number | null
          tier_min: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          telegram_topic_id?: number | null
          tier_min?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          telegram_topic_id?: number | null
          tier_min?: number
        }
        Relationships: []
      }
      signal_updates: {
        Row: {
          admin_override: boolean
          ai_confidence: number | null
          created_at: string
          id: number
          message_id: number | null
          parsed: Json | null
          parsed_status: Database["public"]["Enums"]["signal_status"] | null
          raw_text: string | null
          signal_id: string
        }
        Insert: {
          admin_override?: boolean
          ai_confidence?: number | null
          created_at?: string
          id?: number
          message_id?: number | null
          parsed?: Json | null
          parsed_status?: Database["public"]["Enums"]["signal_status"] | null
          raw_text?: string | null
          signal_id: string
        }
        Update: {
          admin_override?: boolean
          ai_confidence?: number | null
          created_at?: string
          id?: number
          message_id?: number | null
          parsed?: Json | null
          parsed_status?: Database["public"]["Enums"]["signal_status"] | null
          raw_text?: string | null
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_updates_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          ai_confidence: number | null
          chart_image_url: string | null
          confluence: number | null
          direction: Database["public"]["Enums"]["signal_direction"] | null
          educational_note: string | null
          entry: number | null
          id: string
          instrument: string | null
          last_updated_at: string
          parsed: Json | null
          pips_at_close: number | null
          posted_at: string
          posted_by_user_id: string | null
          raw_text: string | null
          sl: number | null
          source: string | null
          status: Database["public"]["Enums"]["signal_status"]
          strategy: string | null
          stream_id: string
          telegram_message_id: number | null
          timeframe: string | null
          tp1: number | null
          tp2: number | null
          tp3: number | null
        }
        Insert: {
          ai_confidence?: number | null
          chart_image_url?: string | null
          confluence?: number | null
          direction?: Database["public"]["Enums"]["signal_direction"] | null
          educational_note?: string | null
          entry?: number | null
          id?: string
          instrument?: string | null
          last_updated_at?: string
          parsed?: Json | null
          pips_at_close?: number | null
          posted_at?: string
          posted_by_user_id?: string | null
          raw_text?: string | null
          sl?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          strategy?: string | null
          stream_id: string
          telegram_message_id?: number | null
          timeframe?: string | null
          tp1?: number | null
          tp2?: number | null
          tp3?: number | null
        }
        Update: {
          ai_confidence?: number | null
          chart_image_url?: string | null
          confluence?: number | null
          direction?: Database["public"]["Enums"]["signal_direction"] | null
          educational_note?: string | null
          entry?: number | null
          id?: string
          instrument?: string | null
          last_updated_at?: string
          parsed?: Json | null
          pips_at_close?: number | null
          posted_at?: string
          posted_by_user_id?: string | null
          raw_text?: string | null
          sl?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          strategy?: string | null
          stream_id?: string
          telegram_message_id?: number | null
          timeframe?: string | null
          tp1?: number | null
          tp2?: number | null
          tp3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_posted_by_user_id_fkey"
            columns: ["posted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_posted_by_user_id_fkey"
            columns: ["posted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "signal_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: number
          role: string
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: number
          role: string
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: number
          role?: string
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_confidence: number | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          id: string
          priority: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_messages: {
        Row: {
          caption: string | null
          chat_id: number
          created_at: string
          date_at: string
          from_user_id: number | null
          from_user_name: string | null
          from_user_username: string | null
          id: string
          is_edit: boolean | null
          is_forwarded: boolean | null
          media_kind: string | null
          message_thread_id: number | null
          photos: Json | null
          raw: Json | null
          reply_to_message_id: number | null
          stream_id: string | null
          telegram_message_id: number
          text: string | null
        }
        Insert: {
          caption?: string | null
          chat_id: number
          created_at?: string
          date_at: string
          from_user_id?: number | null
          from_user_name?: string | null
          from_user_username?: string | null
          id?: string
          is_edit?: boolean | null
          is_forwarded?: boolean | null
          media_kind?: string | null
          message_thread_id?: number | null
          photos?: Json | null
          raw?: Json | null
          reply_to_message_id?: number | null
          stream_id?: string | null
          telegram_message_id: number
          text?: string | null
        }
        Update: {
          caption?: string | null
          chat_id?: number
          created_at?: string
          date_at?: string
          from_user_id?: number | null
          from_user_name?: string | null
          from_user_username?: string | null
          id?: string
          is_edit?: boolean | null
          is_forwarded?: boolean | null
          media_kind?: string | null
          message_thread_id?: number | null
          photos?: Json | null
          raw?: Json | null
          reply_to_message_id?: number | null
          stream_id?: string | null
          telegram_message_id?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "signal_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_tasks: {
        Row: {
          action: Database["public"]["Enums"]["telegram_action"]
          attempted_at: string | null
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          group_chat_id: number | null
          id: string
          invite_link: string | null
          status: string
          topic_id: number | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["telegram_action"]
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          group_chat_id?: number | null
          id?: string
          invite_link?: string | null
          status?: string
          topic_id?: number | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["telegram_action"]
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          group_chat_id?: number | null
          id?: string
          invite_link?: string | null
          status?: string
          topic_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_thresholds: {
        Row: {
          alt_balance_usd: number | null
          description: string | null
          min_balance_usd: number
          min_referrals: number
          name: string
          tier: number
          updated_at: string
        }
        Insert: {
          alt_balance_usd?: number | null
          description?: string | null
          min_balance_usd: number
          min_referrals?: number
          name: string
          tier: number
          updated_at?: string
        }
        Update: {
          alt_balance_usd?: number | null
          description?: string | null
          min_balance_usd?: number
          min_referrals?: number
          name?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      tier_thresholds_country: {
        Row: {
          alt_balance_usd: number | null
          country: string
          min_balance_usd: number | null
          min_referrals: number | null
          tier: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt_balance_usd?: number | null
          country: string
          min_balance_usd?: number | null
          min_referrals?: number | null
          tier: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt_balance_usd?: number | null
          country?: string
          min_balance_usd?: number | null
          min_referrals?: number | null
          tier?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_thresholds_country_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_thresholds_country_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          close_price: number | null
          closed_at: string | null
          commission: number | null
          created_at: string
          id: string
          open_price: number | null
          opened_at: string
          profit: number | null
          side: Database["public"]["Enums"]["signal_direction"]
          signal_id: string | null
          sl_price: number | null
          swap: number | null
          symbol: string
          tp_price: number | null
          tradesync_account_id: string
          tradesync_trade_id: number
          user_id: string
          volume: number
        }
        Insert: {
          close_price?: number | null
          closed_at?: string | null
          commission?: number | null
          created_at?: string
          id?: string
          open_price?: number | null
          opened_at: string
          profit?: number | null
          side: Database["public"]["Enums"]["signal_direction"]
          signal_id?: string | null
          sl_price?: number | null
          swap?: number | null
          symbol: string
          tp_price?: number | null
          tradesync_account_id: string
          tradesync_trade_id: number
          user_id: string
          volume: number
        }
        Update: {
          close_price?: number | null
          closed_at?: string | null
          commission?: number | null
          created_at?: string
          id?: string
          open_price?: number | null
          opened_at?: string
          profit?: number | null
          side?: Database["public"]["Enums"]["signal_direction"]
          signal_id?: string | null
          sl_price?: number | null
          swap?: number | null
          symbol?: string
          tp_price?: number | null
          tradesync_account_id?: string
          tradesync_trade_id?: number
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_signal_id_fk"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_tradesync_account_id_fkey"
            columns: ["tradesync_account_id"]
            isOneToOne: false
            referencedRelation: "tradesync_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tradesync_accounts: {
        Row: {
          broker_id: number | null
          broker_submission_id: string | null
          created_at: string
          currency: string | null
          id: string
          last_sync_at: string | null
          login: number
          mtapi_session_token: string | null
          platform: string
          server: string | null
          status: string
          tradesync_account_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_id?: number | null
          broker_submission_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_sync_at?: string | null
          login: number
          mtapi_session_token?: string | null
          platform: string
          server?: string | null
          status?: string
          tradesync_account_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_id?: number | null
          broker_submission_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_sync_at?: string | null
          login?: number
          mtapi_session_token?: string | null
          platform?: string
          server?: string | null
          status?: string
          tradesync_account_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tradesync_accounts_broker_submission_id_fkey"
            columns: ["broker_submission_id"]
            isOneToOne: false
            referencedRelation: "broker_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesync_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesync_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          id: number
          key: string
          language: string
          namespace: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: number
          key: string
          language: string
          namespace: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: number
          key?: string
          language?: string
          namespace?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiet_hours: {
        Row: {
          enabled: boolean
          end_local: string
          start_local: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          end_local?: string
          start_local?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          end_local?: string
          start_local?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiet_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiet_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          created_at: string
          details: Json | null
          id: number
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: number
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: number
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          badge_count: number | null
          banner: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          profile_field_visibility: Json | null
          qualified_referrals: number | null
          referral_code: string | null
          tier: number | null
          username: string | null
          xp_total: number | null
        }
        Insert: {
          avatar_url?: string | null
          badge_count?: never
          banner?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          profile_field_visibility?: Json | null
          qualified_referrals?: never
          referral_code?: string | null
          tier?: number | null
          username?: string | null
          xp_total?: number | null
        }
        Update: {
          avatar_url?: string | null
          badge_count?: never
          banner?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          profile_field_visibility?: Json | null
          qualified_referrals?: never
          referral_code?: string | null
          tier?: number | null
          username?: string | null
          xp_total?: number | null
        }
        Relationships: []
      }
      v_qa_runs_summary: {
        Row: {
          build_version: string | null
          completed_at: string | null
          display_name: string | null
          duration_seconds: number | null
          email: string | null
          id: string | null
          pct_passed: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["qa_run_status"] | null
          steps_blocked: number | null
          steps_failed: number | null
          steps_passed: number | null
          steps_skipped: number | null
          steps_total: number | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrypt_investor_password: {
        Args: { ciphertext_b64: string }
        Returns: string
      }
      encrypt_investor_password: {
        Args: { plaintext: string }
        Returns: string
      }
      has_role: { Args: { _role: string }; Returns: boolean }
      is_compliance: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      search_module_pdfs: {
        Args: { max_chars?: number; max_modules?: number; q: string }
        Returns: {
          excerpt: string
          module_order: number
          module_title: string
          rank: number
        }[]
      }
      tier_thresholds_for_country: {
        Args: { p_country: string }
        Returns: {
          alt_balance_usd: number
          min_balance_usd: number
          min_referrals: number
          name: string
          tier: number
        }[]
      }
    }
    Enums: {
      allocation_kind: "in" | "out"
      post_status: "pending" | "approved" | "rejected"
      qa_run_status: "in_progress" | "completed" | "abandoned"
      qa_step_result: "pending" | "pass" | "fail" | "blocked" | "skip"
      signal_direction: "buy" | "sell"
      signal_status:
        | "open"
        | "tp1_hit"
        | "tp2_hit"
        | "tp3_hit"
        | "sl_hit"
        | "closed"
        | "cancelled"
      telegram_action: "add" | "remove"
      ticket_status:
        | "open"
        | "ai_handling"
        | "awaiting_user"
        | "resolved"
        | "closed"
      user_status:
        | "preview"
        | "pending"
        | "active"
        | "inactive"
        | "grace"
        | "manual_review"
        | "banned"
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
      allocation_kind: ["in", "out"],
      post_status: ["pending", "approved", "rejected"],
      qa_run_status: ["in_progress", "completed", "abandoned"],
      qa_step_result: ["pending", "pass", "fail", "blocked", "skip"],
      signal_direction: ["buy", "sell"],
      signal_status: [
        "open",
        "tp1_hit",
        "tp2_hit",
        "tp3_hit",
        "sl_hit",
        "closed",
        "cancelled",
      ],
      telegram_action: ["add", "remove"],
      ticket_status: [
        "open",
        "ai_handling",
        "awaiting_user",
        "resolved",
        "closed",
      ],
      user_status: [
        "preview",
        "pending",
        "active",
        "inactive",
        "grace",
        "manual_review",
        "banned",
      ],
    },
  },
} as const
