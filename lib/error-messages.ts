/**
 * Maps API error codes to i18n translation keys.
 * Falls back to the raw error string if no mapping exists.
 */

const ERROR_CODE_TO_I18N: Record<string, string> = {
  // Auth
  missing_fields: "errors.missingFields",
  invalid_credentials: "errors.invalidCredentials",
  account_locked: "errors.accountLocked",
  too_many_attempts: "errors.tooManyAttempts",
  invalid_locale: "errors.invalidLocale",
  username_too_short: "errors.usernameTooShort",
  invalid_email: "errors.invalidEmail",

  // 2FA
  "2fa_not_configured": "errors.twoFaNotConfigured",
  "2fa_not_enabled": "errors.twoFaNotEnabled",
  invalid_code: "errors.invalidCode",
  invalid_token: "errors.invalidToken",
  token_expired: "errors.tokenExpired",

  // Families
  family_name_required: "errors.familyNameRequired",
  invite_code_required: "errors.inviteCodeRequired",
  invalid_invite_code: "errors.invalidInviteCode",
  already_member: "errors.alreadyMember",
  already_has_family: "errors.alreadyHasFamily",
  last_sponsor: "errors.lastSponsor",
  cannot_demote_last_sponsor: "errors.cannotDemoteLastSponsor",
  single_sponsor_only: "errors.singleSponsorOnly",
  sponsors_only: "errors.sponsorsOnly",

  // Habits
  missing_required_fields: "errors.missingFields",
  invalid_schedule_type: "errors.invalidScheduleType",
  invalid_verification_type: "errors.invalidVerificationType",
  invalid_sat_reward: "errors.invalidSatReward",
  invalid_color: "errors.invalidColor",
  invalid_schedule_days: "errors.invalidScheduleDays",
  family_id_required: "errors.familyIdRequired",
  not_family_sponsor: "errors.notFamilySponsor",
  user_not_family_member: "errors.userNotFamilyMember",
  habit_not_found: "errors.habitNotFound",

  // Completions
  invalid_evidence_url: "errors.invalidEvidenceUrl",
  note_too_long: "errors.noteTooLong",
  habit_not_assigned: "errors.habitNotAssigned",
  already_completed_today: "errors.alreadyCompletedToday",
  completion_not_found: "errors.completionNotFound",
  invalid_date_format: "errors.invalidDateFormat",
  invalid_date_range: "errors.invalidDateRange",

  // Payments
  sponsor_no_wallet: "errors.sponsorNoWallet",
  kid_no_wallet: "errors.kidNoWallet",
  no_invoice: "errors.noInvoice",
  invalid_preimage: "errors.invalidPreimage",
  preimage_required: "errors.preimageRequired",
  only_failed_retry: "errors.onlyFailedRetry",
  insufficient_funds: "errors.insufficientFunds",
  nwc_payment_failed: "errors.nwcPaymentFailed",
  nwc_invoice_failed: "errors.nwcInvoiceFailed",
  nwc_timeout: "errors.nwcTimeout",

  // Nostr auth
  no_challenge: "errors.noChallenge",
  invalid_nostr_signature: "errors.invalidNostrSignature",
  nostr_pubkey_already_linked: "errors.nostrPubkeyAlreadyLinked",
  account_already_has_nostr: "errors.accountAlreadyHasNostr",
  cannot_unlink_only_auth_method: "errors.cannotUnlinkOnlyAuthMethod",
  nostr_only_account: "errors.nostrOnlyAccount",
  nostr_site_not_connected: "auth.nostrSiteNotConnected",
  nostr_signing_rejected: "auth.nostrSigningRejected",

  // Wallets
  invalid_nwc_url: "errors.invalidNwcUrl",
  no_wallet: "errors.noWallet",
  missing_invoice: "errors.missingInvoice",
  invalid_invoice: "errors.invalidInvoice",
  invalid_amount: "errors.invalidAmount",
  payment_failed: "errors.paymentFailed",
  invoice_failed: "errors.invoiceFailed",

  // Profile
  no_changes: "errors.noChanges",
  no_extension: "auth.nostrExtensionRequired",
  nostr_no_signing_key: "errors.nostrNoSigningKey",
  nostr_link_failed: "errors.nostrLinkFailed",
  nostr_login_failed: "errors.nostrLoginFailed",
  nostr_unlink_failed: "errors.nostrUnlinkFailed",

  // Generic
  Unauthorized: "errors.unauthorized",
  Forbidden: "errors.forbidden",
  "Resource already exists": "errors.resourceExists",
  "Internal server error": "errors.internalError",
  "Too many requests. Try again later.": "errors.tooManyAttempts",
};

/**
 * Resolves an API error string to a translated message.
 * @param error - The error code/message from the API
 * @param t - The next-intl translation function
 * @returns Translated error message, or the raw error if no mapping exists
 */
export function resolveApiError(error: string, t: (key: string) => string): string {
  const i18nKey = ERROR_CODE_TO_I18N[error];
  if (i18nKey) {
    const translated = t(i18nKey);
    // next-intl returns the key itself if not found
    if (translated !== i18nKey) return translated;
  }
  return error;
}
