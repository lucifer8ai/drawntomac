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
        setSongs(
          trending.map((t) => ({
            id: t.song_id,
            title: t.title ?? "Unknown",
            slug: t.slug ?? "",
            artistName: t.artist_name ?? null,
            albumArtUrl: t.album_art_url ?? null,
            genreTags: t.genre_tags ?? null,
            likeCount: t.like_count,
            heardCount: t.heard_count,
            reviewCount: t.review_count,
            dislikeCount: t.dislike_count,
            trendingScore: t.trending_score,
          })),
        );
        setLoading(false);
        return;
      }

      const mapped: TrendingSong[] = forYou.map((t) => ({
        id: t.song_id,
        title: t.title ?? "Unknown",
        slug: t.slug ?? "",
        artistName: t.artist_name ?? null,
        albumArtUrl: t.album_art_url ?? null,
        genreTags: t.genre_tags ?? null,
        likeCount: t.like_count,
        heardCount: t.heard_count,
        reviewCount: t.review_count,
        dislikeCount: t.dislike_count,
        trendingScore: t.trending_score,
      }));

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
