/**
 * Supabase counter-based rate limiter.
 * Uses a Postgres RPC function for atomic counter operations — survives
 * serverless restarts and works across parallel requests.
 */

let supabaseAdminModule: typeof import("@/integrations/supabase/client.server") | null = null;

async function getAdmin() {
  if (!supabaseAdminModule) {
    supabaseAdminModule = await import("@/integrations/supabase/client.server");
  }
  return supabaseAdminModule.supabaseAdmin;
}

/**
 * Check if a rate-limited operation is allowed. Atomically increments the
 * counter if within the limit.
 *
 * @param key - Unique identifier for the rate-limited resource (e.g. "musicbrainz")
 * @param limit - Max requests per window (default 1)
 * @param windowSec - Window duration in seconds (default 1)
 * @returns true if allowed, false if rate-limited
 */
export async function checkRateLimit(
  key: string,
  limit = 1,
  windowSec = 1,
): Promise<boolean> {
  const admin = await getAdmin();
  const { data, error } = await admin.rpc("check_rate_limit", {
    lim_key: key,
    lim_limit: limit,
    lim_window_sec: windowSec,
  });
  if (error) {
    console.error(`[rate-limiter] RPC error for key=${key}:`, error);
    // Fail open — don't block if the rate-limiter itself is broken
    return true;
  }
  return data === true;
}
