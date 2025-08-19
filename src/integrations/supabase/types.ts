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
      events: {
        Row: {
          id: string
          kind: string | null
          payload: Json | null
          session_id: string | null
          ts: string | null
        }
        Insert: {
          id?: string
          kind?: string | null
          payload?: Json | null
          session_id?: string | null
          ts?: string | null
        }
        Update: {
          id?: string
          kind?: string | null
          payload?: Json | null
          session_id?: string | null
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      extracts: {
        Row: {
          confidence: number | null
          created_at: string | null
          entities: Json | null
          followup_actions: Json | null
          id: string
          intent: string | null
          lead_score: number | null
          session_id: string | null
          utterance_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entities?: Json | null
          followup_actions?: Json | null
          id?: string
          intent?: string | null
          lead_score?: number | null
          session_id?: string | null
          utterance_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entities?: Json | null
          followup_actions?: Json | null
          id?: string
          intent?: string | null
          lead_score?: number | null
          session_id?: string | null
          utterance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracts_utterance_id_fkey"
            columns: ["utterance_id"]
            isOneToOne: false
            referencedRelation: "utterances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_extracts_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_extracts_utterance_id"
            columns: ["utterance_id"]
            isOneToOne: false
            referencedRelation: "utterances"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          content: Json
          created_at: string | null
          embedding: string | null
          id: string
          importance: number | null
          last_referenced: string | null
          scope: string
          session_id: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          last_referenced?: string | null
          scope: string
          session_id?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          last_referenced?: string | null
          scope?: string
          session_id?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rag_chunks: {
        Row: {
          content: string
          created_at: string | null
          document_id: string | null
          id: string
          token_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          token_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rag_documents: {
        Row: {
          collection_id: string | null
          created_at: string | null
          id: string
          meta: Json | null
          source_url: string | null
          title: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          source_url?: string | null
          title?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_documents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "rag_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_embeddings: {
        Row: {
          chunk_id: string
          embedding: string | null
        }
        Insert: {
          chunk_id: string
          embedding?: string | null
        }
        Update: {
          chunk_id?: string
          embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "rag_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          channel: string | null
          consent: boolean | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          cta_chosen: string | null
          current_mode: string | null
          email: string | null
          ended_at: string | null
          final_intent: string | null
          id: string
          lead_score: number | null
          notes: string | null
          session_secret: string | null
          started_at: string | null
          updated_at: string | null
          visitor_id: string | null
        }
        Insert: {
          channel?: string | null
          consent?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_chosen?: string | null
          current_mode?: string | null
          email?: string | null
          ended_at?: string | null
          final_intent?: string | null
          id?: string
          lead_score?: number | null
          notes?: string | null
          session_secret?: string | null
          started_at?: string | null
          updated_at?: string | null
          visitor_id?: string | null
        }
        Update: {
          channel?: string | null
          consent?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_chosen?: string | null
          current_mode?: string | null
          email?: string | null
          ended_at?: string | null
          final_intent?: string | null
          id?: string
          lead_score?: number | null
          notes?: string | null
          session_secret?: string | null
          started_at?: string | null
          updated_at?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      summaries: {
        Row: {
          action_items: Json | null
          created_at: string | null
          crm_payload: Json | null
          executive_summary: string | null
          session_id: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          crm_payload?: Json | null
          executive_summary?: string | null
          session_id: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          crm_payload?: Json | null
          executive_summary?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_summaries_session_id"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      utterances: {
        Row: {
          asr_conf: number | null
          audio_url: string | null
          id: string
          session_id: string | null
          speaker: string
          text: string
          ts: string | null
        }
        Insert: {
          asr_conf?: number | null
          audio_url?: string | null
          id?: string
          session_id?: string | null
          speaker: string
          text: string
          ts?: string | null
        }
        Update: {
          asr_conf?: number | null
          audio_url?: string | null
          id?: string
          session_id?: string | null
          speaker?: string
          text?: string
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_utterances_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utterances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      is_admin_or_owner_with_validation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
      validate_session_access: {
        Args: { session_id_param: string; session_secret_param: string }
        Returns: boolean
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
