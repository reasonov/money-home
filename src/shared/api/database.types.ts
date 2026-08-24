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
      account_members: {
        Row: {
          account_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'account_members_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      accounts: {
        Row: {
          amount: number
          created_at: string
          exclude_from_total: boolean
          id: string
          invite_code: string | null
          name: string
          owner_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          exclude_from_total?: boolean
          id?: string
          invite_code?: string | null
          name: string
          owner_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          exclude_from_total?: boolean
          id?: string
          invite_code?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          id: string
          name: string
          props: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          props?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          props?: Json
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          color_manual: boolean
          created_at: string
          created_by: string
          group_id: string | null
          icon: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          color_manual?: boolean
          created_at?: string
          created_by: string
          group_id?: string | null
          icon: string
          id?: string
          kind: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          color_manual?: boolean
          created_at?: string
          created_by?: string
          group_id?: string | null
          icon?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'category_groups'
            referencedColumns: ['id']
          },
        ]
      }
      category_accounts: {
        Row: {
          account_id: string
          category_id: string
        }
        Insert: {
          account_id: string
          category_id: string
        }
        Update: {
          account_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'category_accounts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'category_accounts_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      category_groups: {
        Row: {
          color: string
          created_at: string
          created_by: string
          icon: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by: string
          icon: string
          id?: string
          kind: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          icon?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_group_accounts: {
        Row: {
          account_id: string
          group_id: string
        }
        Insert: {
          account_id: string
          group_id: string
        }
        Update: {
          account_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'category_group_accounts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'category_group_accounts_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'category_groups'
            referencedColumns: ['id']
          },
        ]
      }
      operation_templates: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          kind: string
          notes: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operation_templates_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      income_occurrences: {
        Row: {
          created_at: string
          id: string
          income_rule_id: string
          occurred_on: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          income_rule_id: string
          occurred_on: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          income_rule_id?: string
          occurred_on?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      expense_occurrences: {
        Row: {
          created_at: string
          expense_rule_id: string
          id: string
          occurred_on: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          expense_rule_id: string
          id?: string
          occurred_on: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          expense_rule_id?: string
          id?: string
          occurred_on?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      expense_rules: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          anchor_date: string | null
          category_id: string | null
          created_at: string
          frequency: string
          id: string
          month_day: number | null
          starts_on: string
          title: string | null
          updated_at: string
          updated_by: string | null
          weekday: number | null
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          anchor_date?: string | null
          category_id?: string | null
          created_at?: string
          frequency: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          anchor_date?: string | null
          category_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
      income_rules: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          anchor_date: string | null
          category_id: string | null
          created_at: string
          frequency: string
          id: string
          month_day: number | null
          starts_on: string
          title: string | null
          updated_at: string
          updated_by: string | null
          weekday: number | null
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          anchor_date?: string | null
          category_id?: string | null
          created_at?: string
          frequency: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          anchor_date?: string | null
          category_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          display_name: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          display_name: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          account_id: string
          amount: number
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          planned_date: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_color?: string | null
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          planned_date: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_color?: string | null
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string
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
      savings_goals: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          id: string
          saved_amount: number
          started_on: string
          status: string
          target_amount: number
          target_date: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          id?: string
          saved_amount?: number
          started_on?: string
          status?: string
          target_amount: number
          target_date: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          id?: string
          saved_amount?: number
          started_on?: string
          status?: string
          target_amount?: number
          target_date?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'savings_goals_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          counterparty_account_id: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
          notes: string | null
          occurred_on: string
          source: string
          status: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_color?: string | null
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          counterparty_account_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind: string
          notes?: string | null
          occurred_on: string
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_color?: string | null
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          counterparty_account_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          notes?: string | null
          occurred_on?: string
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transfer_occurrences: {
        Row: {
          created_at: string
          id: string
          occurred_on: string
          status: string
          transaction_id: string | null
          transfer_rule_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurred_on: string
          status: string
          transaction_id?: string | null
          transfer_rule_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occurred_on?: string
          status?: string
          transaction_id?: string | null
          transfer_rule_id?: string
        }
        Relationships: []
      }
      transfer_rules: {
        Row: {
          active: boolean
          amount: number
          anchor_date: string | null
          created_at: string
          frequency: string
          from_account_id: string
          id: string
          month_day: number | null
          starts_on: string
          title: string | null
          to_account_id: string
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
          from_account_id: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          to_account_id: string
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
          from_account_id?: string
          id?: string
          month_day?: number | null
          starts_on?: string
          title?: string | null
          to_account_id?: string
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      adjust_account_amount: {
        Args: { p_account_id: string; p_delta: number }
        Returns: Database['public']['Tables']['accounts']['Row']
      }
      adjust_expense_occurrence: {
        Args: { p_new_amount: number; p_occurrence_id: string }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      adjust_income_occurrence: {
        Args: { p_new_amount: number; p_occurrence_id: string }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      adjust_transfer_occurrence: {
        Args: { p_new_amount: number; p_occurrence_id: string }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      apply_due_expense_rules: {
        Args: { p_as_of?: string }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
      apply_due_income_rules: {
        Args: { p_as_of?: string }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
      apply_due_transfer_rules: {
        Args: { p_as_of?: string }
        Returns: Database['public']['Tables']['transactions']['Row'][]
      }
      cancel_posted_transaction: {
        Args: { p_id: string }
        Returns: undefined
      }
      complete_purchase: {
        Args: { p_purchase_id: string; p_transaction_id?: string }
        Returns: Database['public']['Tables']['purchases']['Row']
      }
      create_account: {
        Args: {
          p_category_ids?: string[]
          p_group_ids?: string[]
          p_id?: string
          p_name: string
          p_opening_amount?: number
        }
        Returns: Database['public']['Tables']['accounts']['Row']
      }
      delete_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      delete_category: {
        Args: { p_id: string }
        Returns: undefined
      }
      delete_category_group: {
        Args: { p_id: string }
        Returns: undefined
      }
      ensure_profile: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      is_account_member: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      is_category_group_visible: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      is_category_visible: {
        Args: { p_category_id: string }
        Returns: boolean
      }
      join_account: {
        Args: { p_invite_code: string }
        Returns: Database['public']['Tables']['accounts']['Row']
      }
      leave_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      set_account_categories: {
        Args: { p_account_id: string; p_category_ids: string[]; p_group_ids?: string[] }
        Returns: undefined
      }
      share_account: {
        Args: { p_account_id: string }
        Returns: Database['public']['Tables']['accounts']['Row']
      }
      skip_expense_occurrence: {
        Args: { p_occurrence_id: string }
        Returns: undefined
      }
      skip_income_occurrence: {
        Args: { p_occurrence_id: string }
        Returns: undefined
      }
      skip_transfer_occurrence: {
        Args: { p_occurrence_id: string }
        Returns: undefined
      }
      update_posted_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id?: string
          p_counterparty_account_id?: string
          p_id: string
          p_notes?: string
          p_occurred_on: string
          p_title?: string
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      transfer_between_accounts: {
        Args: {
          p_amount: number
          p_from_account_id: string
          p_id?: string
          p_notes?: string
          p_occurred_on: string
          p_to_account_id: string
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      upsert_category: {
        Args: {
          p_account_ids: string[]
          p_color: string
          p_color_manual?: boolean
          p_group_id?: string
          p_icon: string
          p_id?: string
          p_kind: string
          p_name: string
          p_sort_order?: number
        }
        Returns: Database['public']['Tables']['categories']['Row']
      }
      upsert_category_group: {
        Args: {
          p_account_ids: string[]
          p_child_colors?: Json
          p_color: string
          p_icon: string
          p_id?: string
          p_kind: string
          p_name: string
          p_sort_order?: number
        }
        Returns: Database['public']['Tables']['category_groups']['Row']
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
