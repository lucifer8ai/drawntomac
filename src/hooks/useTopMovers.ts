import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MoverSong {
  id: string;
  title: string;
  slug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  rankDelta: number | null;
  currentScore: number;
}

export function useTopMovers() {
  const [songs, setSongs] = useState<MoverSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_top_movers");
      if (rpcError) throw rpcError;

      const mapped: MoverSong[] = (data ?? []).map((s: any) => ({
        id: s.song_id,
        title: s.title ?? "Unknown",
        slug: s.slug ?? "",
        artistName: s.artist_name ?? null,
        albumArtUrl: s.album_art_url ?? null,
        rankDelta: s.rank_delta,
        currentScore: s.current_score,
      }));

      setSongs(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load top movers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isEmpty = !loading && !error && songs.length === 0;

  return { songs, loading, error, retry: fetch, isEmpty };
}
