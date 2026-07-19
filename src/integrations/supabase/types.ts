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
      estimates: {
        Row: {
          created_at: string
          curb_linear_ft: number
          id: string
          lot_sqft: number
          notes: string | null
          per_visit: number
          plow_per_sqft: number
          property_address: string
          salt_bags_season: number
          salt_per_bag: number
          subtotal: number
          updated_at: string
          user_id: string
          visits_per_season: number
          walkways_count: number
        }
        Insert: {
          created_at?: string
          curb_linear_ft?: number
          id?: string
          lot_sqft?: number
          notes?: string | null
          per_visit: number
          plow_per_sqft: number
          property_address: string
          salt_bags_season?: number
          salt_per_bag: number
          subtotal?: number
          updated_at?: string
          user_id: string
          visits_per_season?: number
          walkways_count?: number
        }
        Update: {
          created_at?: string
          curb_linear_ft?: number
          id?: string
          lot_sqft?: number
          notes?: string | null
          per_visit?: number
          plow_per_sqft?: number
          property_address?: string
          salt_bags_season?: number
          salt_per_bag?: number
          subtotal?: number
          updated_at?: string
          user_id?: string
          visits_per_season?: number
          walkways_count?: number
        }
        Relationships: []
      }
      gsc_coverage_snapshots: {
        Row: {
          captured_at: string
          created_at: string
          errors: Json
          id: string
          raw: Json | null
          site_url: string
          sitemaps_submitted: number
          urls_crawled_not_indexed: number
          urls_discovered_not_indexed: number
          urls_excluded: number
          urls_indexed: number
          urls_submitted: number
        }
        Insert: {
          captured_at?: string
          created_at?: string
          errors?: Json
          id?: string
          raw?: Json | null
          site_url: string
          sitemaps_submitted?: number
          urls_crawled_not_indexed?: number
          urls_discovered_not_indexed?: number
          urls_excluded?: number
          urls_indexed?: number
          urls_submitted?: number
        }
        Update: {
          captured_at?: string
          created_at?: string
          errors?: Json
          id?: string
          raw?: Json | null
          site_url?: string
          sitemaps_submitted?: number
          urls_crawled_not_indexed?: number
          urls_discovered_not_indexed?: number
          urls_excluded?: number
          urls_indexed?: number
          urls_submitted?: number
        }
        Relationships: []
      }
      guest_post_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      link_audit_runs: {
        Row: {
          cities_total: number
          cities_without_posts_count: number
          created_at: string
          email_status: string | null
          id: string
          orphan_posts_count: number
          posts_total: number
          ran_at: string
          report: Json
        }
        Insert: {
          cities_total: number
          cities_without_posts_count: number
          created_at?: string
          email_status?: string | null
          id?: string
          orphan_posts_count: number
          posts_total: number
          ran_at?: string
          report: Json
        }
        Update: {
          cities_total?: number
          cities_without_posts_count?: number
          created_at?: string
          email_status?: string | null
          id?: string
          orphan_posts_count?: number
          posts_total?: number
          ran_at?: string
          report?: Json
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          address: string
          contact_method: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          postal_code: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_method: string
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          postal_code: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_method?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          postal_code?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_cards: {
        Row: {
          created_at: string
          currency: string
          id: string
          per_visit: number
          plow_per_sqft: number
          salt_per_bag: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          per_visit?: number
          plow_per_sqft?: number
          salt_per_bag?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          per_visit?: number
          plow_per_sqft?: number
          salt_per_bag?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_quote_request_event_metrics: {
        Args: { _since: string }
        Returns: {
          bucket: string
          count: number
          kind: string
        }[]
      }
      get_quote_request_offenders: {
        Args: { _limit?: number; _since: string }
        Returns: {
          blocked_count: number
          email: string
          ip: string
          last_seen: string
        }[]
      }
      list_quote_request_events: {
        Args: { _limit?: number; _since: string }
        Returns: {
          created_at: string
          email: string
          id: string
          ip: string
          kind: string
          meta: Json
          user_agent: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
