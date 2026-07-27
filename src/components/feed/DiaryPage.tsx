import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DiaryCard, type DiaryCardData } from "./DiaryCard";
import { Button } from "@/components/ui/button";

type DiaryTab = "activity" | "want";

export function DiaryPage() {
  const [activeSub, setActiveSub] = useState<DiaryTab>("activity");
  const [activityCards, setActivityCards] = useState<DiaryCardData[]>([]);
  const [wantCards, setWantCards] = useState<DiaryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error: entriesError } = await supabase
      .from("diary_entries")
      .select(`
        id, type, created_at, song_id,
        song:songs ( id, title, slug, genius_thumbnail_url, artist:artists!songs_artist_id_fkey ( name ) )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (entriesError) {
      setError(entriesError.message);
      setLoading(false);
      return;
    }

    const entries = (data ?? []) as any[];

    const songMap = new Map<string, DiaryCardData>();
    for (const e of entries) {
      const existing = songMap.get(e.song_id);
      if (existing) {
        switch (e.type) {
          case "heard": existing.heard = true; break;
          case "like": existing.liked = true; break;
          case "dislike": existing.disliked = true; break;
          case "review": existing.reviewed = true; break;
          case "want": existing.want = true; break;
        }
      } else {
        songMap.set(e.song_id, {
          songId: e.song_id,
          songTitle: e.song?.title ?? "Unknown",
          songSlug: e.song?.slug ?? "",
          artistName: e.song?.artist?.name ?? null,
          albumArtUrl: e.song?.genius_thumbnail_url ?? null,
          heard: e.type === "heard",
          liked: e.type === "like",
          disliked: e.type === "dislike",
          reviewed: e.type === "review",
          want: e.type === "want",
        });
      }
    }

    const allCards = Array.from(songMap.values());
    setActivityCards(allCards.filter((c) => c.heard || c.liked || c.disliked || c.reviewed));
    setWantCards(allCards.filter((c) => c.want));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const subTabs: { id: DiaryTab; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "want", label: "Want to Hear" },
  ];

  return (
    <div>
      <div className="flex gap-2 bg-background px-3 py-2">
        {subTabs.map((t) => {
          const isActive = t.id === activeSub;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setActiveSub(t.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border bg-raised text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Something went wrong loading your diary.</p>
          <Button variant="secondary" size="sm" shape="pill" className="mt-3" onClick={load}>Try again</Button>
        </div>
      ) : loading ? (
        <div className="mx-auto max-w-2xl px-4 py-16">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-3 h-20 rounded-xl animate-skeleton" />
          ))}
        </div>
      ) : activeSub === "activity" ? (
        activityCards.length === 0 ? (
          <div className="mx-auto max-w-md px-4 py-16 text-center">
            <h2 className="font-serif text-xl font-bold italic text-primary">
              No activity yet.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Log your first listen, like, or review a song.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            {activityCards.map((card) => (
              <DiaryCard key={card.songId} data={card} />
            ))}
          </div>
        )
      ) : wantCards.length === 0 ? (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h2 className="font-serif text-xl font-bold italic text-want">
            No songs saved.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Mark songs you want to hear — they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          {wantCards.map((card) => (
            <DiaryCard key={card.songId} data={card} />
          ))}
        </div>
      )}
    </div>
  );
}
