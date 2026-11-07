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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      context_snapshots: {
        Row: {
          created_at: string
          distance_m: number
          id: string
          mood: string
          request_text: string
          time_of_day: string
          user_id: string
          weather: string
        }
        Insert: {
          created_at?: string
          distance_m?: number
          id?: string
          mood: string
          request_text?: string
          time_of_day?: string
          user_id: string
          weather?: string
        }
        Update: {
          created_at?: string
          distance_m?: number
          id?: string
          mood?: string
          request_text?: string
          time_of_day?: string
          user_id?: string
          weather?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          item_id: string
          type: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          type: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "context_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          allergen_group: string | null
          id: string
          name: string
        }
        Insert: {
          allergen_group?: string | null
          id?: string
          name: string
        }
        Update: {
          allergen_group?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      learned_preferences: {
        Row: {
          id: string
          kind: string
          user_id: string
          user_override: boolean
          value: string
          weight: number
        }
        Insert: {
          id?: string
          kind: string
          user_id: string
          user_override?: boolean
          value: string
          weight?: number
        }
        Update: {
          id?: string
          kind?: string
          user_id?: string
          user_override?: boolean
          value?: string
          weight?: number
        }
        Relationships: []
      }
      menu_item_ingredients: {
        Row: {
          ingredient_id: string
          is_key: boolean
          item_id: string
        }
        Insert: {
          ingredient_id: string
          is_key?: boolean
          item_id: string
        }
        Update: {
          ingredient_id?: string
          is_key?: boolean
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          added_by: string | null
          allergen_confidence: string
          audio_summary_text: string
          confirmed_at: string | null
          confirmed_by: string | null
          diet_tags: string[]
          id: string
          light: boolean
          name: string
          price: number
          restaurant_id: string
          review_status: string
          source: string
          summary_text: string
          warm: boolean
        }
        Insert: {
          added_by?: string | null
          allergen_confidence?: string
          audio_summary_text?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          diet_tags?: string[]
          id?: string
          light?: boolean
          name: string
          price: number
          restaurant_id: string
          review_status?: string
          source?: string
          summary_text?: string
          warm?: boolean
        }
        Update: {
          added_by?: string | null
          allergen_confidence?: string
          audio_summary_text?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          diet_tags?: string[]
          id?: string
          light?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          review_status?: string
          source?: string
          summary_text?: string
          warm?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string[]
          budget_max: number
          consent: boolean
          consent_at: string | null
          diet_tags: string[]
          high_contrast: boolean
          max_distance_m: number
          setup_complete: boolean
          summary_outputs: string[]
          text_size: string
          updated_at: string
          user_id: string
          voice_first: boolean
        }
        Insert: {
          allergies?: string[]
          budget_max?: number
          consent?: boolean
          consent_at?: string | null
          diet_tags?: string[]
          high_contrast?: boolean
          max_distance_m?: number
          setup_complete?: boolean
          summary_outputs?: string[]
          text_size?: string
          updated_at?: string
          user_id: string
          voice_first?: boolean
        }
        Update: {
          allergies?: string[]
          budget_max?: number
          consent?: boolean
          consent_at?: string | null
          diet_tags?: string[]
          high_contrast?: boolean
          max_distance_m?: number
          setup_complete?: boolean
          summary_outputs?: string[]
          text_size?: string
          updated_at?: string
          user_id?: string
          voice_first?: boolean
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          cuisine: string
          google_place_id: string | null
          id: string
          lat: number
          lng: number
          menu_dated: string | null
          menu_source_url: string | null
          menu_updated_at: string
          name: string
          opening_hours: string
          price_band: number
          source: string
          website: string | null
        }
        Insert: {
          cuisine?: string
          google_place_id?: string | null
          id?: string
          lat: number
          lng: number
          menu_dated?: string | null
          menu_source_url?: string | null
          menu_updated_at?: string
          name: string
          opening_hours?: string
          price_band?: number
          source?: string
          website?: string | null
        }
        Update: {
          cuisine?: string
          google_place_id?: string | null
          id?: string
          lat?: number
          lng?: number
          menu_dated?: string | null
          menu_source_url?: string | null
          menu_updated_at?: string
          name?: string
          opening_hours?: string
          price_band?: number
          source?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_safe_items: {
        Args: {
          p_budget?: number
          p_lat: number
          p_lng: number
          p_mood: string
          p_want_light?: boolean
          p_want_warm?: boolean
          p_weather: string
        }
        Returns: {
          allergen_confidence: string
          cuisine: string
          diet_tags: string[]
          distance_m: number
          item_id: string
          item_name: string
          key_ingredients: string[]
          price: number
          reason_code: string
          restaurant_id: string
          restaurant_name: string
          score: number
          summary_text: string
        }[]
      }
      review_menu_item: {
        Args: { p_item: string; p_ok: boolean }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
