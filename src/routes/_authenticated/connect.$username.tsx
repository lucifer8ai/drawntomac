import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConnectingSongDetails } from "@/hooks/useConnectingSongDetails";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/connect/$username")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      {
        title: `Songs you share with @${params.username} — #drawnto`,
      },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { username } = Route.useParams();
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });
  }, []);

  const { songs, loading, error, retry, isEmpty, targetDisplayName } =
    useConnectingSongDetails(viewerId, username);

  const displayName = targetDisplayName ?? username;
  const count = songs.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link
        to="/user/$username"
        params={{ username }}
        search={{ from: "discover", section: "people" }}
        className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors py-2 min-h-[44px] min-w-[44px]"
      >
        ← Back to @{username}
      </Link>

      <h1
        className={cn(
          "text-xl font-bold text-foreground",
          "animate-fade-in-up",
        )}
      >
        Songs you share with @{displayName}
      </h1>
      <p
        className={cn(
          "text-sm text-muted-foreground mb-4",
          "animate-fade-in-up",
        )}
      >
        {count === 0
          ? "No songs in common yet"
          : `${count} ${count === 1 ? "song" : "songs"} in common`}
      </p>

      {loading && (
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 py-3 px-4">
              <div className="h-4 w-[60%] rounded animate-skeleton" />
              <div className="h-3 w-[30%] rounded animate-skeleton" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      )}

      {isEmpty && !loading && (
        <div className="text-center py-12">
          <p className="text-base font-light text-muted-foreground">
            No shared songs with @{displayName} yet.
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
            Keep listening — connections emerge from the music you both
            discover.
          </p>
        </div>
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="animate-fade-in-up">
          {songs.map((song) => (
            <Link
              key={song.songId}
              to="/song/$slug"
              params={{ slug: song.slug }}
              className="flex items-center gap-2 py-3 px-4 hover:bg-white/[0.03] rounded-lg transition-colors duration-150 min-h-[44px]"
            >
              <span className="text-base font-semibold text-foreground truncate">
                {song.title}
              </span>
              <span className="text-sm text-muted-foreground flex-shrink-0">
                —
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {song.artistName}
              </span>
              <span className="text-muted-foreground/60 flex-shrink-0 ml-auto">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
