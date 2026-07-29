/**
 * Backfill: download artwork from Genius CDN, upload to Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/backfill-artwork.ts           # Run backfill
 *   npx tsx scripts/backfill-artwork.ts --dry-run # Preview only
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const GENIUS_CDN = "images.genius.com";
const PROGRESS_FILE = path.join(import.meta.dirname ?? ".", ".backfill-progress.json");
const MAPPING_FILE = path.join(import.meta.dirname ?? ".", "artwork-url-mapping.json");

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

type UrlMapping = Record<string, string>;

// ── Helpers ───────────────────────────────────────────────────────────────

function ext(type: string | null): string {
  if (!type) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

async function upload(url: string, table: string, id: string): Promise<string | null> {
  const r = await fetch(url);
  if (!r.ok) return null;
  const ct = r.headers.get("content-type") ?? "image/jpeg";
  const buf = await r.arrayBuffer();
  const spath = `${table}/${id}.${ext(ct)}`;
  const { data } = await supabase.storage.from("artwork").upload(spath, buf, { contentType: ct, upsert: true });
  if (!data) return null;
  const { data: pub } = supabase.storage.from("artwork").getPublicUrl(spath);
  return pub.publicUrl;
}

function loadMapping(): UrlMapping {
  try { return JSON.parse(fs.readFileSync(MAPPING_FILE, "utf-8")); } catch { return {}; }
}
function saveMapping(m: UrlMapping) {
  const t = MAPPING_FILE + ".tmp";
  fs.writeFileSync(t, JSON.stringify(m, null, 2));
  fs.renameSync(t, MAPPING_FILE);
}

interface Progress { phase: string; idx: number; done: number; fail: number; }
function loadProgress(): Progress | null {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")); } catch { return null; }
}
function saveProgress(p: Progress) {
  const t = PROGRESS_FILE + ".tmp";
  fs.writeFileSync(t, JSON.stringify(p));
  fs.renameSync(t, PROGRESS_FILE);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const mapping = loadMapping();
  let pg = loadProgress() ?? { phase: "albums", idx: 0, done: 0, fail: 0 };
  let totalDone = pg.done, totalFail = pg.fail;

  console.log(DRY_RUN ? "🔍 DRY RUN\n" : "🖼️  Artwork backfill\n");

  // ── Phase 0: Dry-run ──
  if (DRY_RUN) {
    const { data: rgs } = await supabase.from("release_groups").select("id, title, image_url")
      .eq("primary_type", "Album").not("image_url", "is", null).ilike("image_url", `%${GENIUS_CDN}%`);
    const { data: artists } = await supabase.from("artists").select("id")
      .not("image_url", "is", null).ilike("image_url", `%${GENIUS_CDN}%`);
    const { count: songCount } = await supabase.from("songs").select("id", { count: "exact", head: true })
      .not("genius_thumbnail_url", "is", null).ilike("genius_thumbnail_url", `%${GENIUS_CDN}%`);

    // Count non-album songs
    const albumRgIds = (rgs ?? []).map(r => r.id);
    let nonAlbumCount = 0;
    if (albumRgIds.length > 0) {
      const { data: albumSongs } = await supabase.from("songs").select("id")
        .in("release_group_id", albumRgIds);
      const albumSongIds = new Set((albumSongs ?? []).map(s => s.id));
      const { data: allSongs } = await supabase.from("songs").select("id, release_group_id")
        .not("genius_thumbnail_url", "is", null).ilike("genius_thumbnail_url", `%${GENIUS_CDN}%`);
      nonAlbumCount = (allSongs ?? []).filter(s => !albumSongIds.has(s.id)).length;
    }

    console.log(`  Albums: ${rgs?.length ?? 0} (will dedup all tracks into one image each)`);
    console.log(`  Artists: ${artists?.length ?? 0}`);
    console.log(`  Non-Album songs: ${nonAlbumCount}`);
    console.log(`  Total uploads: ~${(rgs?.length ?? 0) + (artists?.length ?? 0) + nonAlbumCount}`);
    console.log(`  Est. storage: ~${Math.ceil(((rgs?.length ?? 0) + (artists?.length ?? 0) + nonAlbumCount) * 0.05)} MB\n`);
    return;
  }

  // ── Phase 1: Album release groups ──
  if (pg.phase === "albums") {
    const { data: rgs } = await supabase.from("release_groups").select("id, title, image_url")
      .eq("primary_type", "Album").not("image_url", "is", null).ilike("image_url", `%${GENIUS_CDN}%`);
    if (!rgs) return;

    for (let i = pg.idx; i < rgs.length; i++) {
      const rg = rgs[i];
      try {
        let newUrl = mapping[rg.image_url];
        if (!newUrl) {
          newUrl = await upload(rg.image_url, "release-groups", rg.id);
          if (newUrl) mapping[rg.image_url] = newUrl;
        }

        if (newUrl) {
          // Update release group
          const { error: e1 } = await supabase.from("release_groups").update({ image_url: newUrl }).eq("id", rg.id);
          // Bulk-update child songs
          const { count } = await supabase.from("songs").select("id", { count: "exact", head: true }).eq("release_group_id", rg.id);
          const { error: e2 } = await supabase.from("songs").update({ genius_thumbnail_url: newUrl }).eq("release_group_id", rg.id);

          if (!e1 && !e2) {
            totalDone += 1 + (count ?? 0);
            console.log(`  ✅ ${rg.title}: ${count ?? 0} tracks → deduped`);
          } else {
            totalFail++;
            console.error(`  ❌ ${rg.title}: update failed`);
          }
        } else { totalFail++; console.error(`  ❌ ${rg.title}: upload failed`); }
      } catch (err) { totalFail++; console.error(`  ❌ ${rg.title}: ${(err as Error).message}`); }

      pg.idx = i + 1; pg.done = totalDone; pg.fail = totalFail;
      if ((i + 1) % 25 === 0) { saveProgress(pg); saveMapping(mapping); }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // ── Phase 2: Artists ──
  pg = { phase: "artists", idx: 0, done: totalDone, fail: totalFail };
  {
    const { data: rows } = await supabase.from("artists").select("id, image_url").not("image_url", "is", null).ilike("image_url", `%${GENIUS_CDN}%`);
    if (rows) {
      for (let i = pg.idx; i < rows.length; i++) {
        const a = rows[i];
        try {
          let newUrl = mapping[a.image_url];
          if (!newUrl) { newUrl = await upload(a.image_url, "artists", a.id); if (newUrl) mapping[a.image_url] = newUrl; }
          if (newUrl) {
            const { error } = await supabase.from("artists").update({ image_url: newUrl }).eq("id", a.id);
            if (!error) totalDone++; else totalFail++;
          } else totalFail++;
        } catch { totalFail++; }
        pg.idx = i + 1; pg.done = totalDone; pg.fail = totalFail;
        if ((i + 1) % 25 === 0) saveProgress(pg);
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  // ── Phase 3: Non-Album songs ──
  pg = { phase: "songs", idx: 0, done: totalDone, fail: totalFail };
  {
    // Get Album RG IDs to skip their child songs
    const { data: albumRgs } = await supabase.from("release_groups").select("id").eq("primary_type", "Album");
    const albumIds = new Set((albumRgs ?? []).map(r => r.id));
    const { data: rows } = await supabase.from("songs").select("id, genius_thumbnail_url, release_group_id").not("genius_thumbnail_url", "is", null).ilike("genius_thumbnail_url", `%${GENIUS_CDN}%`);
    const songs = (rows ?? []).filter(s => !s.release_group_id || !albumIds.has(s.release_group_id));

    for (let i = pg.idx; i < songs.length; i++) {
      const s = songs[i];
      try {
        let newUrl = mapping[s.genius_thumbnail_url];
        if (!newUrl) { newUrl = await upload(s.genius_thumbnail_url, "songs", s.id); if (newUrl) mapping[s.genius_thumbnail_url] = newUrl; }
        if (newUrl) {
          const { error } = await supabase.from("songs").update({ genius_thumbnail_url: newUrl }).eq("id", s.id);
          if (!error) totalDone++; else totalFail++;
        } else totalFail++;
      } catch { totalFail++; }
      pg.idx = i + 1; pg.done = totalDone; pg.fail = totalFail;
      if ((i + 1) % 25 === 0) saveProgress(pg);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  saveMapping(mapping);
  try { fs.unlinkSync(PROGRESS_FILE); } catch {}

  console.log(`\n✅ Done. Processed: ${totalDone}, Failed: ${totalFail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
