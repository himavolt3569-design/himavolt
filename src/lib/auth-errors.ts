/**
 * Map raw Supabase auth error messages to friendlier, actionable copy.
 *
 * NOTE on "email rate limit exceeded": that limit is enforced by Supabase, not
 * this app — its ceiling and window are configured in the Supabase dashboard
 * (Authentication → Rate Limits → "Rate limit for sending emails", and/or a
 * custom SMTP provider for higher production volume). No amount of app code can
 * raise it; the client calls Supabase directly. All we can do here is show a
 * clearer message than the raw error.
 */
export function friendlyAuthError(message: string | undefined | null): string {
  const msg = (message ?? "").trim();
  if (!msg) return "Something went wrong. Please try again.";
  if (/email rate limit exceeded|over_email_send_rate_limit|rate limit|too many requests/i.test(msg)) {
    return "Too many email requests for now. Please wait a few minutes, then try again.";
  }
  return msg;
}
