// ============================================================
// Database models
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string | null;
  display_name: string;
  avatar_url?: string;
  nostr_pubkey?: string | null;
  auth_provider: "email" | "nostr";
  nostr_metadata?: Record<string, unknown> | null;
  nostr_metadata_updated_at?: string | null;
  locale: "es" | "en";
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: "sponsor" | "kid";
  joined_at: string;
}

export interface Habit {
  id: string;
  family_id?: string;
  created_by: string;
  assigned_to: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sat_reward: number;
  schedule_type: "daily" | "specific_days" | "times_per_week";
  schedule_days?: number[];
  schedule_times_per_week?: number;
  verification_type: "sponsor_approval" | "self_verify" | "bot_verify";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Completion {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  evidence_url?: string;
  note?: string;
  completed_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface Payment {
  id: string;
  completion_id: string;
  from_user_id: string;
  to_user_id: string;
  amount_sats: number;
  payment_request?: string;
  payment_hash?: string;
  preimage?: string;
  payment_method?: "webln" | "nwc" | "manual";
  status: "pending" | "paid" | "failed";
  paid_at?: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  nwc_url_encrypted: string;
  label?: string;
  active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PaymentWithDetails extends Payment {
  habit_name: string;
  other_user_display_name: string;
}

// ============================================================
// API types
// ============================================================

export interface AuthSession {
  user_id: string;
  email: string;
  username: string;
  display_name: string;
  locale: "es" | "en";
  role: "sponsor" | "kid" | null;
  nostr_pubkey?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
