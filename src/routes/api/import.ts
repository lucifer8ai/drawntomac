import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getRecordingByMbid } from "@/lib/musicbrainz";
import { getCoverArt } from "@/lib/coverartarchive";
import { searchGeniusArtwork } from "@/lib/genius";
import { generateSlug, slugifyBase } from "@/lib/slugify";

const bodySchema = z.object({
  mbid: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
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

        if (existing) {
          return Response.json({ slug: existing.slug, cached: true });
        }

        // Fetch full metadata from MusicBrainz for richer data
        const recording = await getRecordingByMbid(body.mbid);

        // Determine artist slug + id
        const artistSlug = slugifyBase(body.artistName).slice(0, 80) || body.mbid;
        const { data: artist, error: artistErr } = await supabaseAdmin
          .from("artists")
          .upsert(
            {
              name: body.artistName,
              slug: artistSlug,
              musicbrainz_id: body.artistMbid ?? null,
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

        // Cover art: CAA primary, Genius fallback
        let coverUrl: string | null = null;
        let geniusSongId: string | null = null;
        let geniusArtistId: string | null = null;

        const rgMbid = recording?.releaseGroupMbid ?? body.releaseGroupMbid ?? null;
        if (rgMbid) {
          coverUrl = await getCoverArt(rgMbid);
        }

        if (!coverUrl) {
          const genius = await searchGeniusArtwork(body.artistName, body.title);
          coverUrl = genius.thumbnailUrl;
          geniusSongId = genius.geniusSongId;
          geniusArtistId = genius.geniusArtistId;
        }

        // Generate slug
        const slug = generateSlug(body.title);
        const releaseGroupMbid = recording?.releaseGroupMbid ?? body.releaseGroupMbid ?? null;
        const releaseDate = recording?.releaseDate ?? body.releaseDate ?? null;
        const country = recording?.country ?? null;
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
          country,
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
