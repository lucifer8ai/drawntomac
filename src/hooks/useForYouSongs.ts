import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrendingSong } from "./useTrendingSongs";

export function useForYouSongs(userId: string | null) {
  const [songs, setSongs] = useState<TrendingSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: forYou, error: rpcError } = await supabase.rpc("get_for_you_songs", {
        user_id: userId,
      });
      if (rpcError) throw rpcError;

      // Fall back to trending if no compatible users
      if (!forYou || forYou.length === 0) {
        const { data: trending } = await supabase.rpc("get_trending_songs");
        if (!trending || trending.length === 0) {
          setSongs([]);
          setLoading(false);
          return;
        }
        const songIds = trending.map((t) => t.song_id);
        const { data: songData } = await supabase
          .from("songs")
          .select("id, title, slug, genius_thumbnail_url, genre_tags, artist:artists(name)")
          .in("id", songIds);
        const songMap = new Map((songData ?? []).map((s: any) => [s.id, s]));
        setSongs(
          trending.map((t) => {
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
          }),
        );
        setLoading(false);
        return;
      }

      const songIds = forYou.map((t) => t.song_id);
      const { data: songData, error: songsError } = await supabase
        .from("songs")
        .select("id, title, slug, genius_thumbnail_url, genre_tags, artist:artists(name)")
        .in("id", songIds);

      if (songsError) throw songsError;

      const songMap = new Map((songData ?? []).map((s: any) => [s.id, s]));
      const mapped: TrendingSong[] = forYou.map((t) => {
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
      setError(e?.message ?? "Failed to load for-you songs");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { songs, loading, error, retry: fetch, isEmpty: !loading && !error && songs.length === 0 };
}
