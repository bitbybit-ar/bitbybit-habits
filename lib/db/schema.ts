import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ============================================================
// USERS
// ============================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  password_hash: text("password_hash").notNull(),
  display_name: text("display_name").notNull(),
  avatar_url: text("avatar_url"),
  locale: text("locale").notNull().default("es"),
  failed_login_attempts: integer("failed_login_attempts").notNull().default(0),
  locked_until: timestamp("locked_until"),
  nostr_pubkey: text("nostr_pubkey"),
  auth_provider: text("auth_provider").notNull().default("email"),
  nostr_metadata: jsonb("nostr_metadata").$type<Record<string, unknown> | null>(),
  nostr_metadata_updated_at: timestamp("nostr_metadata_updated_at"),
  totp_secret: text("totp_secret"),
  totp_enabled: boolean("totp_enabled").notNull().default(false),
  recovery_codes: text("recovery_codes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_users_email").on(t.email),
  index("idx_users_username").on(t.username),
]);

// ============================================================
// FAMILIES
// ============================================================
export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  invite_code: text("invite_code").unique().notNull(),
  created_by: uuid("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  family_id: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<"sponsor" | "kid">(),
  joined_at: timestamp("joined_at").defaultNow(),
}, (t) => [
  unique().on(t.family_id, t.user_id),
]);

// ============================================================
// HABITS
// ============================================================
export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  family_id: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
  created_by: uuid("created_by").notNull().references(() => users.id),
  assigned_to: uuid("assigned_to").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#F7A825"),
  icon: text("icon"),
  sat_reward: integer("sat_reward").notNull().default(0),
  schedule_type: text("schedule_type").notNull().default("daily").$type<"daily" | "specific_days" | "times_per_week">(),
  schedule_days: integer("schedule_days").array(),
  schedule_times_per_week: integer("schedule_times_per_week"),
  verification_type: text("verification_type").notNull().default("sponsor_approval").$type<"sponsor_approval" | "self_verify" | "bot_verify">(),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_habits_family").on(t.family_id),
  index("idx_habits_assigned").on(t.assigned_to),
]);

// ============================================================
// COMPLETIONS
// ============================================================
export const completions = pgTable("completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  habit_id: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "rejected">(),
  evidence_url: text("evidence_url"),
  note: text("note"),
  completed_at: timestamp("completed_at").defaultNow(),
  reviewed_by: uuid("reviewed_by").references(() => users.id),
  reviewed_at: timestamp("reviewed_at"),
}, (t) => [
  unique().on(t.habit_id, t.user_id, t.date),
  index("idx_completions_habit").on(t.habit_id),
  index("idx_completions_user").on(t.user_id),
  index("idx_completions_date").on(t.date),
  index("idx_completions_status").on(t.status),
]);

// ============================================================
// PAYMENTS
// ============================================================
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  completion_id: uuid("completion_id").notNull().references(() => completions.id),
  from_user_id: uuid("from_user_id").notNull().references(() => users.id),
  to_user_id: uuid("to_user_id").notNull().references(() => users.id),
  amount_sats: integer("amount_sats").notNull(),
  payment_request: text("payment_request"),
  payment_hash: text("payment_hash"),
  preimage: text("preimage"),
  payment_method: text("payment_method").$type<"webln" | "nwc" | "manual">(),
  status: text("status").notNull().default("pending").$type<"pending" | "paid" | "failed">(),
  paid_at: timestamp("paid_at"),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_payments_completion").on(t.completion_id),
  index("idx_payments_status").on(t.status),
]);

// ============================================================
// WALLETS
// ============================================================
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id).unique(),
  nwc_url_encrypted: text("nwc_url_encrypted").notNull(),
  label: text("label"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_notifications_user").on(t.user_id),
]);

// ============================================================
// HABIT ASSIGNMENTS
// ============================================================
export const habitAssignments = pgTable("habit_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  habit_id: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => [
  unique().on(t.habit_id, t.user_id),
  index("idx_habit_assignments_habit").on(t.habit_id),
  index("idx_habit_assignments_user").on(t.user_id),
]);
