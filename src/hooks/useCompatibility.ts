import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompatibilityData {
  sharedSongs: number;
  sharedHeard: number;
  sharedLiked: number;
  sharedDisliked: number;
  sharedReviewed: number;
}

export function useCompatibility(viewerId: string | null, targetId: string | null) {
  const [data, setData] = useState<CompatibilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!viewerId || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "get_user_compatibility",
        { viewer_id: viewerId, target_id: targetId },
      );
      if (rpcError) throw rpcError;
      if (result && result.length > 0) {
        const r = result[0] as any;
        setData({
          sharedSongs: r.shared_songs,
          sharedHeard: r.shared_heard,
          sharedLiked: r.shared_liked,
          sharedDisliked: r.shared_disliked,
          sharedReviewed: r.shared_reviewed,
        });
      } else {
        setData({
          sharedSongs: 0,
          sharedHeard: 0,
          sharedLiked: 0,
          sharedDisliked: 0,
          sharedReviewed: 0,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load compatibility");
    } finally {
      setLoading(false);
    }
  }, [viewerId, targetId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, retry: fetch };
}

export function getCompatibilityTier(sharedSongs: number): "Low" | "Medium" | "High" {
  if (sharedSongs >= 8) return "High";
  if (sharedSongs >= 4) return "Medium";
  return "Low";
}
