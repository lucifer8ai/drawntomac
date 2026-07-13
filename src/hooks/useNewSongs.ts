import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NewSong {
  id: string;
  title: string;
  slug: string;
  artistName: string | null;
  albumArtUrl: string | null;
}

export function useNewSongs() {
  const [songs, setSongs] = useState<NewSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_recently_imported_songs");
      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const mapped: NewSong[] = data.map((s: any) => ({
        id: s.song_id,
        title: s.title,
        slug: s.slug,
        artistName: s.artist_name ?? null,
        albumArtUrl: s.genius_thumbnail_url ?? null,
      }));

      setSongs(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load new songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { songs, loading, error, retry: fetch, isEmpty: !loading && !error && songs.length === 0 };
}
