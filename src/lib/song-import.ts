import { getRecordingByMbid, type ParsedMusicBrainzResult, type MusicBrainzArtistCredit } from "./musicbrainz";
import { searchGeniusArtwork } from "./genius";
import { generateSlug, slugifyBase } from "./slugify";
import { upsertArtistsFromCredits, type ArtistCreditResult } from "./artist-credits";
import { uploadArtworkFromUrl } from "./storage";

export interface ImportSongInput {
  mbid: string;
  title: string;
  artistName: string;
  primaryArtistName?: string;
  artistMbid?: string | null;
  releaseGroupMbid?: string | null;
  releaseGroupTitle?: string | null;
  releaseGroupPrimaryType?: string | null;
  releaseDate?: string | null;
  artistCredits?: MusicBrainzArtistCredit[];
}

export interface ImportSongResult {
  slug: string;
  songId: string;
  status: "existing" | "imported" | "skipped";
}

interface SupabaseAdmin {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      upload: (path: string, fileBody: ArrayBuffer, options?: { contentType?: string; upsert?: boolean }) => Promise<{ data: any; error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
}

/**
 * Upsert an artist row. Returns the artist id.
 */
export async function upsertArtist(
  admin: SupabaseAdmin,
  params: {
    name: string;
    musicbrainzId: string | null;
    geniusArtistId: string | null;
    artistImageUrl: string | null;
  },
): Promise<string | null> {
  const slug = slugifyBase(params.name).slice(0, 80) || params.name;
  const { data: artist, error } = await admin
    .from("artists")
    .upsert(
      {
        name: params.name,
        slug,
        musicbrainz_id: params.musicbrainzId ?? null,
        genius_artist_id: params.geniusArtistId,
        image_url: params.artistImageUrl,
      },
      { onConflict: "musicbrainz_id" },
    )
    .select("id")
    .single();

  if (error && error.code !== "23505") throw error;

  if (artist?.id) return artist.id;

  // Re-fetch on empty result (ON CONFLICT with no returning row)
  if (params.musicbrainzId) {
    const { data: refetched } = await admin
      .from("artists")
      .select("id")
      .eq("musicbrainz_id", params.musicbrainzId)
      .single();
    return refetched?.id ?? null;
  }
  return null;
}

/**
 * Upsert a release group. Returns its id.
 */
export async function upsertReleaseGroup(
  admin: SupabaseAdmin,
  params: {
    musicbrainzId: string;
    title: string;
    artistId: string | null;
    imageUrl: string | null;
    releaseDate: string | null;
    primaryType?: string | null;
  },
): Promise<string | null> {
  const slug = generateSlug(params.title);
  const rgRow: Record<string, any> = {
    musicbrainz_id: params.musicbrainzId,
    title: params.title,
    slug,
    artist_id: params.artistId,
    primary_type: params.primaryType ?? null,
    release_date: params.releaseDate,
  };
  if (params.imageUrl) rgRow.image_url = params.imageUrl;

  const { data: rg } = await admin
    .from("release_groups")
    .upsert(rgRow, { onConflict: "musicbrainz_id" })
    .select("id")
    .single();
  return rg?.id ?? null;
}

/**
 * Check if a song with the same title and artist already exists
 * (cross-MBID dedup for remasters/alternate recordings).
 */
export async function findDuplicateSong(
  admin: SupabaseAdmin,
  title: string,
  artistId: string | null,
): Promise<string | null> {
  if (!artistId) return null;
  const { data } = await admin
    .from("songs")
    .select("id")
    .eq("artist_id", artistId)
    .ilike("title", title)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Upsert a song row. Returns the slug.
 */
export async function upsertSong(
  admin: SupabaseAdmin,
  params: {
    mbid: string;
    title: string;
    artistId: string | null;
    thumbnailUrl: string | null;
    geniusSongId: string | null;
    genreTags: string[];
    releaseGroupMbid: string | null;
    releaseGroupId: string | null;
    country: string | null;
    releaseDate: string | null;
    language?: string[];
    era?: string;
    sourceType?: string;
    credits?: MusicBrainzArtistCredit[] | null;
    creditResults?: ArtistCreditResult[] | null;
  },
): Promise<string> {
  const slug = generateSlug(params.title);
  const songRow: Record<string, any> = {
    title: params.title,
    slug,
    musicbrainz_id: params.mbid,
    artist_id: params.artistId,
    genius_thumbnail_url: params.thumbnailUrl,
    genius_song_id: params.geniusSongId,
    genre_tags: params.genreTags,
    credits: params.credits ?? null,
    release_group_mbid: params.releaseGroupMbid,
    release_group_id: params.releaseGroupId,
    country: params.country,
    release_date: params.releaseDate,
  };

  if (params.language) songRow.language = params.language;
  if (params.era) songRow.era = params.era;
  if (params.sourceType) songRow.source_type = params.sourceType;

  const { error } = await admin
    .from("songs")
    .upsert(songRow, { onConflict: "musicbrainz_id" });

  if (error) throw error;

  if (params.creditResults && params.creditResults.length > 0) {
    const songId = await getSongIdByMbid(admin, params.mbid);
    if (songId) {
      await admin.from("song_artists").upsert(
        params.creditResults.map((cr) => ({
          song_id: songId,
          artist_id: cr.artistId,
          position: cr.position,
          join_phrase: cr.joinPhrase,
        })),
        { onConflict: "song_id,artist_id" },
      );
    }
  }

  return slug;
}

async function getSongIdByMbid(admin: SupabaseAdmin, mbid: string): Promise<string | null> {
  const { data } = await admin
    .from("songs")
    .select("id")
    .eq("musicbrainz_id", mbid)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Full song import pipeline. Reuses MusicBrainz + Genius fetching, deduplication,
 * artist area gating, and upserts into all three tables.
 *
 * Extra params (language, era, sourceType) are for seed/bulk imports.
 * User imports from search pass nothing — existing behavior preserved.
 */
export async function importSong(
  admin: SupabaseAdmin,
  input: ImportSongInput,
  extra?: {
    language?: string[];
    era?: string;
    sourceType?: string;
    skipAreaCheck?: boolean;
    isArtistInAllowedArea?: (mbid: string | null, defaultAllow: boolean) => Promise<boolean>;
  },
): Promise<ImportSongResult> {
  // 1. Deduplication: check if song with same MBID already exists
  const { data: existing } = await admin
    .from("songs")
    .select("slug, id")
    .eq("musicbrainz_id", input.mbid)
    .maybeSingle();

  if (existing) {
    // Refresh artwork cheaply
    const geniusLookupName = input.primaryArtistName || input.artistName;
    const genius = await searchGeniusArtwork(geniusLookupName, input.title);
    let newUrl: string | null = null;
    if (genius.thumbnailUrl) {
      newUrl = await uploadArtworkFromUrl(admin, genius.thumbnailUrl, `songs/${input.mbid}.jpg`);
      if (!newUrl) newUrl = genius.thumbnailUrl;
    }
    if (genius.geniusSongId || newUrl) {
      await admin
        .from("songs")
        .update({
          genius_thumbnail_url: newUrl,
          genius_song_id: genius.geniusSongId,
        })
        .eq("musicbrainz_id", input.mbid);
    }
    return { slug: existing.slug, songId: existing.id, status: "existing" };
  }

  // 2. Parallel: fetch full metadata from MusicBrainz + Genius artwork
  const geniusLookupName = input.primaryArtistName || input.artistName;
  const [recording, genius] = await Promise.all([
    getRecordingByMbid(input.mbid).catch((err) => {
      console.warn(
        "[song-import] getRecordingByMbid failed, proceeding with search data:",
        (err as Error).message,
      );
      return null;
    }),
    searchGeniusArtwork(geniusLookupName, input.title),
  ]);

  const rawCoverUrl = genius.thumbnailUrl;
  const geniusSongId = genius.geniusSongId;
  const geniusArtistId = genius.geniusArtistId;

  // Upload artwork to Supabase Storage (instead of storing Genius CDN URL)
  let coverUrl: string | null = null;
  if (rawCoverUrl) {
    const isAlbum = input.releaseGroupPrimaryType === "Album";
    const rgMbid = recording?.releaseGroupMbid ?? input.releaseGroupMbid ?? null;
    if (isAlbum && rgMbid) {
      coverUrl = await uploadArtworkFromUrl(admin, rawCoverUrl, `release-groups/${rgMbid}.jpg`);
    } else {
      coverUrl = await uploadArtworkFromUrl(admin, rawCoverUrl, `songs/${input.mbid}.jpg`);
    }
    // Fall back to Genius CDN if upload fails
    if (!coverUrl) coverUrl = rawCoverUrl;
  }

  // 3. Artist area check (if not skipped)
  if (!extra?.skipAreaCheck && extra?.isArtistInAllowedArea) {
    const releaseCountry = recording?.country ?? null;
    const { ALLOWED_COUNTRIES } = await import("./musicbrainz");
    if (
      !releaseCountry ||
      !ALLOWED_COUNTRIES.includes(releaseCountry.toUpperCase())
    ) {
      const artistNameCheck = input.primaryArtistName || input.artistName;
      const { ALLOWED_ARTISTS } = await import("./musicbrainz");
      const isAllowedArtist = ALLOWED_ARTISTS.some(
        (a) => artistNameCheck.toLowerCase() === a.toLowerCase(),
      );
      if (!isAllowedArtist && input.artistMbid) {
        const allowed = await extra.isArtistInAllowedArea(input.artistMbid, true);
        if (!allowed) {
          return { slug: "", songId: "", status: "skipped" };
        }
      }
    }
  }

  // 4. Upsert individual artists from MusicBrainz credits
  const mbCredits = recording?.artistCredits ?? input.artistCredits ?? null;
  let creditResults: ArtistCreditResult[] = [];
  let artistId: string | null = null;

  if (mbCredits && mbCredits.length > 0) {
    creditResults = await upsertArtistsFromCredits(admin, mbCredits);
    artistId = creditResults[0]?.artistId ?? null;
  } else {
    // Fallback: single artist upsert
    artistId = await upsertArtist(admin, {
      name: input.artistName,
      musicbrainzId: input.artistMbid ?? null,
      geniusArtistId: geniusArtistId,
      artistImageUrl: genius.artistImageUrl,
    });
  }

  // 5. Cross-MBID duplicate check
  if (extra?.sourceType) {
    const dupId = await findDuplicateSong(admin, input.title, artistId);
    if (dupId) {
      return { slug: "", songId: dupId, status: "existing" };
    }
  }

  // 6. Upsert release group
  const releaseGroupMbid =
    recording?.releaseGroupMbid ?? input.releaseGroupMbid ?? null;
  let releaseGroupId: string | null = null;
  if (releaseGroupMbid) {
    const rgTitle = input.releaseGroupTitle || input.title;
    releaseGroupId = await upsertReleaseGroup(admin, {
      musicbrainzId: releaseGroupMbid,
      title: rgTitle,
      artistId,
      imageUrl: coverUrl,
      primaryType: input.releaseGroupPrimaryType ?? null,
      releaseDate: recording?.releaseDate ?? input.releaseDate ?? null,
    });
  }

  // 7. Upsert song (with credits JSONB + song_artists population)
  const slug = await upsertSong(admin, {
    mbid: input.mbid,
    title: input.title,
    artistId,
    thumbnailUrl: coverUrl,
    geniusSongId,
    genreTags: recording?.tags ?? [],
    releaseGroupMbid,
    releaseGroupId,
    country: recording?.country ?? null,
    releaseDate: recording?.releaseDate ?? input.releaseDate ?? null,
    language: extra?.language,
    era: extra?.era,
    sourceType: extra?.sourceType,
    credits: mbCredits,
    creditResults,
  });

  return { slug, songId: "", status: "imported" };
}
