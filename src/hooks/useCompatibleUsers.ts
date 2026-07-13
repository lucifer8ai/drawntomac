import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SortMode = "composite" | "count" | "recent";

export interface CompatibleUser {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  sharedSongs: number;
  sharedHeard: number;
  sharedLiked: number;
  sharedDisliked: number;
  sharedWant: number;
  sharedReviewed: number;
  likedSongs: string[];
  wantSongs: string[];
  lastActiveAt: string | null;
  topSharedArtist: string | null;
}

interface CacheEntry {
  fetchedAt: number;
  data: CompatibleUser[];
  userId: string;
  sortMode: SortMode;
}

const CACHE_TTL = 5 * 60 * 1000;

export function useCompatibleUsers(
  userId: string | null,
  sortMode: SortMode,
  page: number,
) {
  const [users, setUsers] = useState<CompatibleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [diaryCount, setDiaryCount] = useState(0);

  const cacheRef = useRef<CacheEntry | null>(null);
  const latestRequestRef = useRef<{ userId: string | null; sortMode: SortMode; page: number }>({ userId, sortMode, page });

  const fetch = useCallback(async () => {
    const requestKey = { userId, sortMode, page };
    latestRequestRef.current = requestKey;

    if (!userId) {
      setUsers([]);
      setLoading(false);
      setHasMore(false);
      setDiaryCount(0);
      return;
    }

    // Check cache for page 0 only
    if (page === 0) {
      const cached = cacheRef.current;
      if (
        cached &&
        cached.userId === userId &&
        cached.sortMode === sortMode &&
        Date.now() - cached.fetchedAt < CACHE_TTL
      ) {
        const isStale = requestKey.userId !== latestRequestRef.current.userId ||
          requestKey.sortMode !== latestRequestRef.current.sortMode ||
          requestKey.page !== latestRequestRef.current.page;
        if (!isStale) {
          setUsers(cached.data);
          setHasMore(cached.data.length === 20);
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_compatible_users", {
        current_user_id: userId,
        sort_mode: sortMode,
        page_offset: page * 20,
      });
      if (rpcError) throw rpcError;

      if (
        latestRequestRef.current.userId !== requestKey.userId ||
        latestRequestRef.current.sortMode !== requestKey.sortMode ||
        latestRequestRef.current.page !== requestKey.page
      ) {
        return; // stale response
      }

      const mapped: CompatibleUser[] = (data ?? []).map((u: any) => ({
        userId: u.user_id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        sharedSongs: u.shared_songs,
        sharedHeard: u.shared_heard,
        sharedLiked: u.shared_liked,
        sharedDisliked: u.shared_disliked,
        sharedWant: u.shared_want,
        sharedReviewed: u.shared_reviewed,
        likedSongs: u.liked_songs ?? [],
        wantSongs: u.want_songs ?? [],
        lastActiveAt: u.last_active_at ?? null,
        topSharedArtist: u.top_shared_artist ?? null,
      }));

      const diaryTotal = data?.[0]?.current_user_total ?? 0;
      setDiaryCount(Number(diaryTotal));

      const filtered = mapped.filter((u) => u.userId);

      if (page === 0) {
        setUsers(filtered);
        cacheRef.current = { fetchedAt: Date.now(), data: filtered, userId, sortMode };
      } else {
        setUsers((prev) => [...prev, ...filtered]);
      }

      setHasMore(mapped.length === 20);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load compatible users");
    } finally {
      setLoading(false);
    }
  }, [userId, sortMode, page]);

  const retry = useCallback(() => {
    cacheRef.current = null;
    fetch();
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isEmpty = !loading && !error && users.length === 0 && userId !== null;

  return { users, loading, error, retry, isEmpty, hasMore, diaryCount };
}
