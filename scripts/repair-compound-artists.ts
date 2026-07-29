/**
 * Repair compound artists: splits "Aitch & Ed Sheeran" into individual
 * artist rows and populates the song_artists junction table.
 *
 * Usage: npx tsx scripts/repair-compound-artists.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "drawnto/1.0 repair-compound-artists (drawnTo.fm)";
const REQ_DELAY_MS = 1100;
const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_FILE = resolve(import.meta.dirname, "../repair_report.json");

interface RepairReportEntry {
  songId: string;
  songTitle: string;
  oldArtistName: string;
  newArtists: string[];
  source: "musicbrainz" | "heuristic" | "skipped";
  error?: string;
}

interface RepairReport {
  dryRun: boolean;
  totalSongs: number;
  repaired: number;
  skipped: number;
  errors: number;
  orphanCompoundArtists: string[];
  entries: RepairReportEntry[];
}

const report: RepairReport = {
  dryRun: DRY_RUN,
  totalSongs: 0,
  repaired: 0,
  skipped: 0,
  errors: 0,
  orphanCompoundArtists: [],
  entries: [],
};

function slugifyBase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mbFetch(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${MUSICBRAINZ_BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMbRecording(mbid: string) {
  const res = await mbFetch(
    `/recording/${encodeURIComponent(mbid)}?fmt=json&inc=artists`,
  );
  if (!res.ok) return null;
  return res.json() as any;
}

function heuristicParseArtists(name: string): string[] {
  // Split by common delimiters: &, feat., ft., ×, with, vs., prod., comma
  const parts: string[] = [];
  let remaining = name;

  // Try split by delimiters first
  const delimiterPattern = /(.+?)\s+(?:&|feat\.|ft\.|×|with|vs\.|prod\.)\s+(.+)$/i;
  let match: RegExpExecArray | null;

  while ((match = delimiterPattern.exec(remaining)) !== null) {
    parts.unshift(match[2].trim());
    remaining = match[1].trim();
  }

  // Try comma-split remaining
  if (remaining.includes(", ")) {
    const commaParts = remaining.split(", ").map((s) => s.trim()).filter(Boolean);
    if (commaParts.length > 1) {
      parts.unshift(...commaParts);
      remaining = "";
    }
  }

  if (remaining) parts.unshift(remaining);

  return parts.reverse().filter((p) => p.length > 0);
}

async function upsertCreditArtist(name: string, mbid: string | null): Promise<string | null> {
  const slug = slugifyBase(name).slice(0, 80);
  if (DRY_RUN) return "dry-run-id";

  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .eq(mbid ? "musicbrainz_id" : "name", mbid ?? name)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: artist } = await supabase
    .from("artists")
    .upsert(
      { name, slug, musicbrainz_id: mbid },
      { onConflict: "musicbrainz_id" },
    )
    .select("id")
    .single();

  if (!artist?.id && mbid) {
    const { data: refetched } = await supabase
      .from("artists")
      .select("id")
      .eq("musicbrainz_id", mbid)
      .single();
    return refetched?.id ?? null;
  }

  return artist?.id ?? null;
}

async function repairSong(song: any): Promise<RepairReportEntry> {
  const songId = song.id;
  const songTitle = song.title;
  const artistName = song.artist?.name ?? "Unknown";
  const mbid = song.musicbrainz_id;

  const baseEntry: RepairReportEntry = {
    songId,
    songTitle,
    oldArtistName: artistName,
    newArtists: [],
    source: "skipped",
  };

  // Path 1: Has musicbrainz_id — fetch from API
  if (mbid) {
    const recording = await fetchMbRecording(mbid);
    await sleep(REQ_DELAY_MS);

    if (recording) {
      const credits = recording["artist-credit"] ?? [];
      if (credits.length === 0) {
        baseEntry.newArtists = [artistName];
        baseEntry.source = "skipped";
        return baseEntry;
      }

      const creditResults: { artistId: string; position: number; joinPhrase: string }[] = [];
      const artistNames: string[] = [];

      for (let i = 0; i < credits.length; i++) {
        const c = credits[i];
        const cName = c.artist.name.trim();
        if (!cName) continue;
        const cMbid = c.artist.id || null;
        const joinPhrase = c.joinphrase ?? "";

        const artId = await upsertCreditArtist(cName, cMbid);
        if (artId) {
          creditResults.push({ artistId: artId, position: i, joinPhrase });
          artistNames.push(cName);
        }
      }

      if (creditResults.length > 0) {
        // Delete existing song_artists
        if (!DRY_RUN) {
          await supabase.from("song_artists").delete().eq("song_id", songId);
          await supabase.from("song_artists").upsert(
            creditResults.map((cr) => ({
              song_id: songId,
              artist_id: cr.artistId,
              position: cr.position,
              join_phrase: cr.joinPhrase,
            })),
            { onConflict: "song_id,artist_id" },
          );

          // Update songs.artist_id to position-0
          await supabase
            .from("songs")
            .update({ artist_id: creditResults[0].artistId, credits: credits })
            .eq("id", songId);
        }

        return {
          ...baseEntry,
          newArtists: artistNames,
          source: "musicbrainz",
        };
      }

      baseEntry.newArtists = [artistName];
      return baseEntry;
    }

    // MB fetch failed, try heuristic
  }

  // Path 2: No MBID or MB fetch failed — heuristic parse
  const parsed = heuristicParseArtists(artistName);
  if (parsed.length <= 1) {
    baseEntry.newArtists = [artistName];
    return baseEntry;
  }

  const results: { artistId: string; position: number; joinPhrase: string }[] = [];
  const artistNames: string[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const artId = await upsertCreditArtist(parsed[i], null);
    if (artId) {
      results.push({ artistId: artId, position: i, joinPhrase: i < parsed.length - 1 ? ", " : "" });
      artistNames.push(parsed[i]);
    }
  }

  if (results.length > 1) {
    if (!DRY_RUN) {
      await supabase.from("song_artists").delete().eq("song_id", songId);
      await supabase.from("song_artists").upsert(
        results.map((cr) => ({
          song_id: songId,
          artist_id: cr.artistId,
          position: cr.position,
          join_phrase: cr.joinPhrase,
        })),
        { onConflict: "song_id,artist_id" },
      );

      await supabase
        .from("songs")
        .update({ artist_id: results[0].artistId })
        .eq("id", songId);
    }

    return {
      ...baseEntry,
      newArtists: artistNames,
      source: "heuristic",
    };
  }

  baseEntry.newArtists = [artistName];
  return baseEntry;
}

async function repairReleaseGroups() {
  console.log("\n🔧 Fixing release_groups artist_id...");

  // Find release_groups pointing to compound artists
  const { data: rgs } = await supabase
    .from("release_groups")
    .select("id, artist_id, artists:artist_id(name)")
    .not("artist_id", "is", null);

  if (!rgs) return;

  let fixed = 0;
  for (const rg of rgs) {
    const artistName = (rg.artists as any)?.name ?? "";
    if (!isCompoundName(artistName)) continue;

    // Look for individual version of this artist in song_artists
    const { data: mbs } = await supabase
      .from("song_artists")
      .select("artist_id, artists!song_artists_artist_id_fkey(name)")
      .eq("song_id", rg.id.startsWith) // won't work directly
      .limit(1);

    // Simpler: just find the primary artist for any song in this release group
    const { data: songs } = await supabase
      .from("songs")
      .select("artist_id, artists:artist_id(name)")
      .eq("release_group_id", rg.id)
      .limit(1);

    if (songs && songs.length > 0) {
      const primaryName = (songs[0].artists as any)?.name ?? "";
      if (!isCompoundName(primaryName)) {
        if (!DRY_RUN) {
          await supabase
            .from("release_groups")
            .update({ artist_id: songs[0].artist_id })
            .eq("id", rg.id);
        }
        fixed++;
        console.log(`  Fixed RG: ${artistName} → ${primaryName}`);
      }
    }
  }

  console.log(`  Release groups fixed: ${fixed}`);
}

function isCompoundName(name: string): boolean {
  return /(\s+&\s+|\s+feat\.\s+|\s+ft\.\s+|\s+×\s+|\s+with\s+|\s+vs\.\s+|\s+prod\.\s+|,\s+)/i.test(name);
}

async function findOrphanArtists() {
  console.log("\n🔍 Finding orphan compound artists...");

  const { data: artists } = await supabase
    .from("artists")
    .select("id, name");

  if (!artists) return;

  for (const a of artists) {
    if (!isCompoundName(a.name)) continue;

    // Check if any song still references this artist
    const { data: songRefs } = await supabase
      .from("songs")
      .select("id")
      .eq("artist_id", a.id)
      .limit(1);

    const { data: saRefs } = await supabase
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", a.id)
      .limit(1);

    const { data: rgRefs } = await supabase
      .from("release_groups")
      .select("id")
      .eq("artist_id", a.id)
      .limit(1);

    if (
      (!songRefs || songRefs.length === 0) &&
      (!saRefs || saRefs.length === 0) &&
      (!rgRefs || rgRefs.length === 0)
    ) {
      report.orphanCompoundArtists.push(`${a.name} (${a.id})`);
    }
  }

  console.log(`  Orphan compound artists: ${report.orphanCompoundArtists.length}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Repair Compound Artists                 ║");
  console.log(`║  ${DRY_RUN ? "DRY RUN — no writes" : "LIVE — will modify data"}          ║`);
  console.log("╚══════════════════════════════════════════╝\n");

  // Fetch all unique songs with artists
  const { data: songs, error } = await supabase
    .from("songs")
    .select("id, title, slug, musicbrainz_id, artist_id, artist:artists!songs_artist_id_fkey(name)")
    .order("created_at", { ascending: false });

  if (error || !songs) {
    console.error("Failed to fetch songs:", error?.message);
    process.exit(1);
  }

  report.totalSongs = songs.length;

  // Group: only repair songs where the artist name looks compound
  // or we want to populate song_artists with multi-credit data from MB
  const compoundCandidates = songs.filter(
    (s) => s.artist?.name && isCompoundName(s.artist.name),
  );
  const allWithMbid = songs.filter((s) => !!s.musicbrainz_id);

  console.log(`Total songs: ${songs.length}`);
  console.log(`Compound artist name songs: ${compoundCandidates.length}`);
  console.log(`Songs with MBID (can check for multi-credits): ${allWithMbid.length}\n`);

  // Process compound-candidate songs first, then all MBID songs for multi-credit check
  const toProcess = compoundCandidates.concat(
    allWithMbid.filter((s) => !compoundCandidates.some((c) => c.id === s.id)),
  );

  for (let i = 0; i < toProcess.length; i++) {
    const song = toProcess[i];
    const entry = await repairSong(song);

    if (entry.source !== "skipped" && entry.newArtists.length > 1) {
      report.repaired++;
      console.log(
        `[${report.repaired}] "${entry.songTitle}" | ${entry.oldArtistName} → ${entry.newArtists.join(", ")} (${entry.source})`,
      );
    } else if (entry.source === "skipped") {
      report.skipped++;
    }

    if (entry.error) report.errors++;

    report.entries.push(entry);

    if ((i + 1) % 20 === 0) {
      console.log(`  ... ${i + 1}/${toProcess.length} processed`);
    }
  }

  console.log(`\n📊 Progress: ${report.repaired} repaired, ${report.skipped} skipped, ${report.errors} errors`);

  await repairReleaseGroups();
  await findOrphanArtists();

  // Save report
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to repair_report.json`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
