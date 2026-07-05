// Helpers for turning raw Supabase auth errors into calm, user-facing copy.
//
// The most common confusing one is the email/OTP send rate limit: Supabase
// returns HTTP 429 with a message like "email rate limit exceeded". That ceiling
// is a Supabase-side setting (Dashboard -> Auth -> Rate Limits, unlocked by
// custom SMTP), so the client can't raise it — but it CAN stop showing the raw
// error and gently ask the user to wait out the per-address cooldown.

/** Supabase enforces a ~60s cooldown between email sends to the same address. */
export const EMAIL_COOLDOWN_MS = 60_000;

/**
 * How long an emailed magic link / 6-digit code stays valid. Matches the
 * "expires in 1 hour" copy in supabase/email-templates/*. Used to drive the
 * live "Expires in MM:SS" countdown on the check-email / code screens.
 */
export const EMAIL_LINK_TTL_MS = 60 * 60 * 1000;

/** True when a Supabase auth error is an email/OTP send rate-limit. */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; message?: string };
  if (e.status === 429) return true;
  const code = (e.code ?? "").toLowerCase();
  const msg = (e.message ?? "").toLowerCase();
  return (
    code.includes("rate_limit") ||
    code.includes("over_email_send") ||
    msg.includes("rate limit") ||
    msg.includes("too many")
  );
}

/**
 * Map a Supabase auth error to a message safe to show a user. Rate-limit
 * errors get a calm, actionable line instead of the raw wording.
 */
export function friendlyAuthError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isRateLimitError(error)) {
    return "You've requested too many emails in a short time. Please wait a minute, then try again.";
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

/** ISO timestamp `EMAIL_COOLDOWN_MS` from now — feed to `useCountdown`. */
export function nextEmailCooldown(): string {
  return new Date(Date.now() + EMAIL_COOLDOWN_MS).toISOString();
}

/** ISO timestamp `EMAIL_LINK_TTL_MS` from now — feed to `useCountdown`. */
export function emailLinkExpiry(): string {
  return new Date(Date.now() + EMAIL_LINK_TTL_MS).toISOString();
}
