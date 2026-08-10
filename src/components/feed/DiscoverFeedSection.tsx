import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useDiscoverFeed, type ArtistAlbumFeed, type DiscoverAlbum } from "@/hooks/useDiscoverFeed";
import { ArtistSelector } from "@/components/onboarding/ArtistSelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTabContext } from "@/routes/_authenticated/route";
import { toast } from "sonner";

function AlbumCard({ album }: { album: DiscoverAlbum }) {
  return (
    <Link
      to="/album/$slug"
      params={{ slug: album.slug }}
      className="flex flex-col gap-1.5 shrink-0 snap-start active:scale-[0.97] transition-transform"
    >
      <div className="w-[88px] md:w-[140px] aspect-square rounded-2xl border border-border bg-raised overflow-hidden">
        {album.imageUrl ? (
          <img
            src={album.imageUrl}
            alt={album.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
          </div>
        )}
      </div>
      <div className="w-[88px] md:w-[140px]">
        <p className="text-xs font-medium text-foreground truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {album.title}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {album.songs.length} {album.songs.length === 1 ? "song" : "songs"}
        </p>
      </div>
    </Link>
  );
}

function ArtistSection({ artist, maxVisible = 5 }: { artist: ArtistAlbumFeed; maxVisible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = artist.albums.length - maxVisible;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
          {artist.artistImageUrl ? (
            <img src={artist.artistImageUrl} alt={artist.artistName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {artist.artistName.charAt(0)}
            </span>
          )}
        </div>
        <Link
          to="/artist/$slug"
          params={{ slug: artist.artistSlug }}
          search={{ from: "feed" }}
          className="text-xs md:text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {artist.artistName}
        </Link>
      </div>
      <div
        className="flex gap-3 overflow-x-auto scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
        aria-label={`Albums by ${artist.artistName}`}
      >
        {(expanded ? artist.albums : artist.albums.slice(0, maxVisible)).map((album) => (
          <AlbumCard key={album.releaseGroupId} album={album} />
        ))}
        {!expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 snap-start w-[88px] md:w-[140px] aspect-square rounded-2xl border border-border bg-raised flex items-center justify-center hover:bg-white/[0.03] transition-colors active:scale-[0.97]"
          >
            <span className="text-sm font-medium text-muted-foreground">+{remaining} more</span>
          </button>
        )}
      </div>
      {expanded && remaining > 0 && (
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="shrink-0 flex flex-col gap-1.5">
      <div className="w-[88px] md:w-[140px] aspect-square rounded-2xl animate-skeleton" />
      <div className="w-[88px] md:w-[140px] space-y-1">
        <div className="h-3 w-3/4 rounded animate-skeleton" />
        <div className="h-2.5 w-1/2 rounded animate-skeleton" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {[1, 2].map((row) => (
        <div key={row} className="space-y-2">
          <div className="h-4 w-44 rounded animate-skeleton" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: row === 1 ? 4 : 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onEditArtists }: { onEditArtists: () => void }) {
  return (
    <div className="border bg-raised rounded-2xl p-6 text-center">
      <p className="text-base font-semibold text-primary" style={{ fontFamily: "DM Sans, sans-serif" }}>
        Pick artists to personalize your feed
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ll show you albums from artists you love — handpicked by you.
      </p>
      <Button variant="default" size="sm" shape="pill" className="mt-4" onClick={onEditArtists}>
        Pick Artists
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>Couldn&apos;t load your discover feed.</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm underline text-muted-foreground hover:text-foreground transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export function DiscoverFeedSection() {
  const { feed, loading, error, refresh } = useDiscoverFeed();
  const { triggerSearch } = useTabContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);

  const isEmpty = !loading && !error && feed.length === 0;

  const handleArtistConfirm = async (artistIds: string[]) => {
    setUpdateSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ discover_artist_ids: artistIds })
        .eq("id", userData.user.id);

      if (updateError) throw updateError;

      setModalOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update artists");
    } finally {
      setUpdateSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState onEditArtists={() => setModalOpen(true)} />
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pick Artists</DialogTitle>
            </DialogHeader>
            <ArtistSelector
              selectedArtistIds={[]}
              onConfirm={handleArtistConfirm}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm md:text-base font-semibold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Discover Feed
        </h2>
        <div className="flex gap-2">
          {feed.length < 10 && (
            <Button variant="raised" size="sm" shape="pill" onClick={triggerSearch}>
              Explore more
            </Button>
          )}
          <Button variant="raised" size="sm" shape="pill" onClick={() => setModalOpen(true)}>
            Edit artists
          </Button>
        </div>
      </div>

      {feed.map((artist) => (
        <ArtistSection key={artist.artistId} artist={artist} />
      ))}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Artists</DialogTitle>
          </DialogHeader>
          <ArtistSelector
            selectedArtistIds={feed.map((a) => a.artistId)}
            max={10}
            onConfirm={handleArtistConfirm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
