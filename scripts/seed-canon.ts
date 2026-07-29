/**
 * Seed script: imports 8,000-12,000 Indian + English songs
 * from MusicBrainz + Genius into the songs DB.
 *
 * Usage: npx tsx scripts/seed-canon.ts [--bucket=<name>] [--dry-run]
 *
 * Uses a separate rate-limit key ("musicbrainz_seed") so it
 * doesn't block live user traffic.
 *
 * Progress saved to seed_progress.json for resume-ability.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { SEED_BUCKETS, type SeedArtist } from "./seed-config";
import { uploadArtworkFromUrl } from "../src/lib/storage";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

if (!URL || !KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "drawnto/1.0 seed-canon (drawnTo.fm)";
const PROGRESS_FILE = resolve(import.meta.dirname, "../seed_progress.json");

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BUCKET_FILTER = args
  .find((a) => a.startsWith("--bucket="))
  ?.split("=")[1];
const REQ_DELAY_MS = 1100; // MB: 1 req/sec with safety margin
const BATCH_SIZE = 50; // DB upsert batch size
const MAX_RECORDINGS_PER_ARTIST = args.includes("--fast") ? 10 : args.find(a => a.startsWith("--max=")) ? parseInt(args.find(a => a.startsWith("--max="))?.split("=")[1] ?? "150") : 150;

interface Progress {
  bucketIndex: number;
  artistIndex: number;
  songsImported: number;
  songsSkipped: number;
  errors: string[];
  startedAt: string;
  updatedAt: string;
}

interface SeedStats {
  totalArtists: number;
  completedArtists: number;
  songsImported: number;
  songsSkipped: number;
  songsExisting: number;
  errors: string[];
  perBucket: Record<string, { imported: number; skipped: number }>;
}

let stats: SeedStats = {
  totalArtists: 0,
  completedArtists: 0,
  songsImported: 0,
  songsSkipped: 0,
  songsExisting: 0,
  errors: [],
  perBucket: {},
};

function loadProgress(): Progress | null {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function saveProgress(p: Progress) {
  p.updatedAt = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function saveReport() {
  writeFileSync(
    resolve(import.meta.dirname, "../seed_report.json"),
    JSON.stringify(stats, null, 2),
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function musicbrainzFetch(path: string): Promise<Response> {
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

interface MBArtist {
  id: string;
  name: string;
}

interface MBRecording {
  id: string;
  title: string;
  "artist-credit"?: Array<{
    artist: { id: string; name: string };
    joinphrase?: string;
  }>;
  releases?: Array<{
    id: string;
    title: string;
    date?: string;
    country?: string;
    status?: string;
    "release-group"?: { id: string; title: string };
  }>;
}

async function resolveArtistMbid(artistName: string): Promise<string | null> {
  const res = await musicbrainzFetch(
    `/artist?query=${encodeURIComponent(artistName)}&limit=1&fmt=json`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { artists?: MBArtist[] };
  return data.artists?.[0]?.id ?? null;
}

async function fetchArtistRecordings(
  mbid: string,
  offset = 0,
): Promise<MBRecording[]> {
  // Use recording search (not browse) because browse doesn't accept inc=releases
  const res = await musicbrainzFetch(
    `/recording?query=arid:${encodeURIComponent(mbid)}&limit=100&offset=${offset}&fmt=json&inc=releases`,
  );
  if (!res.ok) {
    console.log(`    [warn] MB search returned ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { recordings?: MBRecording[]; count?: number };
  return data.recordings ?? [];
}

async function searchGeniusArtwork(
  artistName: string,
  songTitle: string,
): Promise<{ thumbnailUrl: string | null; geniusSongId: string | null; geniusArtistId: string | null; artistImageUrl: string | null }> {
  if (!GENIUS_TOKEN) return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };

  try {
    const res = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(`${songTitle} ${artistName}`)}`,
      { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` } },
    );
    if (!res.ok) return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };
    const data = (await res.json()) as any;
    const hits: any[] = data.response?.hits ?? [];
    for (const h of hits) {
      const r = h.result;
      const thumb = r.song_art_image_thumbnail_url ?? r.header_image_thumbnail_url ?? null;
      if (thumb) {
        return {
          thumbnailUrl: thumb,
          geniusSongId: String(r.id),
          geniusArtistId: r.primary_artist?.id ? String(r.primary_artist.id) : null,
          artistImageUrl: r.primary_artist?.image_url ?? r.primary_artist?.header_image_url ?? null,
        };
      }
    }
  } catch {}
  return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };
}

function eraFromDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return null;
  if (year < 1970) return "60s";
  if (year < 1980) return "70s";
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

async function importRecording(
  recording: MBRecording,
  artist: SeedArtist,
  rgPrimaryType?: string | null,
): Promise<"imported" | "existing" | "skipped" | "error"> {
  const mbid = recording.id;
  const title = recording.title;
  const credits = recording["artist-credit"] ?? [];
  const artistName = credits
    .map((c) => c.artist.name + (c.joinphrase ?? ""))
    .join("")
    .trim() || artist.name;

  const releases = recording.releases ?? [];
  // Pick best release by status preference
  const bestRelease = releases.sort((a, b) => {
    const scoreA = (a.status === "official" ? 3 : a.status === "promotion" ? 2 : 1);
    const scoreB = (b.status === "official" ? 3 : b.status === "promotion" ? 2 : 1);
    return scoreB - scoreA;
  })[0];

  const releaseDate = bestRelease?.date
    ?.slice(0, 10)
    .replace(/^(\d{4})$/, "$1-01-01")
    .replace(/^(\d{4}-\d{2})$/, "$1-01") ?? null;

  const releaseGroupMbid = bestRelease?.["release-group"]?.id ?? null;
  const releaseGroupTitle = bestRelease?.["release-group"]?.title ?? null;

  // Check if song already exists by MBID
  const { data: existing } = await supabase
    .from("songs")
    .select("id")
    .eq("musicbrainz_id", mbid)
    .maybeSingle();

  if (existing) return "existing";

  // Upsert individual artists from MusicBrainz credits
  let dbArtistId: string | null = null;
  let creditResults: { artistId: string; position: number; joinPhrase: string }[] = [];

  if (credits.length > 0) {
    for (let i = 0; i < credits.length; i++) {
      const c = credits[i];
      const cName = c.artist.name.trim();
      if (!cName) continue;
      const cMbid = c.artist.id || null;
      const cSlug = cName.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80);
      const joinPhrase = c.joinphrase ?? "";

      const { data: art } = await supabase
        .from("artists")
        .upsert({ name: cName, slug: cSlug, musicbrainz_id: cMbid }, { onConflict: "musicbrainz_id" })
        .select("id")
        .single();

      let artId = art?.id;
      if (!artId && cMbid) {
        const { data: refetched } = await supabase
          .from("artists")
          .select("id")
          .eq("musicbrainz_id", cMbid)
          .single();
        artId = refetched?.id;
      }

      if (artId) {
        creditResults.push({ artistId: artId, position: i, joinPhrase });
        if (i === 0) dbArtistId = artId;
      }
    }
  }

  // Fallback: no credits, use seed artist name
  if (!dbArtistId) {
    const slug = artistName
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 80);
    const { data: fallback } = await supabase
      .from("artists")
      .upsert(
        { name: artistName, slug, musicbrainz_id: credits[0]?.artist.id ?? null },
        { onConflict: "musicbrainz_id" },
      )
      .select("id")
      .single();
    dbArtistId = fallback?.id ?? null;
  }

  if (!dbArtistId) {
    console.warn(`  [skip] No artist id for "${artistName}"`);
    return "skipped";
  }

  // Cross-MBID duplicate check
  const { data: dupTitle } = await supabase
    .from("songs")
    .select("id")
    .eq("artist_id", dbArtistId)
    .ilike("title", title)
    .maybeSingle();

  if (dupTitle) return "existing";

  // Genius artwork — upload to Supabase Storage
  const genius = await searchGeniusArtwork(artistName, title);
  let artworkUrl: string | null = null;
  if (genius.thumbnailUrl) {
    if (rgPrimaryType === "Album" && releaseGroupMbid) {
      artworkUrl = await uploadArtworkFromUrl(supabase, genius.thumbnailUrl, `release-groups/${releaseGroupMbid}.jpg`);
    } else {
      artworkUrl = await uploadArtworkFromUrl(supabase, genius.thumbnailUrl, `songs/${mbid}.jpg`);
    }
    if (!artworkUrl) artworkUrl = genius.thumbnailUrl; // fallback to Genius CDN
  }

  // Era from release date
  const era = eraFromDate(releaseDate);

  // Upsert release group
  let releaseGroupDbId: string | null = null;
  if (releaseGroupMbid) {
    const rgSlug =
      (releaseGroupTitle || title)
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .slice(0, 80) +
      "-" +
      crypto.randomUUID().split("-")[0];
    const rgRow: Record<string, any> = {
      musicbrainz_id: releaseGroupMbid,
      title: releaseGroupTitle || title,
      slug: rgSlug,
      artist_id: dbArtistId,
      primary_type: rgPrimaryType ?? null,
      release_date: releaseDate,
    };
    if (artworkUrl) rgRow.image_url = artworkUrl;

    const { data: rg } = await supabase
      .from("release_groups")
      .upsert(rgRow, { onConflict: "musicbrainz_id" })
      .select("id")
      .single();
    releaseGroupDbId = rg?.id ?? null;
  }

  // Upsert song
  const songSlug =
    title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 80) +
    "-" +
    crypto.randomUUID().split("-")[0];

  const songRow: Record<string, any> = {
    title,
    slug: songSlug,
    musicbrainz_id: mbid,
    artist_id: dbArtistId,
    genius_thumbnail_url: artworkUrl,
    genius_song_id: genius.geniusSongId,
    genre_tags: [],
    credits: credits.length > 0 ? credits : null,
    release_group_mbid: releaseGroupMbid,
    release_group_id: releaseGroupDbId,
    country: bestRelease?.country ?? null,
    release_date: releaseDate,
    language: artist.seedLanguage,
    era,
    source_type: "canon",
  };

  const { error: songErr } = await supabase
    .from("songs")
    .upsert(songRow, { onConflict: "musicbrainz_id" });

  if (songErr) {
    console.error(`  [error] Upsert failed for "${title}":`, songErr.message);
    return "error";
  }

  // Populate song_artists junction table
  if (creditResults.length > 0) {
    const { data: songData } = await supabase
      .from("songs")
      .select("id")
      .eq("musicbrainz_id", mbid)
      .maybeSingle();

    if (songData?.id) {
      await supabase.from("song_artists").upsert(
        creditResults.map((cr) => ({
          song_id: songData.id,
          artist_id: cr.artistId,
          position: cr.position,
          join_phrase: cr.joinPhrase,
        })),
        { onConflict: "song_id,artist_id" },
      );
    }
  }

  return "imported";
}

async function seedArtist(artist: SeedArtist): Promise<{ imported: number; existing: number; skipped: number; errors: number }> {
  const result = { imported: 0, existing: 0, skipped: 0, errors: 0 };

  // Resolve MBID
  let mbid = artist.mbid;
  if (!mbid) {
    mbid = await resolveArtistMbid(artist.name);
    if (!mbid) {
      console.warn(`  [skip] Could not resolve MBID for "${artist.name}"`);
      result.skipped++;
      return result;
    }
    await sleep(REQ_DELAY_MS);
  }

  // Fetch recordings (paginated)
  let recordings: MBRecording[] = [];
  let offset = 0;
  while (offset < 500) {
    const batch = await fetchArtistRecordings(mbid, offset);
    if (batch.length === 0) break;
    recordings.push(...batch);
    offset += 100;
    await sleep(REQ_DELAY_MS);
  }

  // Sort by release date (newest first) and trim to top 150
  recordings.sort((a, b) => {
    const dateA = a.releases?.[0]?.date ?? "0000";
    const dateB = b.releases?.[0]?.date ?? "0000";
    return dateB.localeCompare(dateA);
  });

  const topRecordings = recordings.slice(0, MAX_RECORDINGS_PER_ARTIST);
  console.log(`  Fetched ${recordings.length} recordings, importing top ${topRecordings.length}`);

  // Build track-count per release group (for primary_type heuristic)
  const rgTrackCounts = new Map<string, number>();
  for (const r of topRecordings) {
    for (const rel of r.releases ?? []) {
      const rgId = rel["release-group"]?.id;
      if (rgId) rgTrackCounts.set(rgId, (rgTrackCounts.get(rgId) ?? 0) + 1);
    }
  }

  for (let i = 0; i < topRecordings.length; i++) {
    const rec = topRecordings[i];

    // Skip very long or very short titles (likely data errors)
    if (!rec.title || rec.title.length < 1 || rec.title.length > 300) {
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] Would import: "${rec.title}" (${rec.id})`);
      result.imported++;
      continue;
    }

    const bestRelease = rec.releases?.sort((a, b) => {
      const scoreA = (a.status === "official" ? 3 : a.status === "promotion" ? 2 : 1);
      const scoreB = (b.status === "official" ? 3 : b.status === "promotion" ? 2 : 1);
      return scoreB - scoreA;
    })[0];
    const rgMbid = bestRelease?.["release-group"]?.id;
    const rgPrimaryType = rgMbid && (rgTrackCounts.get(rgMbid) ?? 0) >= 5 ? "Album" : null;

    const status = await importRecording(rec, artist, rgPrimaryType);
    switch (status) {
      case "imported":
        result.imported++;
        break;
      case "existing":
        result.existing++;
        break;
      case "skipped":
        result.skipped++;
        break;
      case "error":
        result.errors++;
        break;
    }

    // Progress indicator
    if ((i + 1) % 25 === 0) {
      console.log(`    ... ${i + 1}/${topRecordings.length} (${result.imported} imported, ${result.existing} existing, ${result.skipped} skipped)`);
    }

    // MB rate limit
    await sleep(REQ_DELAY_MS);
  }

  return result;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Seed Canon — Indian Music Data Pipeline  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  if (!GENIUS_TOKEN) {
    console.log("⚠️  GENIUS_ACCESS_TOKEN not set — songs will import without artwork\n");
  }

  // Load progress for resume
  const progress = loadProgress();
  const startBucketIdx = progress?.bucketIndex ?? 0;
  const startArtistIdx = progress?.artistIndex ?? 0;

  if (progress) {
    console.log(`📋 Resuming from: bucket ${startBucketIdx + 1}, artist ${startArtistIdx + 1}`);
    stats.songsImported = progress.songsImported ?? 0;
    stats.songsSkipped = progress.songsSkipped ?? 0;
  }

  // Filter buckets if --bucket flag
  const buckets = BUCKET_FILTER
    ? SEED_BUCKETS.filter((b) => b.name.toLowerCase().includes(BUCKET_FILTER.toLowerCase()))
    : SEED_BUCKETS;

  if (BUCKET_FILTER) {
    console.log(`🎯 Filtered to bucket: "${BUCKET_FILTER}" (${buckets.length} match)\n`);
  }

  stats.totalArtists = buckets.reduce((sum, b) => sum + b.artists.length, 0);

  const startedAt = progress?.startedAt ?? new Date().toISOString();

  for (let bi = startBucketIdx; bi < buckets.length; bi++) {
    const bucket = buckets[bi];
    console.log(`\n📀 Bucket: ${bucket.name} (${bucket.artists.length} artists)`);

    if (!stats.perBucket[bucket.name]) {
      stats.perBucket[bucket.name] = { imported: 0, skipped: 0 };
    }

    const startAi = bi === startBucketIdx ? startArtistIdx : 0;

    for (let ai = startAi; ai < bucket.artists.length; ai++) {
      const artist = bucket.artists[ai];
      console.log(`  🎤 [${ai + 1}/${bucket.artists.length}] ${artist.name} (${artist.seedLanguage.join(", ")})`);

      const result = await seedArtist(artist);

      stats.songsImported += result.imported;
      stats.songsExisting += result.existing;
      stats.songsSkipped += result.skipped;
      stats.completedArtists++;
      stats.perBucket[bucket.name].imported += result.imported;
      stats.perBucket[bucket.name].skipped += result.skipped + result.existing;

      console.log(`    ✅ ${result.imported} imported, ${result.existing} existing, ${result.skipped} skipped`);

      // Save progress after each artist
      saveProgress({
        bucketIndex: bi,
        artistIndex: ai + 1 < bucket.artists.length ? ai + 1 : 0,
        songsImported: stats.songsImported,
        songsSkipped: stats.songsSkipped,
        errors: stats.errors,
        startedAt,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Final report
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║            SEED COMPLETE                  ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`🎵 Total songs imported:  ${stats.songsImported}`);
  console.log(`📋 Already existing:      ${stats.songsExisting}`);
  console.log(`⏭️  Skipped:               ${stats.songsSkipped}`);
  console.log(`🎤 Artists processed:      ${stats.completedArtists} / ${stats.totalArtists}\n`);

  console.log("Per bucket:");
  for (const [name, counts] of Object.entries(stats.perBucket)) {
    console.log(`  ${name}: ${counts.imported} imported, ${counts.skipped} existing/skipped`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors during seed:`);
    stats.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
  }

  saveReport();
  console.log("\n📄 Full report saved to seed_report.json");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
