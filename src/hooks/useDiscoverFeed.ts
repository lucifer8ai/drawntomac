import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoverSong {
  id: string;
  title: string;
  slug: string;
  trackNumber: number;
}

export interface DiscoverAlbum {
  releaseGroupId: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  releaseDate: string | null;
  songs: DiscoverSong[];
}

export interface ArtistAlbumFeed {
  artistId: string;
  artistName: string;
  artistSlug: string;
  artistImageUrl: string | null;
  albums: DiscoverAlbum[];
}

interface FlatRow {
  artist_id: string;
  artist_name: string;
  artist_slug: string;
  artist_image_url: string | null;
  release_group_id: string;
  release_group_title: string;
  release_group_slug: string;
  release_group_image_url: string | null;
  release_group_release_date: string | null;
  song_id: string;
  song_title: string;
  song_slug: string;
  song_track_number: number;
}

function groupFlatRows(rows: FlatRow[]): ArtistAlbumFeed[] {
  const artistMap = new Map<string, ArtistAlbumFeed>();
  const albumMaps = new Map<string, Map<string, DiscoverAlbum>>();

  for (const row of rows) {
    let artist = artistMap.get(row.artist_id);
    if (!artist) {
      artist = {
        artistId: row.artist_id,
        artistName: row.artist_name,
        artistSlug: row.artist_slug,
        artistImageUrl: row.artist_image_url,
        albums: [],
      };
      artistMap.set(row.artist_id, artist);
      albumMaps.set(row.artist_id, new Map());
    }

    const albumMap = albumMaps.get(row.artist_id)!;
    let album = albumMap.get(row.release_group_id);
    if (!album) {
      album = {
        releaseGroupId: row.release_group_id,
        title: row.release_group_title,
        slug: row.release_group_slug,
        imageUrl: row.release_group_image_url,
        releaseDate: row.release_group_release_date,
        songs: [],
      };
      albumMap.set(row.release_group_id, album);
    }

    album.songs.push({
      id: row.song_id,
      title: row.song_title,
      slug: row.song_slug,
      trackNumber: row.song_track_number,
    });
  }

  const result: ArtistAlbumFeed[] = [];
  for (const artist of artistMap.values()) {
    const albumMap = albumMaps.get(artist.artistId)!;
    artist.albums = Array.from(albumMap.values());
    if (artist.albums.length > 0) {
      result.push(artist);
    }
  }

  return result;
}

export function useDiscoverFeed() {
  const [feed, setFeed] = useState<ArtistAlbumFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (mountedRef.current) {
          setFeed([]);
          setLoading(false);
        }
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_discover_feed", {
        p_user_id: userId,
      });

      if (rpcError) {
        const msg = (rpcError as any)?.message ?? "";
        if (
          (rpcError as any)?.code === "PGRST202" ||
          msg.includes("function") ||
          msg.includes("not found")
        ) {
          throw new Error(
            "get_discover_feed function not deployed. Run: npx tsx scripts/deploy-migrations.ts",
          );
        }
        throw rpcError;
      }

      if (!mountedRef.current) return;
      const grouped = groupFlatRows((data ?? []) as FlatRow[]);
      setFeed(grouped);
      setLoading(false);
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e?.message ?? "Failed to load discover feed");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => { mountedRef.current = false; };
  }, [fetchFeed]);

  const refresh = useCallback(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { feed, loading, error, refresh };
}
