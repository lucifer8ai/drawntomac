import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileTasteStats {
  heard: number;
  liked: number;
  disliked: number;
  want: number;
}

export function useProfileStats(userId: string | null) {
  const [stats, setStats] = useState<ProfileTasteStats>({ heard: 0, liked: 0, disliked: 0, want: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("diary_entries")
        .select("type", { count: "exact" })
        .eq("user_id", userId);

      if (err) throw err;

      const DB_TYPE_TO_KEY: Record<string, keyof ProfileTasteStats> = {
        heard: "heard",
        like: "liked",
        dislike: "disliked",
        want: "want",
      };
      const counts: ProfileTasteStats = { heard: 0, liked: 0, disliked: 0, want: 0 };
      for (const row of data ?? []) {
        const key = DB_TYPE_TO_KEY[row.type];
        if (key) counts[key] = (counts[key] || 0) + 1;
      }
      setStats(counts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error };
}
