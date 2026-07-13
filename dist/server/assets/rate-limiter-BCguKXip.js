//#region src/lib/rate-limiter.ts
/**
* Supabase counter-based rate limiter.
* Uses a Postgres RPC function for atomic counter operations — survives
* serverless restarts and works across parallel requests.
*/
var supabaseAdminModule = null;
async function getAdmin() {
	if (!supabaseAdminModule) supabaseAdminModule = await import("./client.server-DzUna2e6.js");
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
async function checkRateLimit(key, limit = 1, windowSec = 1) {
	const { data, error } = await (await getAdmin()).rpc("check_rate_limit", {
		lim_key: key,
		lim_limit: limit,
		lim_window_sec: windowSec
	});
	if (error) {
		console.error(`[rate-limiter] RPC error for key=${key}:`, error);
		return true;
	}
	return data === true;
}
//#endregion
export { checkRateLimit };
