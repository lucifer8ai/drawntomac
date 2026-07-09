import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getRecordingByMbid, type ParsedMusicBrainzResult, isArtistInAllowedArea, ALLOWED_COUNTRIES } from "@/lib/musicbrainz";
import { searchGeniusArtwork } from "@/lib/genius";
import { generateSlug, slugifyBase } from "@/lib/slugify";

const bodySchema = z.object({
  mbid: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
  primaryArtistName: z.string().optional(),
  artistMbid: z.string().nullable().optional(),
  releaseGroupMbid: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
        }
        const body = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Check if song already exists
        const { data: existing } = await supabaseAdmin
          .from("songs")
          .select("slug")
          .eq("musicbrainz_id", body.mbid)
          .maybeSingle();

        // If song already exists, just refresh artwork (cheap) and redirect
        if (existing) {
          const geniusLookupName = body.primaryArtistName || body.artistName;
          const genius = await searchGeniusArtwork(geniusLookupName, body.title);
          if (genius.geniusSongId || genius.thumbnailUrl) {
            await supabaseAdmin
              .from("songs")
              .update({
                genius_thumbnail_url: genius.thumbnailUrl,
                genius_song_id: genius.geniusSongId,
              })
              .eq("musicbrainz_id", body.mbid);
          }
          return Response.json({ slug: existing.slug });
        }

        // Parallel: fetch full metadata from MusicBrainz + Genius artwork
        const geniusLookupName = body.primaryArtistName || body.artistName;
        const [recording, genius] = await Promise.all([
          getRecordingByMbid(body.mbid).catch((err) => {
            console.warn("[import] getRecordingByMbid failed, proceeding with search data:", (err as Error).message);
            return null;
          }),
          searchGeniusArtwork(geniusLookupName, body.title),
        ]);

        const coverUrl = genius.thumbnailUrl;
        const geniusSongId = genius.geniusSongId;
        const geniusArtistId = genius.geniusArtistId;

        // Artist area check: if release country not in allowed set, check artist area
        const releaseCountry = recording?.country ?? null;
        if (!releaseCountry || !ALLOWED_COUNTRIES.includes(releaseCountry.toUpperCase())) {
          if (body.artistMbid) {
            const allowed = await isArtistInAllowedArea(body.artistMbid);
            if (!allowed) {
              return Response.json(
                { error: "This artist is not from an allowed area." },
                { status: 403 },
              );
            }
          }
        }

        // Determine artist slug + id
        const artistSlug = slugifyBase(body.artistName).slice(0, 80) || body.mbid;
        const { data: artist, error: artistErr } = await supabaseAdmin
          .from("artists")
          .upsert(
            {
              name: body.artistName,
              slug: artistSlug,
              musicbrainz_id: body.artistMbid ?? null,
              genius_artist_id: geniusArtistId,
              image_url: genius.artistImageUrl,
            },
            { onConflict: "musicbrainz_id" },
          )
          .select("id")
          .single();

        if (artistErr && artistErr.code !== "23505") {
          console.error("[import] artist upsert", artistErr);
          return Response.json({ error: artistErr.message }, { status: 500 });
        }

        // If upsert returned empty due to conflict, re-fetch
        let artistId = artist?.id ?? null;
        if (!artistId && body.artistMbid) {
          const { data: refetched } = await supabaseAdmin
            .from("artists")
            .select("id")
            .eq("musicbrainz_id", body.artistMbid)
            .single();
          artistId = refetched?.id ?? null;
        }

        // Generate slug
        const slug = generateSlug(body.title);
        const releaseGroupMbid = recording?.releaseGroupMbid ?? body.releaseGroupMbid ?? null;
        const releaseDate = recording?.releaseDate ?? body.releaseDate ?? null;
        const tags = recording?.tags ?? [];

        const songRow = {
          title: body.title,
          slug,
          musicbrainz_id: body.mbid,
          artist_id: artistId,
          genius_thumbnail_url: coverUrl,
          genius_song_id: geniusSongId,
          genre_tags: tags,
          credits: null,
          release_group_mbid: releaseGroupMbid,
          country: releaseCountry,
          release_date: releaseDate,
        };

        const { error: songErr } = await supabaseAdmin
          .from("songs")
          .upsert(songRow, { onConflict: "musicbrainz_id" });

        if (songErr) {
          console.error("[import] song upsert", songErr);
          return Response.json({ error: songErr.message }, { status: 500 });
        }

        return Response.json({ slug });
      },
    },
  },
});
