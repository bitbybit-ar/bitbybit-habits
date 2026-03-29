/**
 * API error codes mapped to i18n keys.
 * API routes throw errors with these codes (English, stable).
 * The client maps them to user-facing translated messages.
 */
export const ERROR_CODES = {
  // Auth
  MISSING_FIELDS: "missing_fields",
  INVALID_CREDENTIALS: "invalid_credentials",
  ACCOUNT_LOCKED: "account_locked",
  TOO_MANY_ATTEMPTS: "too_many_attempts",
  INVALID_LOCALE: "invalid_locale",
  USERNAME_TOO_SHORT: "username_too_short",
  INVALID_EMAIL: "invalid_email",

  // 2FA
  TWO_FA_NOT_CONFIGURED: "2fa_not_configured",
  TWO_FA_NOT_ENABLED: "2fa_not_enabled",
  INVALID_CODE: "invalid_code",
  INVALID_TOKEN: "invalid_token",
  TOKEN_EXPIRED: "token_expired",

  // Families
  FAMILY_NAME_REQUIRED: "family_name_required",
  INVITE_CODE_REQUIRED: "invite_code_required",
  INVALID_INVITE_CODE: "invalid_invite_code",
  ALREADY_MEMBER: "already_member",
  LAST_SPONSOR: "last_sponsor",
  CANNOT_DEMOTE_LAST_SPONSOR: "cannot_demote_last_sponsor",
  SPONSORS_ONLY: "sponsors_only",

  // Habits
  MISSING_REQUIRED_FIELDS: "missing_required_fields",
  INVALID_SCHEDULE_TYPE: "invalid_schedule_type",
  INVALID_VERIFICATION_TYPE: "invalid_verification_type",
  INVALID_SAT_REWARD: "invalid_sat_reward",
  INVALID_COLOR: "invalid_color",
  INVALID_SCHEDULE_DAYS: "invalid_schedule_days",
  FAMILY_ID_REQUIRED: "family_id_required",
  NOT_FAMILY_SPONSOR: "not_family_sponsor",
  USER_NOT_FAMILY_MEMBER: "user_not_family_member",
  HABIT_NOT_FOUND: "habit_not_found",

  // Completions
  INVALID_EVIDENCE_URL: "invalid_evidence_url",
  NOTE_TOO_LONG: "note_too_long",
  HABIT_NOT_ASSIGNED: "habit_not_assigned",
  ALREADY_COMPLETED_TODAY: "already_completed_today",
  COMPLETION_NOT_FOUND: "completion_not_found",
  INVALID_DATE_FORMAT: "invalid_date_format",
  INVALID_DATE_RANGE: "invalid_date_range",

  // Payments
  SPONSOR_NO_WALLET: "sponsor_no_wallet",
  KID_NO_WALLET: "kid_no_wallet",
  NO_INVOICE: "no_invoice",
  INVALID_PREIMAGE: "invalid_preimage",
  PREIMAGE_REQUIRED: "preimage_required",
  ONLY_FAILED_RETRY: "only_failed_retry",
  INSUFFICIENT_FUNDS: "insufficient_funds",
  NWC_PAYMENT_FAILED: "nwc_payment_failed",
  NWC_INVOICE_FAILED: "nwc_invoice_failed",
  NWC_TIMEOUT: "nwc_timeout",

  // Wallets
  INVALID_NWC_URL: "invalid_nwc_url",
  NO_WALLET: "no_wallet",
  MISSING_INVOICE: "missing_invoice",
  INVALID_INVOICE: "invalid_invoice",
  INVALID_AMOUNT: "invalid_amount",
  PAYMENT_FAILED: "payment_failed",
  INVOICE_FAILED: "invoice_failed",
} as const;
