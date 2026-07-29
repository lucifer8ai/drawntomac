/**
 * Single-artist importer: fetches all albums from MusicBrainz,
 * picks the explicit version (not clean, not hi-res), and imports
 * every track. If multiple explicit versions exist, picks one.
 *
 * Usage: npx tsx scripts/import-artist.ts "Artist Name" --lang=Hindi,English --bucket="bucket-name"
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync } from "fs";
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
const USER_AGENT = "drawnto/1.0 import-artist (drawnTo.fm)";
const REQ_DELAY_MS = 1100;

const args = process.argv.slice(2);
const ARTIST_NAME = args[0];
const LANGUAGES = (args.find(a => a.startsWith("--lang="))?.split("=")[1] ?? "English").split(",").map(s => s.trim());
const BUCKET = args.find(a => a.startsWith("--bucket="))?.split("=")[1] ?? "manual";
const FORCE_MBID = args.find(a => a.startsWith("--mbid="))?.split("=")[1];

if (!ARTIST_NAME) {
  console.error("Usage: npx tsx scripts/import-artist.ts \"Artist Name\" --lang=Hindi --bucket=bollywood\n");
  console.error("  --lang=   comma-separated language codes (default: English)");
  console.error("  --bucket= label for reporting (default: manual)");
  process.exit(1);
}

interface MBRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  disambiguation?: string;
  "release-group"?: { id: string; title: string; "primary-type"?: string };
  media?: Array<{ tracks?: Array<{ id: string; title: string; position?: number; length?: number }> }>;
}

interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "first-release-date"?: string;
  releases?: MBRelease[];
}

interface MBArtist { id: string; name: string; }

interface MBTrack {
  id: string;
  title: string;
  position?: number;
  length?: number;
  "artist-credit"?: Array<{
    artist: { id: string; name: string };
    joinphrase?: string;
  }>;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function mbFetch(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    return await fetch(`${MUSICBRAINZ_BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
  } finally { clearTimeout(timer); }
}

function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // YYYY-MM
  const ym = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  // YYYY
  const y = trimmed.match(/^(\d{4})$/);
  if (y) return `${y[1]}-01-01`;
  return null;
}

function parseDisambiguation(str: string | undefined | null) {
  if (!str) return { explicit: false, clean: false, hiRes: false };
  const lower = str.toLowerCase().trim();
  return {
    explicit: /\[explicit\]/i.test(lower),
    clean: /\[clean\]/i.test(lower),
    hiRes: /24-bit/i.test(lower),
  };
}

async function resolveArtist(name: string): Promise<{ id: string; name: string } | null> {
  const res = await mbFetch(`/artist?query=${encodeURIComponent(name)}&limit=1&fmt=json`);
  if (!res.ok) return null;
  const data = (await res.json()) as { artists?: MBArtist[] };
  return data.artists?.[0] ?? null;
}

async function fetchReleaseGroups(mbid: string, limit = 100, offset = 0): Promise<MBReleaseGroup[]> {
  // Use search (not browse) because browse doesn't accept inc=releases
  const res = await mbFetch(
    `/release-group?query=arid:${encodeURIComponent(mbid)}&limit=${limit}&offset=${offset}&fmt=json&inc=releases`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { "release-groups"?: MBReleaseGroup[] };
  return data["release-groups"] ?? [];
}

async function fetchReleaseTracks(releaseId: string): Promise<MBTrack[]> {
  const res = await mbFetch(`/release/${releaseId}?inc=recordings+artist-credits&fmt=json`);
  if (!res.ok) return [];
  const data = (await res.json()) as { media?: Array<{ tracks?: MBTrack[] }> };
  const tracks: MBTrack[] = [];
  for (const media of data.media ?? []) {
    for (const t of media.tracks ?? []) {
      tracks.push(t);
    }
  }
  return tracks;
}

/**
 * Pick the best release from a group. Rules:
 * - Prefer explicit (not clean, not hi-res)
 * - If multiple explicit exist, pick the one with the latest date
 * - If no explicit, prefer official > promotion > bootleg
 * - If only one release, just take it
 */
function pickBestRelease(releases: MBRelease[]): MBRelease | null {
  if (releases.length === 0) return null;
  if (releases.length === 1) return releases[0];

  const scored = releases.map(r => {
    const dis = parseDisambiguation(r.disambiguation);
    let score = 0;
    // Heavily prefer explicit (the user's rule)
    if (dis.explicit) score += 10;
    if (dis.clean) score -= 5;
    if (dis.hiRes) score -= 10;

    const status = (r.status ?? "").toLowerCase();
    if (status === "official") score += 2;
    else if (status === "promotion") score += 1;
    else if (status === "bootleg") score -= 2;

    // Prefer IN/US/GB releases
    const country = (r.country ?? "").toUpperCase();
    if (["IN", "US", "GB"].includes(country)) score += 1;

    const epoch = r.date ? new Date(r.date).getTime() / 1000 : 0;
    return { release: r, score, epoch };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Same score: prefer later date (breaking tie between multiple explicit)
    return b.epoch - a.epoch;
  });

  return scored[0].release;
}

async function searchGeniusArtwork(artistName: string, songTitle: string) {
  if (!GENIUS_TOKEN) return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(`${songTitle} ${artistName}`)}`,
      { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` }, signal: controller.signal },
    );
    clearTimeout(timer);
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
  } catch {
    // silently return empty on timeout or network error
  }
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

async function ensureArtist(mbArtist: MBArtist, geniusArtistId: string | null, geniusArtistImage: string | null): Promise<string | null> {
  // Check existing
  const { data: existing } = await supabase.from("artists").select("id").eq("musicbrainz_id", mbArtist.id).maybeSingle();
  if (existing?.id) {
    // Refresh image if we have new data
    if (geniusArtistId || geniusArtistImage) {
      await supabase.from("artists").update({
        genius_artist_id: geniusArtistId,
        image_url: geniusArtistImage,
      }).eq("id", existing.id);
    }
    return existing.id;
  }

  const slug = mbArtist.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80);
  const { data: created } = await supabase.from("artists").upsert({
    name: mbArtist.name,
    slug,
    musicbrainz_id: mbArtist.id,
    genius_artist_id: geniusArtistId,
    image_url: geniusArtistImage,
  }, { onConflict: "musicbrainz_id" }).select("id").single();

  return created?.id ?? null;
}

async function importAlbumTrack(
  track: MBTrack,
  artistId: string,
  artistName: string,
  releaseGroupId: string,
  releaseGroupTitle: string,
  releaseGroupMbid: string | null,
  releaseDate: string | null,
  releaseCountry: string | null,
  releaseGroupImageUrl: string | null,
  rgType: string | null,
) {
  const mbid = track.id;
  const title = track.title;
  if (!title || title.length > 300) return "skipped";

  // Already exists?
  const { data: existing } = await supabase.from("songs").select("id").eq("musicbrainz_id", mbid).maybeSingle();
  if (existing) return "existing";

  // Process track-level artist credits
  const trackCredits = track["artist-credit"] ?? [];
  let songArtistId = artistId;
  let creditResults: { artistId: string; position: number; joinPhrase: string }[] = [];

  if (trackCredits.length > 0) {
    for (let i = 0; i < trackCredits.length; i++) {
      const c = trackCredits[i];
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
        if (i === 0) songArtistId = artId;
      }
    }
  }

  // Cross-MBID dedup
  const { data: dup } = await supabase.from("songs").select("id").eq("artist_id", songArtistId).ilike("title", title).maybeSingle();
  if (dup) return "existing";

  // Genius artwork — upload to Supabase Storage
  const lookupArtistName = trackCredits.length > 0
    ? trackCredits.map(c => c.artist.name + (c.joinphrase ?? "")).join("").trim() || artistName
    : artistName;
  const genius = await searchGeniusArtwork(lookupArtistName, title);
  let artworkUrl: string | null = genius.thumbnailUrl;
  if (artworkUrl) {
    if (rgType === "Album" && releaseGroupMbid) {
      artworkUrl = await uploadArtworkFromUrl(supabase, artworkUrl, `release-groups/${releaseGroupMbid}.jpg`) ?? artworkUrl;
      if (artworkUrl && releaseGroupId) {
        // Also update the release group's image_url
        const { error: rgUpdateErr } = await supabase
          .from("release_groups")
          .update({ image_url: artworkUrl })
          .eq("id", releaseGroupId);
        if (rgUpdateErr) console.warn(`  [warn] Failed to update RG image: ${rgUpdateErr.message}`);
      }
    } else {
      artworkUrl = await uploadArtworkFromUrl(supabase, artworkUrl, `songs/${mbid}.jpg`) ?? artworkUrl;
    }
  }

  const songSlug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80) + "-" + crypto.randomUUID().split("-")[0];

  const { error } = await supabase.from("songs").upsert({
    title,
    slug: songSlug,
    musicbrainz_id: mbid,
    artist_id: songArtistId,
    genius_thumbnail_url: artworkUrl || releaseGroupImageUrl,
    genius_song_id: genius.geniusSongId,
    genre_tags: [],
    release_group_mbid: releaseGroupMbid,
    release_group_id: releaseGroupId,
    country: releaseCountry,
    release_date: releaseDate,
    track_number: track.position,
    language: LANGUAGES,
    era: eraFromDate(releaseDate),
    source_type: "canon",
    credits: trackCredits.length > 0 ? trackCredits : null,
  }, { onConflict: "musicbrainz_id" });

  if (error) {
    console.error(`    [error] "${title}": ${error.message}`);
    return "error";
  }

  // Populate song_artists
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

async function importArtist() {
  console.log(`\n🎤 ${ARTIST_NAME}  [${LANGUAGES.join(", ")}]`);

  // 1. Resolve MBID
  const mbArtist = FORCE_MBID ? { id: FORCE_MBID, name: ARTIST_NAME } : await resolveArtist(ARTIST_NAME);
  if (!mbArtist) {
    console.log("  ❌ Could not resolve artist on MusicBrainz");
    return { artist: ARTIST_NAME, albums: 0, tracks: 0, imported: 0, existing: 0, errors: 0 };
  }
  console.log(`  MBID: ${mbArtist.id}`);
  await sleep(REQ_DELAY_MS);

  // 2. Fetch all release groups (paginate via search)
  let allRGs: MBReleaseGroup[] = [];
  let offset = 0;
  while (offset < 1000) {
    const rgs = await fetchReleaseGroups(mbArtist.id, 100, offset);
    if (rgs.length === 0) break;
    allRGs.push(...rgs);
    offset += 100;
    console.log(`  Fetched ${allRGs.length} release groups...`);
    await sleep(REQ_DELAY_MS);
  }
  console.log(`  Release groups total: ${allRGs.length}`);

  let albumCount = 0;
  let totalImported = 0;
  let totalExisting = 0;
  let totalErrors = 0;
  let artistId: string | null = null;
  let globalGeniusArtistId: string | null = null;
  let globalGeniusImage: string | null = null;

  // 3. Process each release group
  for (const rg of allRGs) {
    const releases = rg.releases ?? [];
    if (releases.length === 0) continue;

    const pick = pickBestRelease(releases);
    if (!pick) continue;

    const isExplicit = parseDisambiguation(pick.disambiguation).explicit;
    const rgTitle = rg.title;
    const rgType = rg["primary-type"] ?? "unknown";

    console.log(`  📀 ${rgTitle} (${rgType}, ${releases.length} releases, explicit=${isExplicit}, picked=${pick.id})`);

    // Fetch tracks for this release
    await sleep(REQ_DELAY_MS);
    const tracks = await fetchReleaseTracks(pick.id);
    if (tracks.length === 0) {
      console.log(`    (no tracks)`);
      continue;
    }

    // Ensure artist in DB (lazy, first release with genius data)
    if (!artistId) {
      const genArt = await searchGeniusArtwork(ARTIST_NAME, tracks[0]?.title ?? "");
      globalGeniusArtistId = genArt.geniusArtistId;
      globalGeniusImage = genArt.artistImageUrl;
      artistId = await ensureArtist(mbArtist, globalGeniusArtistId, globalGeniusImage);
      if (!artistId) {
        console.log("  ❌ Could not create artist in DB");
        return { artist: ARTIST_NAME, albums: 0, tracks: 0, imported: 0, existing: 0, errors: 0 };
      }
      console.log(`  Artist ID: ${artistId}`);
      // Short delay after artist creation
      await sleep(REQ_DELAY_MS);
    }

    // Ensure release group in DB
    const rgSlug = rgTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80) + "-" + crypto.randomUUID().split("-")[0];
    let rgDbId: string | null = null;
    const { data: existingRg } = await supabase.from("release_groups").select("id").eq("musicbrainz_id", rg.id).maybeSingle();
    if (existingRg) {
      rgDbId = existingRg.id;
    } else {
      const { data: newRg } = await supabase.from("release_groups").upsert({
        musicbrainz_id: rg.id,
        title: rgTitle,
        slug: rgSlug,
        artist_id: artistId,
        primary_type: rgType,
        release_date: normalizeDate(pick.date),
      }, { onConflict: "musicbrainz_id" }).select("id").single();
      rgDbId = newRg?.id ?? null;
    }

    albumCount++;

    // Import tracks
    let albumImported = 0, albumExisting = 0, albumErrors = 0;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const releaseDate = normalizeDate(pick.date) ?? normalizeDate(rg["first-release-date"]?.slice(0, 10)) ?? null;

      const status = await importAlbumTrack(
        track, artistId, mbArtist.name, rgDbId!, rgTitle, rg.id,
        releaseDate, pick.country ?? null, null, rgType
      );

      if (status === "imported") albumImported++;
      else if (status === "existing") albumExisting++;
      else if (status === "error") albumErrors++;

      if ((i + 1) % 10 === 0) {
        console.log(`    ... ${i + 1}/${tracks.length} (${albumImported} imp, ${albumExisting} exist)`);
      }

      await sleep(REQ_DELAY_MS);
    }

    console.log(`    ✅ ${albumImported} imported, ${albumExisting} existing, ${albumErrors} errors`);
    totalImported += albumImported;
    totalExisting += albumExisting;
    totalErrors += albumErrors;
  }

  console.log(`\n  🎵 Total for ${ARTIST_NAME}: ${albumCount} albums, ${totalImported} new, ${totalExisting} existing, ${totalErrors} errors\n`);
  return { artist: ARTIST_NAME, albums: albumCount, tracks: totalImported + totalExisting, imported: totalImported, existing: totalExisting, errors: totalErrors };
}

importArtist().then(r => {
  console.log(JSON.stringify(r));
}).catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
