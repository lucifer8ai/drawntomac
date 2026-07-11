import type { FeedEntry } from "@/hooks/useFeed";
import { CoalescedCard } from "./CoalescedCard";
import { EntryCard, type EntryCardData } from "./EntryCard";

export interface CoalescedGroup {
  kind: "group";
  songId: string;
  songTitle: string;
  songSlug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  users: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    types: string[];
    bodies: string[];
    entryId: string;
    latestCreatedAt: string;
  }[];
  latestCreatedAt: string;
}

type FeedItem = CoalescedGroup | (FeedEntry & { kind: "solo" });

const COALESCE_WINDOW_MS = 6 * 60 * 60 * 1000;

function groupBySong(entries: FeedEntry[]): FeedItem[] {
  const items: FeedItem[] = [];
  const groupMap = new Map<string, CoalescedGroup>();

  for (const entry of entries) {
    const group = groupMap.get(entry.songId);
    if (group) {
      const groupTime = new Date(group.latestCreatedAt).getTime();
      const entryTime = new Date(entry.createdAt).getTime();
      if (Math.abs(groupTime - entryTime) <= COALESCE_WINDOW_MS) {
        const existingUser = group.users.find((u) => u.userId === entry.userId);
        if (existingUser) {
          if (!existingUser.types.includes(entry.type)) {
            existingUser.types.push(entry.type);
          }
          if (entry.body) existingUser.bodies.push(entry.body);
          if (entry.createdAt > existingUser.latestCreatedAt) {
            existingUser.latestCreatedAt = entry.createdAt;
          }
        } else {
          group.users.push({
            userId: entry.userId,
            username: entry.username,
            displayName: entry.displayName,
            avatarUrl: entry.avatarUrl,
            types: [entry.type],
            bodies: entry.body ? [entry.body] : [],
            entryId: entry.entryId,
            latestCreatedAt: entry.createdAt,
          });
        }
        if (entry.createdAt > group.latestCreatedAt) {
          group.latestCreatedAt = entry.createdAt;
        }
        continue;
      }
    }

    groupMap.set(entry.songId, {
      kind: "group",
      songId: entry.songId,
      songTitle: entry.songTitle,
      songSlug: entry.songSlug,
      artistName: entry.artistName,
      albumArtUrl: entry.albumArtUrl,
      users: [{
        userId: entry.userId,
        username: entry.username,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        types: [entry.type],
        bodies: entry.body ? [entry.body] : [],
        entryId: entry.entryId,
        latestCreatedAt: entry.createdAt,
      }],
      latestCreatedAt: entry.createdAt,
    });
    items.push(groupMap.get(entry.songId)!);
  }

  return items.map((item) => {
    if (item.kind === "group" && item.users.length === 1) {
      const u = item.users[0];
      return {
        kind: "solo" as const,
        entryId: u.entryId,
        userId: u.userId,
        type: u.types[0] as FeedEntry["type"],
        body: u.bodies[0] ?? null,
        createdAt: u.latestCreatedAt,
        songId: item.songId,
        songTitle: item.songTitle,
        songSlug: item.songSlug,
        artistName: item.artistName,
        albumArtUrl: item.albumArtUrl,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      };
    }
    return item;
  });
}

export { groupBySong };

function toEntryCardData(entry: FeedEntry): EntryCardData {
  return {
    entryId: entry.entryId,
    entryType: entry.type,
    songTitle: entry.songTitle,
    songSlug: entry.songSlug,
    artistName: entry.artistName,
    albumArtUrl: entry.albumArtUrl,
    username: entry.username,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    reviewBody: entry.body,
    createdAt: entry.createdAt,
  };
}

interface FeedTimelineProps {
  pages: FeedEntry[][];
}

export function FeedTimeline({ pages }: FeedTimelineProps) {
  return (
    <div className="mx-auto max-w-2xl">
      {pages.map((page, pageIdx) => {
        const items = groupBySong(page);
        return (
          <div key={pageIdx}>
            {items.map((item, i) => {
              if (item.kind === "group") {
                return <CoalescedCard key={`${item.songId}-${i}`} group={item} />;
              }
              return (
                <EntryCard
                  key={item.entryId || `${item.songId}-${i}`}
                  data={toEntryCardData(item as FeedEntry)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
