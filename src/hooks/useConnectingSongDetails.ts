import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectingSongDetail {
  songId: string;
  title: string;
  slug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  viewerTypes: string[];
  targetTypes: string[];
}

export function useConnectingSongDetails(
  viewerId: string | null,
  targetUsername: string,
) {
  const [songs, setSongs] = useState<ConnectingSongDetail[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetDisplayName, setTargetDisplayName] = useState<string | null>(
    null,
  );

  const resolveTarget = useCallback(async () => {
    if (!targetUsername) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("username", targetUsername)
      .single();
    if (data) {
      setTargetId(data.id);
      setTargetDisplayName(data.display_name ?? targetUsername);
    } else {
      setError("User not found.");
    }
  }, [targetUsername]);

  useEffect(() => {
    resolveTarget();
  }, [resolveTarget]);

  const fetch = useCallback(async () => {
    if (!viewerId || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_connecting_song_details",
        { viewer_id: viewerId, target_id: targetId },
      );
      if (rpcError) throw rpcError;

      const mapped: ConnectingSongDetail[] = (data ?? []).map((s: any) => ({
        songId: s.song_id,
        title: s.title ?? "Unknown",
        slug: s.slug ?? "",
        artistName: s.artist_name ?? null,
        albumArtUrl: s.album_art_url ?? null,
        viewerTypes: s.viewer_types ?? [],
        targetTypes: s.target_types ?? [],
      }));

      setSongs(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load connecting songs");
    } finally {
      setLoading(false);
    }
  }, [viewerId, targetId]);

  useEffect(() => {
    if (viewerId && targetId) fetch();
  }, [viewerId, targetId, fetch]);

  const isEmpty = !loading && !error && songs.length === 0 && targetId !== null;

  return {
    songs,
    loading,
    error,
    retry: fetch,
    isEmpty,
    targetId,
    targetDisplayName,
  };
}
