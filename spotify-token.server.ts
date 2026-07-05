// Server-only utility: fetches and caches the Spotify app access token.
// This is the ONLY place in the app that talks to https://accounts.spotify.com.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SINGLETON_ID = "singleton";

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now();

  const { data: cached } = await supabaseAdmin
    .from("spotify_token_cache")
    .select("access_token, expires_at")
    .eq("id", SINGLETON_ID)
    .maybeSingle();

  const row = cached as { access_token: string; expires_at: number } | null;
  if (row && row.expires_at > now) return row.access_token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not configured.");
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify token request failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = Date.now() + (json.expires_in - 60) * 1000;

  await supabaseAdmin
    .from("spotify_token_cache")
    .upsert(
      { id: SINGLETON_ID, access_token: json.access_token, expires_at: expiresAt },
      { onConflict: "id" },
    );

  return json.access_token;
}
