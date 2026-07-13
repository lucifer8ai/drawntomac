import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingSong {
  id: string;
  title: string;
  slug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  genreTags: string[] | null;
  likeCount: number;
  heardCount: number;
  reviewCount: number;
  dislikeCount: number;
  trendingScore: number;
}

export function useTrendingSongs(windowDays: number = 30) {
  const [songs, setSongs] = useState<TrendingSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: trending, error: rpcError } = await supabase.rpc("get_trending_songs", {
        window_days: windowDays,
      });
      if (rpcError) throw rpcError;

      if (!trending || trending.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const songIds = trending.map((t) => t.song_id);
      const { data: songData, error: songsError } = await supabase
        .from("songs")
        .select("id, title, slug, genius_thumbnail_url, genre_tags, artist:artists(name)")
        .in("id", songIds);

      if (songsError) throw songsError;

      const songMap = new Map((songData ?? []).map((s: any) => [s.id, s]));
      const mapped: TrendingSong[] = trending.map((t) => {
        const s = songMap.get(t.song_id);
        return {
          id: t.song_id,
          title: s?.title ?? "Unknown",
          slug: s?.slug ?? "",
          artistName: s?.artist?.name ?? null,
          albumArtUrl: s?.genius_thumbnail_url ?? null,
          genreTags: s?.genre_tags ?? null,
          likeCount: t.like_count,
          heardCount: t.heard_count,
          reviewCount: t.review_count,
          dislikeCount: t.dislike_count,
          trendingScore: t.trending_score,
        };
      });

      setSongs(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load trending songs");
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { songs, loading, error, retry: fetch, isEmpty: !loading && !error && songs.length === 0 };
}
