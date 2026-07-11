import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { TypeDot } from "./TypeDot";

export interface EntryCardData {
  entryId: string;
  entryType: "heard" | "like" | "dislike" | "review" | "want";
  songTitle: string;
  songSlug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reviewBody: string | null;
  createdAt: string;
}

function relativeTime(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;
  return `${Math.floor(weeks / 52)}y ago`;
}

function getActionLabel(type: string): string {
  switch (type) {
    case "heard": return "listened to";
    case "like": return "liked";
    case "dislike": return "disliked";
    case "review": return "reviewed";
    case "want": return "wants to hear";
    default: return "";
  }
}

export function EntryCard({ data }: { data: EntryCardData }) {
  const name = data.displayName ?? data.username;
  const initial = (name[0] ?? "?").toUpperCase();
  const [expanded, setExpanded] = useState(false);

  return (
    <Link
      to="/song/$slug"
      params={{ slug: data.songSlug }}
      className="block transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="flex gap-3 border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
        <Link
          to="/user/$username"
          params={{ username: data.username }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-primary-foreground hover:opacity-80 transition-opacity"
          style={{ backgroundColor: data.avatarUrl ? "transparent" : "var(--color-primary)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={`${name} avatar`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            initial
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="text-base leading-snug">
            <Link
              to="/user/$username"
              params={{ username: data.username }}
              className="font-semibold text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>{" "}
            <span className="text-muted-foreground">{getActionLabel(data.entryType)}</span>
          </div>
          <div className="mt-0.5 text-base font-semibold text-foreground truncate" title={data.songTitle}>
            {data.songTitle}
          </div>
          {data.artistName && (
            <div className="text-xs text-muted-foreground truncate" title={data.artistName}>
              {data.artistName}
            </div>
          )}
          {data.reviewBody ? (
            <div>
              <div
                className={`mt-1 text-xs leading-relaxed text-muted-foreground relative ${expanded ? "" : "line-clamp-3"}`}
              >
                {!expanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
                {data.reviewBody}
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:underline mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }
                }}
              >
                {expanded ? "... less" : "... more"}
              </button>
            </div>
          ) : null}
          <div className="mt-1 text-xs text-muted-foreground">
            {relativeTime(data.createdAt)}
          </div>
        </div>

        {data.albumArtUrl && (
          <div className="relative h-14 w-14 flex-shrink-0">
            <img
              src={data.albumArtUrl}
              alt={`${data.songTitle} album art`}
              className="h-14 w-14 rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
            <TypeDot type={data.entryType} />
          </div>
        )}
      </div>
    </Link>
  );
}
