import { slugifyBase } from "./slugify";

export interface MusicBrainzArtistCredit {
  artist: { id: string | null; name: string };
  joinphrase?: string;
}

export interface ArtistCreditResult {
  artistId: string;
  position: number;
  joinPhrase: string;
}

interface SupabaseAdmin {
  from: (table: string) => any;
}

export async function upsertArtistsFromCredits(
  admin: SupabaseAdmin,
  credits: MusicBrainzArtistCredit[],
): Promise<ArtistCreditResult[]> {
  const results: ArtistCreditResult[] = [];

  for (let i = 0; i < credits.length; i++) {
    const credit = credits[i];
    const name = credit.artist.name.trim();
    if (!name) continue;
    const mbid = credit.artist.id || null;
    const slug = slugifyBase(name).slice(0, 80);
    const joinPhrase = credit.joinphrase ?? "";

    const { data: artist, error } = await admin
      .from("artists")
      .upsert(
        { name, slug, musicbrainz_id: mbid },
        { onConflict: "musicbrainz_id" },
      )
      .select("id")
      .single();

    if (error && error.code !== "23505") throw error;

    let artistId = artist?.id;
    if (!artistId && mbid) {
      const { data: refetched } = await admin
        .from("artists")
        .select("id")
        .eq("musicbrainz_id", mbid)
        .single();
      artistId = refetched?.id;
    }

    if (artistId) {
      results.push({ artistId, position: i, joinPhrase });
    }
  }

  return results;
}
