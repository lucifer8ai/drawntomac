import type { CompatibleUser } from "@/hooks/useCompatibleUsers";
import { Link } from "@tanstack/react-router";

interface CompatibleUsersListProps {
  users: CompatibleUser[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isEmpty: boolean;
  isAnonymous: boolean;
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-raised p-4">
      <div className="h-12 w-12 rounded-full flex-shrink-0 animate-skeleton" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-1/3 rounded animate-skeleton" />
        <div className="h-3 w-1/2 rounded animate-skeleton" />
      </div>
    </div>
  );
}

export function CompatibleUsersList({ users, loading, error, retry, isEmpty, isAnonymous }: CompatibleUsersListProps) {
  if (isAnonymous) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <UserSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm mb-3 text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          Add songs to your diary to find compatible listeners.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile vertical cards */}
      <div className="md:hidden space-y-2">
        {users.map((user) => (
          <Link
            key={user.userId}
            to="/user/$username"
            params={{ username: user.username }}
            className="flex items-center gap-3 rounded-xl border bg-raised p-3 transition-colors hover:bg-white/[0.03]"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user.displayName ?? user.username} avatar`} className="h-10 w-10 rounded-full object-cover flex-shrink-0" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {(user.displayName ?? user.username)[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.displayName ?? user.username}
                </span>
                <span className="flex-shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {user.sharedSongs} songs in common
                </span>
              </div>
              {user.likedSongs.length > 0 && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  Likes: {user.likedSongs.join(", ")}
                </div>
              )}
              {user.wantSongs.length > 0 && (
                <div className="truncate text-xs text-muted-foreground">
                  Wants: {user.wantSongs.join(", ")}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden md:block space-y-2">
        {users.map((user) => (
          <Link
            key={user.userId}
            to="/user/$username"
            params={{ username: user.username }}
            className="flex items-center gap-4 rounded-xl border bg-raised p-4 transition-colors hover:bg-white/[0.03]"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user.displayName ?? user.username} avatar`} className="h-12 w-12 rounded-full object-cover flex-shrink-0" loading="lazy" />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                {(user.displayName ?? user.username)[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.displayName ?? user.username}
                </span>
                <span className="flex-shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {user.sharedSongs} songs in common
                </span>
              </div>
              <div className="flex gap-4 mt-1">
                {user.likedSongs.length > 0 && (
                  <div className="truncate text-xs text-muted-foreground">
                    Likes: {user.likedSongs.join(", ")}
                  </div>
                )}
                {user.wantSongs.length > 0 && (
                  <div className="truncate text-xs text-muted-foreground">
                    Wants: {user.wantSongs.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
