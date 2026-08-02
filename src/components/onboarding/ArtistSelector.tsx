import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingArtist {
  id: string;
  name: string;
  image_url: string | null;
  song_count: number;
}

interface ArtistSelectorProps {
  selectedArtistIds: string[];
  onConfirm: (ids: string[]) => void;
  max?: number;
  requireExact?: boolean;
}

export function ArtistSelector({ selectedArtistIds: initialSelected, onConfirm, max = 3, requireExact = false }: ArtistSelectorProps) {
  const [artists, setArtists] = useState<OnboardingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_onboarding_artists");
      if (rpcError) throw rpcError;
      setArtists(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load artists");
      toast.error("Couldn't load artists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const toggleArtist = useCallback((artistId: string) => {
    setSelected((prev) => {
      if (prev.includes(artistId)) {
        return prev.filter((id) => id !== artistId);
      }
      if (prev.length >= max) return prev;
      return [...prev, artistId];
    });
  }, [max]);

  const isMax = selected.length >= max;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {requireExact ? `Pick ${max} artists you listen to.` : `Pick up to ${max} artists you listen to.`}
          </h2>
          <p className="text-base text-muted-foreground">
            We'll curate your feed based on your taste.
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {selected.length} of {max} selected
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 h-10 rounded-lg border border-border px-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
            <div className="flex-1 h-4 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground">No artists available yet.</p>
        <button
          type="button"
          onClick={fetchArtists}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-raised/50 p-6 backdrop-blur-sm">
      <div className="space-y-2">
        <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {requireExact ? `Pick ${max} artists you listen to.` : `Pick up to ${max} artists you listen to.`}
        </h2>
        <p className="text-base text-muted-foreground">
          We'll curate your feed based on your taste.
        </p>
      </div>

      <div className="text-right text-sm text-muted-foreground">
        {selected.length} of {max} selected
      </div>

      <div className="space-y-1 max-h-[420px] overflow-y-auto">
        {artists.map((artist) => {
          const isSelected = selected.includes(artist.id);
          const disabled = !isSelected && isMax;
          return (
            <div
              key={artist.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && toggleArtist(artist.id)}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !disabled) {
                  e.preventDefault();
                  toggleArtist(artist.id);
                }
              }}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 min-h-[44px] cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none ${
                disabled
                  ? "opacity-30 cursor-not-allowed"
                  : isSelected
                    ? "bg-heard/8 border-heard/40 shadow-[0_0_16px_0_oklch(0.55_0.16_150/0.08)]"
                    : "border-border/50 hover:border-border hover:bg-white/[0.04] hover:shadow-[0_0_0_1px_oklch(0.90_0.01_90/0.04)]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {artist.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  {artist.name}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {artist.song_count} songs
                </p>
              </div>
              <div className={`w-[22px] h-[22px] rounded border flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? "bg-heard border-heard text-heard-foreground" : "border-border"
              }`}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          if (requireExact ? selected.length === max : selected.length > 0) {
            onConfirm(selected);
          }
        }}
        disabled={requireExact ? selected.length < max : selected.length === 0}
        className={`w-full min-h-[44px] rounded-lg font-semibold text-sm transition-all ease-out duration-200 ${
          (requireExact ? selected.length === max : selected.length > 0)
            ? "bg-primary text-primary-foreground scale-[1.02]"
            : "bg-primary/8 text-muted-foreground border border-border cursor-not-allowed"
        }`}
        aria-disabled={requireExact ? selected.length < max : selected.length === 0}
      >
        Continue
      </button>
    </div>
  );
}
