import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectingSong {
  id: string;
  title: string;
  slug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  sourceDisplayName: string | null;
}

export function useConnectingSongs(userId: string | null) {
  const [songs, setSongs] = useState<ConnectingSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setSongs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_connecting_songs", {
        current_user_id: userId,
      });
      if (rpcError) throw rpcError;

      const mapped: ConnectingSong[] = (data ?? []).map((s: any) => ({
        id: s.song_id,
        title: s.title ?? "Unknown",
        slug: s.slug ?? "",
        artistName: s.artist_name ?? null,
        albumArtUrl: s.album_art_url ?? null,
        sourceDisplayName: s.source_display_name ?? null,
      }));

      setSongs(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load connecting songs");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isEmpty = !loading && !error && songs.length === 0 && userId !== null;

  return { songs, loading, error, retry: fetch, isEmpty };
}
