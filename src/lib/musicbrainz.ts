const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "drawnto/1.0 (drawnTo.fm)";

export interface MusicBrainzArtist {
  id: string;
  name: string;
  "sort-name": string;
  type?: string;
  tags?: Array<{ name: string; count: number }>;
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
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseGroupTitle: string | null;
  releaseDate: string | null;
  country: string | null;
  tags: string[];
}

function parseArtist(recording: MusicBrainzRecording): { name: string; mbid: string | null } {
  const credits = recording["artist-credit"];
  if (!credits || credits.length === 0) return { name: "Unknown", mbid: null };
  const name = credits.map((c) => c.artist.name + (c.joinphrase ?? "")).join("").trim();
  const primary = credits[0].artist;
  return { name: name || primary.name, mbid: primary.id ?? null };
}

function parseReleaseInfo(
  recording: MusicBrainzRecording,
): { releaseGroupMbid: string | null; releaseGroupTitle: string | null; releaseDate: string | null; country: string | null } {
  const releases = recording.releases ?? [];
  if (releases.length === 0) {
    return { releaseGroupMbid: null, releaseGroupTitle: null, releaseDate: null, country: null };
  }
  const first = releases[0];
  const rg = first["release-group"];
  return {
    releaseGroupMbid: rg?.id ?? null,
    releaseGroupTitle: rg?.title ?? null,
    releaseDate: first.date ?? null,
    country: first.country ?? null,
  };
}

export function parseRecording(recording: MusicBrainzRecording): ParsedMusicBrainzResult {
  const artist = parseArtist(recording);
  const releaseInfo = parseReleaseInfo(recording);
  const tags = (recording.tags ?? []).map((t) => t.name);

  return {
    mbid: recording.id,
    title: recording.title,
    artistName: artist.name,
    artistMbid: artist.mbid,
    releaseGroupMbid: releaseInfo.releaseGroupMbid,
    releaseGroupTitle: releaseInfo.releaseGroupTitle,
    releaseDate: releaseInfo.releaseDate,
    country: releaseInfo.country,
    tags,
  };
}

async function musicbrainzFetch(path: string): Promise<Response> {
  // Dynamic import to avoid bundling rate limiter into client code
  const { checkRateLimit } = await import("./rate-limiter");
  const allowed = await checkRateLimit("musicbrainz", 1, 1);
  if (!allowed) {
    throw new Error("MusicBrainz rate limit exceeded — wait 1 second and retry.");
  }

  const url = `${MUSICBRAINZ_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (res.status === 503) {
    throw new Error("MusicBrainz is temporarily unavailable (503).");
  }

  return res;
}

export async function searchRecordings(
  query: string,
  limit = 8,
  inc = "artists+tags+releases+genres",
): Promise<ParsedMusicBrainzResult[]> {
  const res = await musicbrainzFetch(
    `/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&inc=${encodeURIComponent(inc)}`,
  );
  if (!res.ok) {
    console.error("[musicbrainz search] error", res.status, res.statusText);
    return [];
  }
  const data = (await res.json()) as MusicBrainzSearchResponse;
  return (data.recordings ?? []).map(parseRecording);
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
