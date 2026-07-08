import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";
import {
  CoverArt,
  SongHeader,
  HeardButton,
  WantButton,
  LikeDislike,
  ReviewComposer,
  ReviewPrompt,
  ReviewList,
  Pagination,
} from "@/components/song";
import type { ReviewEntry } from "@/components/song";

const REVIEWS_PER_PAGE = 10;

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };
type DiaryEntry = Tables<"diary_entries">;
type Profile = Pick<Tables<"profiles">, "username" | "display_name" | "avatar_url">;

type LoaderData = {
  song: SongWithArtist;
};

export const Route = createFileRoute("/song/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const song = data?.song;
    const title = song ? `${song.title} — ${song.artist?.name ?? "Unknown"} · #drawnto` : "#drawnto";
    return {
      meta: [
        { title },
        { name: "description", content: song ? `Reviews and listens for ${song.title}.` : "#drawnto" },
        { property: "og:title", content: title },
        ...(song?.genius_thumbnail_url
          ? [{ property: "og:image", content: song.genius_thumbnail_url }]
          : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: song, error } = await supabase
      .from("songs")
      .select("*, artist:artists(*)")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!song) throw notFound();

    return {
      song: song as unknown as SongWithArtist,
    };
  },
  component: SongPage,
  errorComponent: ({ error }) => (
    <Shell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Couldn&apos;t load this song. {error.message}
      </div>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">Song not found.</div>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#000000", color: "white" }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          backgroundColor: "rgba(0,0,0,0.95)",
          borderColor: "rgba(245,240,232,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="text-2xl font-black tracking-tight text-white">
            #d.To
          </Link>
          <Link to="/home" className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#8A8276" }}>
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

function SongPage() {
  const { song } = Route.useLoaderData() as LoaderData;

  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [myEntries, setMyEntries] = useState<{
    heard: DiaryEntry[];
    want: DiaryEntry | null;
    like: DiaryEntry | null;
    dislike: DiaryEntry | null;
    review: DiaryEntry | null;
  }>({ heard: [], want: null, like: null, dislike: null, review: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    const from = (reviewPage - 1) * REVIEWS_PER_PAGE;
    const to = from + REVIEWS_PER_PAGE - 1;

    const { data, count, error } = await supabase
      .from("diary_entries")
      .select("*, profile:profiles(username,display_name,avatar_url)", { count: "exact" })
      .eq("song_id", song.id)
      .eq("type", "review")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setLoadingReviews(false);
      return;
    }

    const rows = (data ?? []) as unknown as (DiaryEntry & { profile: Profile | null })[];
    setTotalReviewCount(count ?? 0);
    const ids = rows.map((r) => r.id);

    let likeMap = new Map<string, number>();
    let myLikeSet = new Set<string>();
    let commentMap = new Map<string, number>();

    if (ids.length > 0) {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("review_likes").select("entry_id, user_id").in("entry_id", ids),
        supabase.from("review_comments").select("entry_id").in("entry_id", ids),
      ]);

      (likes ?? []).forEach((l: { entry_id: string; user_id: string }) => {
        likeMap.set(l.entry_id, (likeMap.get(l.entry_id) ?? 0) + 1);
        if (userId && l.user_id === userId) myLikeSet.add(l.entry_id);
      });

      (comments ?? []).forEach((c: { entry_id: string }) =>
        commentMap.set(c.entry_id, (commentMap.get(c.entry_id) ?? 0) + 1),
      );
    }

    setReviews(
      rows.map((r) => ({
        ...r,
        profile: r.profile,
        like_count: likeMap.get(r.id) ?? 0,
        liked_by_me: myLikeSet.has(r.id),
        comment_count: commentMap.get(r.id) ?? 0,
      })),
    );
    setLoadingReviews(false);
  }, [song.id, reviewPage, userId]);

  const loadMyEntries = useCallback(async () => {
    if (!userId) {
      setMyEntries({ heard: [], want: null, like: null, dislike: null, review: null });
      return;
    }
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("song_id", song.id)
      .order("created_at", { ascending: false });

    const heard: DiaryEntry[] = [];
    let want: DiaryEntry | null = null;
    let like: DiaryEntry | null = null;
    let dislike: DiaryEntry | null = null;
    let review: DiaryEntry | null = null;

    (data ?? []).forEach((e) => {
      const entry = e as DiaryEntry;
      switch (entry.type) {
        case "heard": heard.push(entry); break;
        case "want": want = entry; break;
        case "like": like = entry; break;
        case "dislike": dislike = entry; break;
        case "review": review = entry; break;
      }
    });

    setMyEntries({ heard, want, like, dislike, review });
  }, [userId, song.id]);

  useEffect(() => {
    loadReviews();
    loadMyEntries();
  }, [loadReviews, loadMyEntries]);

  async function toggleLike(entry: ReviewEntry) {
    if (!userId) return toast.error("Sign in to like.");
    if (entry.liked_by_me) {
      await supabase.from("review_likes").delete().eq("entry_id", entry.id).eq("user_id", userId);
    } else {
      await supabase.from("review_likes").insert({ entry_id: entry.id, user_id: userId });
    }
    setReviews((prev) =>
      prev.map((x) =>
        x.id === entry.id
          ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
          : x,
      ),
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalReviewCount / REVIEWS_PER_PAGE));
  const totalEntries = myEntries.heard.length
    + (myEntries.want ? 1 : 0)
    + (myEntries.like ? 1 : 0)
    + (myEntries.dislike ? 1 : 0)
    + (myEntries.review ? 1 : 0);

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          <CoverArt
            url={song.genius_thumbnail_url}
            title={song.title}
            previewUrl={song.preview_url}
          />

          <div>
            <SongHeader
              song={{
                title: song.title,
                release_date: song.release_date,
                country: song.country,
                genre_tags: song.genre_tags,
                preview_url: song.preview_url,
                artist: song.artist,
              }}
            />

            {!userId && <ReviewPrompt />}

            <div className="mt-5 flex flex-wrap gap-2">
              <HeardButton
                songId={song.id}
                userId={userId}
                entries={myEntries.heard}
                wantEntry={myEntries.want}
                onUpdate={loadMyEntries}
              />
              {totalEntries === 0 && (
                <WantButton
                  songId={song.id}
                  userId={userId}
                  entry={myEntries.want}
                  onUpdate={loadMyEntries}
                />
              )}
            </div>

            {userId && myEntries.heard.length > 0 && (
              <>
                <LikeDislike
                  songId={song.id}
                  userId={userId}
                  likeEntry={myEntries.like}
                  dislikeEntry={myEntries.dislike}
                  onUpdate={loadMyEntries}
                />
                <ReviewComposer
                  songId={song.id}
                  userId={userId}
                  entry={myEntries.review}
                  onPosted={() => {
                    void loadReviews();
                    void loadMyEntries();
                  }}
                />
              </>
            )}

            {userId && myEntries.heard.length === 0 && (
              <p className="mt-4 text-sm" style={{ color: "#8A8276" }}>
                Log a listen to like, dislike, or review this song.
              </p>
            )}
          </div>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-white">
            Reviews{totalReviewCount > 0 ? ` (${totalReviewCount})` : ""}
          </h2>
          {loadingReviews ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : (
            <>
              <ReviewList reviews={reviews} userId={userId} onToggleLike={toggleLike} />
              <Pagination
                page={reviewPage}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setReviewPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>
      </main>
    </Shell>
  );
}
