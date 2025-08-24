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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string
          category: string
          content_embedding: string | null
          created_at: string | null
          description: string
          edition: string | null
          embedding: string | null
          embedding_generated_at: string | null
          file_formats: Json | null
          id: string
          image_url: string | null
          manuscript_id: string | null
          name: string
          price: number
          published_date: string | null
          search_text: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          author: string
          category: string
          content_embedding?: string | null
          created_at?: string | null
          description: string
          edition?: string | null
          embedding?: string | null
          embedding_generated_at?: string | null
          file_formats?: Json | null
          id?: string
          image_url?: string | null
          manuscript_id?: string | null
          name: string
          price: number
          published_date?: string | null
          search_text?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          author?: string
          category?: string
          content_embedding?: string | null
          created_at?: string | null
          description?: string
          edition?: string | null
          embedding?: string | null
          embedding_generated_at?: string | null
          file_formats?: Json | null
          id?: string
          image_url?: string | null
          manuscript_id?: string | null
          name?: string
          price?: number
          published_date?: string | null
          search_text?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_revisions: {
        Row: {
          change_description: string | null
          changed_by: string | null
          content: string | null
          created_at: string | null
          file_size_bytes: number | null
          id: string
          manuscript_id: string | null
          version_number: number
          word_count: number | null
        }
        Insert: {
          change_description?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          manuscript_id?: string | null
          version_number: number
          word_count?: number | null
        }
        Update: {
          change_description?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          manuscript_id?: string | null
          version_number?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_revisions_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_sessions: {
        Row: {
          document_key: string
          ended_at: string | null
          id: string
          last_activity: string | null
          manuscript_id: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          document_key: string
          ended_at?: string | null
          id?: string
          last_activity?: string | null
          manuscript_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          document_key?: string
          ended_at?: string | null
          id?: string
          last_activity?: string | null
          manuscript_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_sessions_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscript_activity: {
        Row: {
          actions: Json | null
          activity_type: string
          created_at: string | null
          id: string
          manuscript_id: string | null
          timestamp: string | null
          user_id: string | null
          users: Json | null
        }
        Insert: {
          actions?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          manuscript_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          users?: Json | null
        }
        Update: {
          actions?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          manuscript_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          users?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "manuscript_activity_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscript_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          manuscript_id: string | null
          parent_comment_id: string | null
          resolved: boolean | null
          selected_text: string | null
          selection_end: number | null
          selection_start: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          manuscript_id?: string | null
          parent_comment_id?: string | null
          resolved?: boolean | null
          selected_text?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          manuscript_id?: string | null
          parent_comment_id?: string | null
          resolved?: boolean | null
          selected_text?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manuscript_comments_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manuscript_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "manuscript_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscripts: {
        Row: {
          author_id: string
          category: string
          cover_image_url: string
          created_at: string | null
          current_editors: string[] | null
          description: string
          document_content: string | null
          document_key: string | null
          document_version: number | null
          editing_status: string | null
          editor_feedback: string | null
          editor_id: string | null
          feedback_history: Json | null
          file_url: string
          id: string
          is_being_edited: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          last_resubmitted_at: string | null
          onlyoffice_key: string | null
          pdf_url: string | null
          published_at: string | null
          publisher_id: string | null
          reviewed_at: string | null
          status: string
          storage_path: string | null
          submission_count: number | null
          submitted_at: string | null
          suggested_price: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          wants_physical: boolean | null
          word_count: number | null
        }
        Insert: {
          author_id: string
          category: string
          cover_image_url: string
          created_at?: string | null
          current_editors?: string[] | null
          description: string
          document_content?: string | null
          document_key?: string | null
          document_version?: number | null
          editing_status?: string | null
          editor_feedback?: string | null
          editor_id?: string | null
          feedback_history?: Json | null
          file_url: string
          id?: string
          is_being_edited?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_resubmitted_at?: string | null
          onlyoffice_key?: string | null
          pdf_url?: string | null
          published_at?: string | null
          publisher_id?: string | null
          reviewed_at?: string | null
          status?: string
          storage_path?: string | null
          submission_count?: number | null
          submitted_at?: string | null
          suggested_price?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          wants_physical?: boolean | null
          word_count?: number | null
        }
        Update: {
          author_id?: string
          category?: string
          cover_image_url?: string
          created_at?: string | null
          current_editors?: string[] | null
          description?: string
          document_content?: string | null
          document_key?: string | null
          document_version?: number | null
          editing_status?: string | null
          editor_feedback?: string | null
          editor_id?: string | null
          feedback_history?: Json | null
          file_url?: string
          id?: string
          is_being_edited?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_resubmitted_at?: string | null
          onlyoffice_key?: string | null
          pdf_url?: string | null
          published_at?: string | null
          publisher_id?: string | null
          reviewed_at?: string | null
          status?: string
          storage_path?: string | null
          submission_count?: number | null
          submitted_at?: string | null
          suggested_price?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          wants_physical?: boolean | null
          word_count?: number | null
        }
        Relationships: []
      }
      n8n_marketing_analytics: {
        Row: {
          book_id: string
          campaign_type: string
          completed_at: string | null
          content_generated: Json | null
          error_message: string | null
          id: string
          platforms_posted: string[] | null
          status: string
          triggered_at: string | null
        }
        Insert: {
          book_id: string
          campaign_type: string
          completed_at?: string | null
          content_generated?: Json | null
          error_message?: string | null
          id?: string
          platforms_posted?: string[] | null
          status: string
          triggered_at?: string | null
        }
        Update: {
          book_id?: string
          campaign_type?: string
          completed_at?: string | null
          content_generated?: Json | null
          error_message?: string | null
          id?: string
          platforms_posted?: string[] | null
          status?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "n8n_marketing_analytics_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          book_id: string
          created_at: string | null
          delivery_type: string
          id: string
          purchase_price: number | null
          quantity: number | null
          shipping_address: Json | null
          status: string
          stripe_payment_intent_id: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          delivery_type: string
          id?: string
          purchase_price?: number | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          delivery_type?: string
          id?: string
          purchase_price?: number | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_products: {
        Row: {
          book_id: string
          created_at: string | null
          currency: string | null
          digital_price_id: string | null
          id: string
          physical_price_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string
          unit_amount: number | null
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          currency?: string | null
          digital_price_id?: string | null
          id?: string
          physical_price_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          currency?: string | null
          digital_price_id?: string | null
          id?: string
          physical_price_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_products_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_books_semantic: {
        Args: {
          exclude_book_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          author: string
          category: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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