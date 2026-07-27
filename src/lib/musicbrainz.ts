const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "drawnto/1.0 (drawnTo.fm)";
export const ALLOWED_COUNTRIES = ["IN", "US", "GB", "AU", "CA", "XW", "PK"];
export const ALLOWED_ARTISTS = ["Anuv Jain", "Divine"];

export interface MusicBrainzArtist {
  id: string;
  name: string;
  "sort-name": string;
  type?: string;
  tags?: Array<{ name: string; count: number }>;
  country?: string;
  area?: { name: string; "iso-3166-1-codes"?: string[] };
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "first-release-date"?: string;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  disambiguation?: string;
  "release-group"?: { id: string; title: string };
}

export interface MusicBrainzArtistCredit {
  artist: MusicBrainzArtist;
  name?: string;
  joinphrase?: string;
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
  tags?: Array<{ name: string; count: number }>;
  releases?: MusicBrainzRelease[];
  release?: string;
}

interface MusicBrainzSearchResponse {
  recordings?: MusicBrainzRecording[];
  count: number;
}

export interface ParsedMusicBrainzResult {
  mbid: string;
  title: string;
  artistName: string;
  primaryArtistName: string;
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseGroupTitle: string | null;
  releaseDate: string | null;
  country: string | null;
  tags: string[];
}

function parseArtist(recording: MusicBrainzRecording): {
  name: string;
  primaryName: string;
  mbid: string | null;
} {
  const credits = recording["artist-credit"];
  if (!credits || credits.length === 0)
    return { name: "Unknown", primaryName: "Unknown", mbid: null };
  const name = credits
    .map((c) => c.artist.name + (c.joinphrase ?? ""))
    .join("")
    .trim();
  const primary = credits[0].artist;
  return {
    name: name || primary.name,
    primaryName: primary.name,
    mbid: primary.id ?? null,
  };
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const ym = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  const y = trimmed.match(/^(\d{4})$/);
  if (y) return `${y[1]}-01-01`;
  return null;
}

export function parseDisambiguation(str: string | undefined | null): {
  explicit: boolean;
  clean: boolean;
  hiRes: boolean;
} {
  if (!str) return { explicit: false, clean: false, hiRes: false };
  const lower = str.toLowerCase().trim();
  const explicit = /\[explicit\]/i.test(lower);
  const clean = /\[clean\]/i.test(lower);
  const hiRes = /24-bit\s*(?:\/\s*)?96\s*khz/i.test(lower);
  return { explicit, clean, hiRes };
}

function scoreRelease(release: MusicBrainzRelease): number {
  let score = 0;

  const status = (release.status ?? "").toLowerCase();
  if (status === "official") score += 3;
  else if (status === "promotion") score += 2;
  else if (status === "bootleg") score += 1;

  const dis = parseDisambiguation(release.disambiguation);
  if (dis.explicit) score += 1;
  if (dis.clean) score -= 1;
  if (dis.hiRes) score -= 2;

  if (
    release.country &&
    ALLOWED_COUNTRIES.includes(release.country.toUpperCase())
  ) {
    score += 1;
  }

  return score;
}

function releaseDateEpoch(release: MusicBrainzRelease): number {
  const normalized = normalizeDate(release.date ?? null);
  if (!normalized) return 0;
  return new Date(normalized).getTime() / 1000;
}

export function pickBestRelease(
  releases: MusicBrainzRelease[],
): MusicBrainzRelease | null {
  if (releases.length === 0) return null;
  if (releases.length === 1) return releases[0];

  const scored = releases.map((r) => ({
    release: r,
    score: scoreRelease(r),
    epoch: releaseDateEpoch(r),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.epoch - a.epoch;
  });

  return scored[0].release;
}

export function parseRecording(
  recording: MusicBrainzRecording,
): ParsedMusicBrainzResult {
  const artist = parseArtist(recording);
  const releases = recording.releases ?? [];
  const best = pickBestRelease(releases);
  const rg = best?.["release-group"];
  const tags = (recording.tags ?? []).map((t) => t.name);

  return {
    mbid: recording.id,
    title: recording.title,
    artistName: artist.name,
    primaryArtistName: artist.primaryName,
    artistMbid: artist.mbid,
    releaseGroupMbid: rg?.id ?? null,
    releaseGroupTitle: rg?.title ?? null,
    releaseDate: normalizeDate(best?.date ?? null),
    country: best?.country ?? null,
    tags,
  };
}

async function musicbrainzFetch(path: string): Promise<Response> {
  const { checkRateLimit } = await import("./rate-limiter");
  const allowed = await checkRateLimit("musicbrainz", 1, 1);
  if (!allowed) {
    throw new Error("MusicBrainz rate limit exceeded — slow down and retry.");
  }

  const url = `${MUSICBRAINZ_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getSupabaseAdmin() {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Check if an artist is from an allowed country.
 * Checks DB artist_countries cache first; on miss, fetches from MusicBrainz
 * /artist/{mbid} and checks artist.country AND artist.area.iso-3166-1-codes.
 *
 * @param defaultAllow — what to return on network/API failure.
 *   true (default): fail-open for user imports (don't block real users).
 *   false: fail-closed for seed scripts (unverified = skip).
 */
export async function isArtistInAllowedArea(
  artistMbid: string | null,
  defaultAllow = true,
): Promise<boolean> {
  if (!artistMbid) return false;

  const admin = await getSupabaseAdmin();

  // Check cache first
  const { data: cached } = await admin
    .from("artists")
    .select("artist_countries")
    .eq("musicbrainz_id", artistMbid)
    .maybeSingle();

  if (cached?.artist_countries && cached.artist_countries.length > 0) {
    return cached.artist_countries.some((c: string) =>
      ALLOWED_COUNTRIES.includes(c.toUpperCase()),
    );
  }

  // Fetch from MusicBrainz
  try {
    const res = await musicbrainzFetch(
      `/artist/${encodeURIComponent(artistMbid)}?fmt=json&inc=area`,
    );
    if (!res.ok) return defaultAllow;
    const artist = (await res.json()) as MusicBrainzArtist;

    const countries: string[] = [];
    if (artist.country) countries.push(artist.country);
    if (artist.area?.["iso-3166-1-codes"]) {
      countries.push(...artist.area["iso-3166-1-codes"]);
    }

    // Populate cache
    if (countries.length > 0) {
      const slug = artist.name
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .slice(0, 80);
      await admin.from("artists").upsert(
        {
          musicbrainz_id: artistMbid,
          name: artist.name,
          slug,
          artist_countries: countries,
        },
        { onConflict: "musicbrainz_id" },
      );
    }

    return countries.some((c) => ALLOWED_COUNTRIES.includes(c.toUpperCase()));
  } catch {
    return defaultAllow;
  }
}

function deduplicateRecordings(
  recordings: MusicBrainzRecording[],
): MusicBrainzRecording[] {
  const groups = new Map<
    string,
    { recording: MusicBrainzRecording; best: MusicBrainzRelease | null }
  >();

  for (const rec of recordings) {
    const credits = rec["artist-credit"];
    const primaryArtist = credits?.[0]?.artist?.name ?? "Unknown";
    const key = `${rec.title.toLowerCase()}||${primaryArtist.toLowerCase()}`;

    const best = pickBestRelease(rec.releases ?? []);

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { recording: rec, best });
      continue;
    }

    // Compare: if new recording has a better best release, replace
    if (best && !existing.best) {
      groups.set(key, { recording: rec, best });
    } else if (best && existing.best) {
      const newScore = scoreRelease(best);
      const oldScore = scoreRelease(existing.best);
      if (newScore > oldScore) {
        groups.set(key, { recording: rec, best });
      } else if (
        newScore === oldScore &&
        releaseDateEpoch(best) > releaseDateEpoch(existing.best)
      ) {
        groups.set(key, { recording: rec, best });
      }
    }
  }

  return Array.from(groups.values()).map((g) => g.recording);
}

export function escapeLucene(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\t\r\n]/g, ' ');
}

export async function searchRecordings(
  query: string,
  limit = 8,
  inc = "artists+tags+releases+genres",
  artist?: string,
): Promise<{ results: ParsedMusicBrainzResult[]; error?: string }> {
  const lowerQuery = escapeLucene(query).toLowerCase();
  let q = `recording:"${lowerQuery}"`;
  if (artist) {
    q += ` AND artist:"${escapeLucene(artist).toLowerCase()}"`;
  }

  const res = await musicbrainzFetch(
    `/recording?query=${encodeURIComponent(q)}&fmt=json&limit=${limit}&inc=${encodeURIComponent(inc)}`,
  );
  if (!res.ok) {
    console.error("[musicbrainz search] error", res.status, res.statusText);
    return { results: [], error: `MusicBrainz returned ${res.status}` };
  }
  const data = (await res.json()) as MusicBrainzSearchResponse;
  return { results: deduplicateRecordings(data.recordings ?? []).map(parseRecording) };
}

export async function getRecordingByMbid(
  mbid: string,
  inc = "artists+tags+releases+genres",
): Promise<ParsedMusicBrainzResult | null> {
  const res = await musicbrainzFetch(
    `/recording/${encodeURIComponent(mbid)}?fmt=json&inc=${encodeURIComponent(inc)}`,
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    console.error("[musicbrainz getByMbid] error", res.status, res.statusText);
    return null;
  }
  const data = (await res.json()) as MusicBrainzRecording;
  return parseRecording(data);
}
