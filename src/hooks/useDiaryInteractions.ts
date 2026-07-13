import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InteractionType = "heard" | "like" | "dislike" | "want" | "review";

export function useDiaryInteractions(userId: string | null, songIds: string[]) {
  const [interactions, setInteractions] = useState<Map<string, Set<InteractionType>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId || songIds.length === 0) {
      setInteractions(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("diary_entries")
        .select("song_id, type")
        .in("song_id", songIds)
        .eq("user_id", userId);

      if (queryError) throw queryError;

      const map = new Map<string, Set<InteractionType>>();
      for (const row of data ?? []) {
        if (!map.has(row.song_id)) {
          map.set(row.song_id, new Set());
        }
        map.get(row.song_id)!.add(row.type as InteractionType);
      }
      setInteractions(map);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load diary interactions");
    } finally {
      setLoading(false);
    }
  }, [userId, songIds.join(",")]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { interactions, loading, error };
}
