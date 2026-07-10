import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

export function useCompatibleUsers(userId: string | null) {
  const [users, setUsers] = useState<CompatibleUser[]>([]);
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
      const { data, error: rpcError } = await supabase.rpc("get_compatible_users", {
        current_user_id: userId,
      });
      if (rpcError) throw rpcError;

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
      }));

      setUsers(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load compatible users");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { users, loading, error, retry: fetch, isEmpty: !loading && !error && users.length === 0 && userId !== null };
}
