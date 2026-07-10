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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      artists: {
        Row: {
          artist_countries: string[] | null
          created_at: string
          genius_artist_id: string | null
          id: string
          image_url: string | null
          musicbrainz_id: string | null
          name: string
          slug: string
        }
        Insert: {
          artist_countries?: string[] | null
          created_at?: string
          genius_artist_id?: string | null
          id?: string
          image_url?: string | null
          musicbrainz_id?: string | null
          name: string
          slug: string
        }
        Update: {
          artist_countries?: string[] | null
          created_at?: string
          genius_artist_id?: string | null
          id?: string
          image_url?: string | null
          musicbrainz_id?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          body: string | null
          created_at: string
          id: string
          song_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          song_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          song_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          user_one_id: string
          user_two_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_one_id: string
          user_two_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_one_id?: string
          user_two_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string | null
          country: string
          created_at: string
          id: string
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string
          id?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          display_name_visible: boolean
          id: string
          location_id: string | null
          pronouns: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          display_name_visible?: boolean
          id: string
          location_id?: string | null
          pronouns?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          display_name_visible?: boolean
          id?: string
          location_id?: string | null
          pronouns?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      review_comments: {
        Row: {
          body: string
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          created_at: string
          entry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist_id: string | null
          country: string | null
          created_at: string
          credits: Json | null
          genius_song_id: string | null
          genius_thumbnail_url: string | null
          genre_tags: string[] | null
          id: string
          musicbrainz_id: string | null
          preview_url: string | null
          release_date: string | null
          release_group_mbid: string | null
          slug: string
          title: string
        }
        Insert: {
          artist_id?: string | null
          country?: string | null
          created_at?: string
          credits?: Json | null
          genius_song_id?: string | null
          genius_thumbnail_url?: string | null
          genre_tags?: string[] | null
          id?: string
          musicbrainz_id?: string | null
          preview_url?: string | null
          release_date?: string | null
          release_group_mbid?: string | null
          slug: string
          title: string
        }
        Update: {
          artist_id?: string | null
          country?: string | null
          created_at?: string
          credits?: Json | null
          genius_song_id?: string | null
          genius_thumbnail_url?: string | null
          genre_tags?: string[] | null
          id?: string
          musicbrainz_id?: string | null
          preview_url?: string | null
          release_date?: string | null
          release_group_mbid?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { lim_key: string; lim_limit?: number; lim_window_sec?: number }
        Returns: boolean
      }
      get_compatible_users: {
        Args: { current_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          liked_songs: string[]
          shared_disliked: number
          shared_heard: number
          shared_liked: number
          shared_reviewed: number
          shared_songs: number
          shared_want: number
          user_id: string
          username: string
          want_songs: string[]
        }[]
      }
      get_for_you_songs: {
        Args: { user_id: string }
        Returns: {
          dislike_count: number
          heard_count: number
          like_count: number
          review_count: number
          song_id: string
          trending_score: number
        }[]
      }
      get_recently_imported_songs: {
        Args: never
        Returns: {
          artist_name: string
          genius_thumbnail_url: string
          slug: string
          song_id: string
          title: string
        }[]
      }
      get_song_like_counts: {
        Args: { song_uuid: string }
        Returns: {
          dislike_count: number
          like_count: number
        }[]
      }
      get_trending_songs: {
        Args: never
        Returns: {
          dislike_count: number
          heard_count: number
          like_count: number
          review_count: number
          song_id: string
          trending_score: number
        }[]
      }
      get_user_compatibility: {
        Args: { target_id: string; viewer_id: string }
        Returns: {
          shared_disliked: number
          shared_heard: number
          shared_liked: number
          shared_reviewed: number
          shared_songs: number
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
