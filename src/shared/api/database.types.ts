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
      balances: {
        Row: {
          amount: number
          household_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          household_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          household_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_rules: {
        Row: {
          active: boolean
          amount: number
          anchor_date: string | null
          created_at: string
          frequency: string
          household_id: string
          id: string
          month_day: number | null
          updated_at: string
          updated_by: string | null
          weekday: number | null
        }
        Insert: {
          active?: boolean
          amount: number
          anchor_date?: string | null
          created_at?: string
          frequency: string
          household_id: string
          id?: string
          month_day?: number | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Update: {
          active?: boolean
          amount?: number
          anchor_date?: string | null
          created_at?: string
          frequency?: string
          household_id?: string
          id?: string
          month_day?: number | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          household_id: string
          id: string
          notes: string | null
          planned_date: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          notes?: string | null
          planned_date: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          notes?: string | null
          planned_date?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      complete_purchase: {
        Args: { p_purchase_id: string }
        Returns: Database['public']['Tables']['purchases']['Row']
      }
      create_household: {
        Args: { p_display_name?: string; p_name: string }
        Returns: Database['public']['Tables']['households']['Row']
      }
      join_household: {
        Args: { p_display_name?: string; p_invite_code: string }
        Returns: Database['public']['Tables']['households']['Row']
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
