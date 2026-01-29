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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      booking_bargains: {
        Row: {
          booking_id: string
          created_at: string
          driver_counter: number | null
          driver_id: string | null
          expires_at: string
          final_fare: number | null
          id: string
          original_fare: number
          status: Database["public"]["Enums"]["bargain_status"]
          updated_at: string
          user_id: string
          user_offer: number | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_counter?: number | null
          driver_id?: string | null
          expires_at?: string
          final_fare?: number | null
          id?: string
          original_fare: number
          status?: Database["public"]["Enums"]["bargain_status"]
          updated_at?: string
          user_id: string
          user_offer?: number | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_counter?: number | null
          driver_id?: string | null
          expires_at?: string
          final_fare?: number | null
          id?: string
          original_fare?: number
          status?: Database["public"]["Enums"]["bargain_status"]
          updated_at?: string
          user_id?: string
          user_offer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_bargains_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_bargains_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          accepted_bid_id: string | null
          base_fare: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          distance_km: number | null
          driver_id: string | null
          drop_address: string
          drop_lat: number | null
          drop_lng: number | null
          estimated_fare: number
          final_fare: number | null
          id: string
          insurance_fee: number | null
          insurance_opt_in: boolean | null
          notes: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          platform_fee: number | null
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_bid_id?: string | null
          base_fare?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          drop_address: string
          drop_lat?: number | null
          drop_lng?: number | null
          estimated_fare: number
          final_fare?: number | null
          id?: string
          insurance_fee?: number | null
          insurance_opt_in?: boolean | null
          notes?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number | null
          scheduled_at?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_bid_id?: string | null
          base_fare?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          drop_address?: string
          drop_lat?: number | null
          drop_lng?: number | null
          estimated_fare?: number
          final_fare?: number | null
          id?: string
          insurance_fee?: number | null
          insurance_opt_in?: boolean | null
          notes?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number | null
          scheduled_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_accepted_bid_id_fkey"
            columns: ["accepted_bid_id"]
            isOneToOne: false
            referencedRelation: "driver_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_prices: {
        Row: {
          base_fare: number
          competitor_name: string
          id: string
          per_km_rate: number
          service_type: Database["public"]["Enums"]["service_type"]
          surge_multiplier: number
          updated_at: string
        }
        Insert: {
          base_fare: number
          competitor_name: string
          id?: string
          per_km_rate: number
          service_type: Database["public"]["Enums"]["service_type"]
          surge_multiplier?: number
          updated_at?: string
        }
        Update: {
          base_fare?: number
          competitor_name?: string
          id?: string
          per_km_rate?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          surge_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_bids: {
        Row: {
          bid_amount: number
          booking_id: string
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          is_lowest: boolean | null
          status: Database["public"]["Enums"]["bid_status"]
          updated_at: string
        }
        Insert: {
          bid_amount: number
          booking_id: string
          created_at?: string
          driver_id: string
          expires_at?: string
          id?: string
          is_lowest?: boolean | null
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Update: {
          bid_amount?: number
          booking_id?: string
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          is_lowest?: boolean | null
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_bids_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_bids_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          booking_id: string | null
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscriptions: {
        Row: {
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          payment_reference: string | null
          plan_type: string
          price: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_at: string
          id?: string
          payment_reference?: string | null
          plan_type: string
          price: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          payment_reference?: string | null
          plan_type?: string
          price?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          is_online: boolean
          kyc_document_url: string | null
          license_number: string
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"]
          total_earnings: number | null
          total_rides: number | null
          updated_at: string
          user_id: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["service_type"]
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_online?: boolean
          kyc_document_url?: string | null
          license_number: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string
          user_id: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["service_type"]
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_online?: boolean
          kyc_document_url?: string | null
          license_number?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          vehicle_type?: Database["public"]["Enums"]["service_type"]
          wallet_balance?: number | null
        }
        Relationships: []
      }
      guardian_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relationship: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          created_at: string
          driver_id: string
          feedback: string | null
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_id: string
          feedback?: string | null
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_id?: string
          feedback?: string | null
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing: {
        Row: {
          base_fare: number
          created_at: string
          id: string
          is_active: boolean
          minimum_fare: number
          per_km_rate: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          base_fare: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_fare: number
          per_km_rate: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          base_fare?: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_fare?: number
          per_km_rate?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: []
      }
      special_service_details: {
        Row: {
          booking_id: string
          created_at: string
          drop_otp: string | null
          guardian_contact_id: string | null
          id: string
          otp_verified: boolean
          passenger_age: number | null
          passenger_name: string
          passenger_phone: string | null
          pickup_otp: string | null
          service_type: Database["public"]["Enums"]["special_service_type"]
          special_instructions: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          drop_otp?: string | null
          guardian_contact_id?: string | null
          id?: string
          otp_verified?: boolean
          passenger_age?: number | null
          passenger_name: string
          passenger_phone?: string | null
          pickup_otp?: string | null
          service_type: Database["public"]["Enums"]["special_service_type"]
          special_instructions?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          drop_otp?: string | null
          guardian_contact_id?: string | null
          id?: string
          otp_verified?: boolean
          passenger_age?: number | null
          passenger_name?: string
          passenger_phone?: string | null
          pickup_otp?: string | null
          service_type?: Database["public"]["Enums"]["special_service_type"]
          special_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_service_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_service_details_guardian_contact_id_fkey"
            columns: ["guardian_contact_id"]
            isOneToOne: false
            referencedRelation: "guardian_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_gateway: string | null
          reference_id: string | null
          status: string
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: string
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: string
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
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
      calculate_insurance_fee: {
        Args: { distance_km: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      bargain_status:
        | "pending"
        | "countered"
        | "accepted"
        | "rejected"
        | "expired"
      bid_status: "pending" | "accepted" | "rejected" | "expired"
      booking_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      driver_status: "pending" | "approved" | "rejected" | "suspended"
      notification_type:
        | "booking_update"
        | "driver_arrival"
        | "promotion"
        | "safety_alert"
        | "payment"
      payment_mode: "cash" | "online" | "wallet"
      service_type:
        | "bike_taxi"
        | "auto_rickshaw"
        | "cab"
        | "parcel_delivery"
        | "heavy_goods"
        | "packers_movers"
        | "intercity_goods"
      special_service_type: "kids_pickup" | "senior_citizen" | "standard"
      user_role: "user" | "driver" | "admin"
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
      bargain_status: [
        "pending",
        "countered",
        "accepted",
        "rejected",
        "expired",
      ],
      bid_status: ["pending", "accepted", "rejected", "expired"],
      booking_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      driver_status: ["pending", "approved", "rejected", "suspended"],
      notification_type: [
        "booking_update",
        "driver_arrival",
        "promotion",
        "safety_alert",
        "payment",
      ],
      payment_mode: ["cash", "online", "wallet"],
      service_type: [
        "bike_taxi",
        "auto_rickshaw",
        "cab",
        "parcel_delivery",
        "heavy_goods",
        "packers_movers",
        "intercity_goods",
      ],
      special_service_type: ["kids_pickup", "senior_citizen", "standard"],
      user_role: ["user", "driver", "admin"],
    },
  },
} as const
