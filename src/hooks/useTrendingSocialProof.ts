import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTrendingSocialProof(userId: string | null, songIds: string[]) {
  const [socialProof, setSocialProof] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId || songIds.length === 0) {
      setSocialProof(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_trending_social_proof", {
        current_user_id: userId,
        song_ids: songIds,
      });
      if (rpcError) throw rpcError;

      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.song_id, Number(row.match_count));
      }
      setSocialProof(map);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load social proof");
    } finally {
      setLoading(false);
    }
  }, [userId, songIds.join(",")]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { socialProof, loading, error };
}
