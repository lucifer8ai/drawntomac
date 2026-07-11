import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeedEntry {
  entryId: string;
  userId: string;
  type: "heard" | "like" | "dislike" | "review" | "want";
  body: string | null;
  createdAt: string;
  songId: string;
  songTitle: string;
  songSlug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

const PAGE_SIZE = 25;

function mapEntry(e: any): FeedEntry {
  return {
    entryId: e.entry_id,
    userId: e.user_id,
    type: e.type,
    body: e.body,
    createdAt: e.created_at,
    songId: e.song_id,
    songTitle: e.song_title,
    songSlug: e.song_slug,
    artistName: e.artist_name,
    albumArtUrl: e.album_art_url,
    username: e.username,
    displayName: e.display_name,
    avatarUrl: e.avatar_url,
  };
}

export function useFeed() {
  const [pages, setPages] = useState<FeedEntry[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const loadingMoreRef = useRef(false);
  const followingIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  // Keep ref in sync with state for real-time filter
  useEffect(() => {
    followingIdsRef.current = new Set(followingIds);
  }, [followingIds]);

  // Fetch following list and user ID on mount
  useEffect(() => {
    mountedRef.current = true;
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setLoading(false);
        setUserId(null);
        return;
      }
      setUserId(uid);

      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", uid);

      const ids = (follows ?? []).map((f) => f.following_id);
      setFollowingIds(ids);
    }
    init();
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch first page when followingIds is ready
  const fetchPage = useCallback(async (cursor: string | null) => {
    if (!userId) return { entries: [] as FeedEntry[], hasMore: false };

    const { data, error: rpcError } = await supabase.rpc("get_feed", {
      p_user_id: userId,
      p_cursor: cursor ?? undefined,
      p_limit: PAGE_SIZE,
    });

    if (rpcError) throw rpcError;

    const entries: FeedEntry[] = (data ?? []).map(mapEntry).filter((e) => e.entryId);
    const more = entries.length > PAGE_SIZE;
    if (more) entries.pop();

    return { entries, hasMore: more };
  }, [userId]);

  useEffect(() => {
    if (!userId || followingIds.length === 0) {
      setLoading(false);
      setPages([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchPage(null)
      .then(({ entries, hasMore: more }) => {
        if (!mountedRef.current) return;
        setPages([entries]);
        setHasMore(more);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!mountedRef.current) return;
        setError(e?.message ?? "Failed to load feed");
        setLoading(false);
      });
  }, [userId, followingIds.length]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "diary_entries" },
        async (payload: any) => {
          if (!followingIdsRef.current.has(payload.new.user_id)) return;
          if (!mountedRef.current) return;

          // Fetch the full joined entry
          const { data } = await supabase
            .from("diary_entries")
            .select(`id, type, body, created_at, user_id, song_id,
              song:songs ( id, title, slug, genius_thumbnail_url, artist:artists ( name ) )
            `)
            .eq("id", payload.new.id)
            .single();

          if (!data || !mountedRef.current) return;

          const entry: FeedEntry = {
            entryId: (data as any).id,
            userId: (data as any).user_id,
            type: (data as any).type,
            body: (data as any).body,
            createdAt: (data as any).created_at,
            songId: (data as any).song_id,
            songTitle: (data as any).song?.title ?? "Unknown",
            songSlug: (data as any).song?.slug ?? "",
            artistName: (data as any).song?.artist?.name ?? null,
            albumArtUrl: (data as any).song?.genius_thumbnail_url ?? null,
            username: "loading...",
            displayName: null,
            avatarUrl: null,
          };

          // Fetch profile for the entry author
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", entry.userId)
            .single();

          if (profile) {
            entry.username = (profile as any).username;
            entry.displayName = (profile as any).display_name;
            entry.avatarUrl = (profile as any).avatar_url;
          }

          setPages((prev) => {
            const next = [...prev];
            if (next.length === 0) {
              next[0] = [entry];
            } else {
              const firstPage = [...next[0]];
              firstPage.unshift(entry);
              if (firstPage.length > PAGE_SIZE) firstPage.pop();
              next[0] = firstPage;
            }
            return next;
          });

          setNewActivityCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || pages.length === 0) return;
    loadingMoreRef.current = true;
    setPartialError(null);

    const lastPage = pages[pages.length - 1];
    const cursor = lastPage[lastPage.length - 1]?.createdAt ?? null;

    try {
      const { entries, hasMore: more } = await fetchPage(cursor);
      if (!mountedRef.current) return;
      setPages((prev) => [...prev, entries]);
      setHasMore(more);
    } catch (e: any) {
      setPartialError(e?.message ?? "Failed to load more");
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, pages, fetchPage]);

  const refresh = useCallback(async () => {
    if (!userId || followingIds.length === 0) return;
    setLoading(true);
    setError(null);
    setPartialError(null);
    try {
      const { entries, hasMore: more } = await fetchPage(null);
      if (!mountedRef.current) return;
      setPages([entries]);
      setHasMore(more);
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh feed");
    } finally {
      setLoading(false);
    }
  }, [userId, followingIds.length, fetchPage]);

  const dismissNewActivity = useCallback(() => {
    setNewActivityCount(0);
  }, []);

  const allEntries = pages.flat();
  const isEmpty = !loading && !error && allEntries.length === 0;
  const followingCount = followingIds.length;

  return {
    pages,
    loadMore,
    refresh,
    loading,
    error,
    partialError,
    isEmpty,
    followingCount,
    hasMore,
    newActivityCount,
    dismissNewActivity,
  };
}
