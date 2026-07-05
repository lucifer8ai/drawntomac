import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ARTISTS = [
  "Seedhe Maut",
  "Frappe Ash",
  "Dhanji",
  "Fred again..",
  "Karan Aujla",
  "Shikriwal",
  "Uniyal",
  "Arijit Singh",
  "AP Dhillon",
  "Divine",
  "Anuv Jain",
  "Prateek Kuhad",
];

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.value;
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      console.error("[spotify] token error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) * 1000 };
    return cachedToken.value;
  } catch (err) {
    console.error("[spotify] token exception", err);
    return null;
  }
}

async function fetchArtistImage(name: string, token: string): Promise<string | null> {
  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&market=IN&limit=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      artists?: { items?: Array<{ images?: Array<{ url: string }> }> };
    };
    const img = json.artists?.items?.[0]?.images?.[0]?.url;
    return img ?? null;
  } catch {
    return null;
  }
}

const REPLACEMENTS = ["Michael Jackson", "Tame Impala", "Pink Floyd", "The Beatles"];

export const getArtistImages = createServerFn({ method: "GET" }).handler(async () => {
  const token = await getToken();
  if (!token) return { images: [] as string[], replacements: [] as string[] };
  const [results, reps] = await Promise.all([
    Promise.all(ARTISTS.map((a) => fetchArtistImage(a, token))),
    Promise.all(REPLACEMENTS.map((a) => fetchArtistImage(a, token))),
  ]);
  return {
    images: results.filter((x): x is string => Boolean(x)),
    replacements: reps.filter((x): x is string => Boolean(x)),
  };
});

export type SongHit = {
  spotify_id: string;
  title: string;
  artist_name: string;
  artist_spotify_id: string | null;
  cover_url: string | null;
  preview_url: string | null;
  spotify_url: string | null;
  release_date: string | null;
};

export const searchSongs = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ q: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }): Promise<{ hits: SongHit[] }> => {
    const token = await getToken();
    if (!token) return { hits: [] };
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(data.q)}&type=track&market=IN&limit=8`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { hits: [] };
    const json = (await res.json()) as {
      tracks?: {
        items?: Array<{
          id: string;
          name: string;
          preview_url: string | null;
          external_urls?: { spotify?: string };
          album?: {
            images?: Array<{ url: string }>;
            release_date?: string;
          };
          artists?: Array<{ id: string; name: string }>;
        }>;
      };
    };
    const items = json.tracks?.items ?? [];
    return {
      hits: items.map((t) => ({
        spotify_id: t.id,
        title: t.name,
        artist_name: t.artists?.[0]?.name ?? "Unknown",
        artist_spotify_id: t.artists?.[0]?.id ?? null,
        cover_url: t.album?.images?.[0]?.url ?? null,
        preview_url: t.preview_url,
        spotify_url: t.external_urls?.spotify ?? null,
        release_date: t.album?.release_date ?? null,
      })),
    };
  });
