import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDiaryInteractions } from "@/hooks/useDiaryInteractions";
import { HeardToggle } from "@/components/onboarding/HeardToggle";
import { toast } from "sonner";

interface SongRow {
  id: string;
  title: string;
  slug: string;
  artist_name: string;
}

interface ArtistGroup {
  artist_name: string;
  songs: SongRow[];
}

interface SongTaggerProps {
  artistIds: string[];
  onConfirm: () => void;
  onCountsChange: (heard: number, total: number) => void;
}

export function SongTagger({ artistIds, onConfirm, onCountsChange }: SongTaggerProps) {
  const [userId, setUserId] = useState<string>("");
  const [artistGroups, setArtistGroups] = useState<ArtistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localHeard, setLocalHeard] = useState<Set<string>>(new Set());
  const localHeardRef = useRef<Set<string>>(new Set());

  const allSongIds = artistGroups.flatMap((g) => g.songs.map((s) => s.id));
  const { interactions, loading: diaryLoading } = useDiaryInteractions(userId || null, allSongIds);

  const mergedHeard = useCallback(() => {
    const merged = new Set(localHeardRef.current);
    for (const [songId, types] of interactions) {
      if (types.has("heard")) merged.add(songId);
    }
    return merged;
  }, [interactions]);

  useEffect(() => {
    localHeardRef.current = localHeard;
    const heard = mergedHeard();
    onCountsChange(heard.size, allSongIds.length);
  }, [localHeard, mergedHeard, onCountsChange, allSongIds.length]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    const groups: ArtistGroup[] = [];
    const errs: Record<string, string> = {};

    for (const artistId of artistIds) {
      try {
        const { data: artistData } = await supabase
          .from("artists")
          .select("name")
          .eq("id", artistId)
          .single();

        const { data: songs, error: songsError } = await supabase
          .from("songs")
          .select("id, title, slug, release_group_mbid")
          .eq("artist_id", artistId)
          .order("title");

        if (songsError) throw songsError;

        const groupedByRelease = new Map<string, SongRow[]>();
        const ungrouped: SongRow[] = [];

        for (const song of songs ?? []) {
          const key = song.release_group_mbid ?? `_ungrouped_${song.id}`;
          if (!groupedByRelease.has(key)) groupedByRelease.set(key, []);
          groupedByRelease.get(key)!.push({
            id: song.id,
            title: song.title,
            slug: song.slug,
            artist_name: artistData?.name ?? "Unknown",
          });
        }

        const selectedSongs: SongRow[] = [];
        for (const [, releaseSongs] of groupedByRelease) {
          selectedSongs.push(...releaseSongs);
        }

        if (selectedSongs.length > 0) {
          groups.push({
            artist_name: artistData?.name ?? "Unknown",
            songs: selectedSongs,
          });
        } else {
          errs[artistId] = `No songs found for ${artistData?.name ?? "Unknown"}.`;
        }
      } catch (e: any) {
        errs[artistId] = `Failed to load songs.`;
      }
    }

    setArtistGroups(groups);
    setErrors(errs);
    setLoading(false);
  }, [artistIds]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleHeardToggle = useCallback((songId: string) => {
    setLocalHeard((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  if (loading || diaryLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Which songs have you heard?
          </h2>
          <p className="text-base text-muted-foreground">
            Don't overthink — tap what's familiar.
          </p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between h-9 rounded-lg border border-border px-4">
                <div className="w-32 h-3 bg-white/5 rounded" />
                <div className="w-16 h-6 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Which songs have you heard?
        </h2>
        <p className="text-base text-muted-foreground">
          Don't overthink — tap what's familiar.
        </p>
      </div>

      {artistIds.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No artists selected.</p>
      )}

      <div className="space-y-6">
        {artistGroups.map((group) => (
          <div key={group.artist_name}>
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {group.artist_name}
            </div>
            <div className="space-y-0.5">
              {group.songs.map((song) => {
                const heard = localHeard.has(song.id) || interactions.get(song.id)?.has("heard");
                return (
                  <div
                    key={song.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 min-h-[44px]"
                  >
                    <span className="text-[15px] font-medium text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {song.title}
                    </span>
                    <HeardToggle
                      songId={song.id}
                      userId={userId}
                      initialHeard={!!heard}
                      onToggle={handleHeardToggle}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="text-sm text-muted-foreground text-center space-y-1">
          {Object.values(errors).map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onConfirm}
        className={`w-full min-h-[44px] rounded-lg font-semibold text-sm transition-all ease-out duration-200 ${
          mergedHeard().size >= 1
            ? "bg-primary text-primary-foreground scale-[1.02]"
            : "bg-primary/8 text-muted-foreground border border-border cursor-not-allowed"
        }`}
        aria-disabled={mergedHeard().size < 1}
      >
        Continue
      </button>
    </div>
  );
}
