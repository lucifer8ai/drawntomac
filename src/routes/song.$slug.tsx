import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Share2, Pencil } from "lucide-react";
import { slugifyBase } from "@/lib/slugify";
import { resolveBackURL } from "@/lib/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewEntry } from "@/components/song";
import { SongShareCard } from "@/components/share/SongShareCard";
import { useShareCard } from "@/hooks/useShareCard";

const REVIEWS_PER_PAGE = 10;

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };
type DiaryEntry = Tables<"diary_entries">;
type Profile = Pick<Tables<"profiles">, "username" | "display_name" | "avatar_url">;

type LoaderData = {
  song: SongWithArtist;
  songArtists: Array<{
    artist_id: string;
    position: number;
    join_phrase: string;
    artist: Tables<"artists"> | null;
  }>;
  artworkUrl: string | null;
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
        ...(data?.artworkUrl
          ? [{ property: "og:image", content: data.artworkUrl }]
          : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: song, error } = await supabase
      .from("songs")
      .select("*, artist:artists!songs_artist_id_fkey(*), release_group:release_groups!songs_release_group_id_fkey(primary_type, image_url)")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!song) throw notFound();

    // Album dedup: if Album RG has image, use it instead of per-song thumbnail
    const releaseGroup = (song as any).release_group;
    const artworkUrl = (releaseGroup?.primary_type === 'Album' && releaseGroup?.image_url)
      ? releaseGroup.image_url
      : (song as any).genius_thumbnail_url;

    const { data: songArtists } = await supabase
      .from("song_artists")
      .select("artist_id, position, join_phrase, artist:artists!song_artists_artist_id_fkey(*)")
      .eq("song_id", (song as any).id)
      .order("position");

    return {
      song: song as unknown as SongWithArtist,
      songArtists: (songArtists ?? []) as LoaderData["songArtists"],
      artworkUrl,
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

function Shell({ children, onShare, from, fromSlug }: { children: React.ReactNode; onShare?: () => void; from?: string; fromSlug?: string }) {
  const backURL = resolveBackURL(from, fromSlug);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="text-2xl font-black tracking-tight text-foreground">
            #d.To
          </Link>
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label="Share this song"
                className="flex items-center justify-center h-9 w-9 rounded-lg border bg-raised text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 size={16} />
              </button>
            )}
            <Link {...backURL} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function ReviewSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border bg-raised p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SongPage() {
  const { song, songArtists, artworkUrl } = Route.useLoaderData() as LoaderData;
  const router = useRouter();
  const search = router.state.location.search as Record<string, unknown>;
  const from = search.from as string | undefined;
  const fromSlug = search.fromSlug as string | undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [myEntries, setMyEntries] = useState<{
    heard: DiaryEntry | null;
    want: DiaryEntry | null;
    like: DiaryEntry | null;
    dislike: DiaryEntry | null;
    review: DiaryEntry | null;
  }>({ heard: null, want: null, like: null, dislike: null, review: null });

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
      .select("*", { count: "exact" })
      .eq("song_id", song.id)
      .eq("type", "review")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setLoadingReviews(false);
      return;
    }

    const rows = (data ?? []) as DiaryEntry[];
    setTotalReviewCount(count ?? 0);
    const ids = rows.map((r) => r.id);

    // Fetch profiles separately — embedded join fails because diary_entries.user_id
    // FK points to auth.users, not profiles, and PostgREST can't resolve the chain.
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    let profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));
    }

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
        profile: profileMap.get(r.user_id) ?? null,
        like_count: likeMap.get(r.id) ?? 0,
        liked_by_me: myLikeSet.has(r.id),
        comment_count: commentMap.get(r.id) ?? 0,
      })),
    );
    setLoadingReviews(false);
  }, [song.id, reviewPage, userId]);

  const loadMyEntries = useCallback(async () => {
    if (!userId) {
      setMyEntries({ heard: null, want: null, like: null, dislike: null, review: null });
      return;
    }
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("song_id", song.id)
      .order("created_at", { ascending: false });

    let heard: DiaryEntry | null = null;
    let want: DiaryEntry | null = null;
    let like: DiaryEntry | null = null;
    let dislike: DiaryEntry | null = null;
    let review: DiaryEntry | null = null;

    (data ?? []).forEach((e) => {
      const entry = e as DiaryEntry;
      switch (entry.type) {
        case "heard": heard = entry; break;
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

  const heardToday = myEntries.heard !== null;
  const hasInteractions =
    myEntries.like !== null || myEntries.dislike !== null || myEntries.review !== null;

  const totalPages = Math.max(1, Math.ceil(totalReviewCount / REVIEWS_PER_PAGE));

  const shareBadges: { type: string; label: string }[] = [];
  if (myEntries.heard) shareBadges.push({ type: "heard", label: "heard" });
  if (myEntries.like) shareBadges.push({ type: "like", label: "liked" });
  if (myEntries.dislike) shareBadges.push({ type: "dislike", label: "disliked" });
  if (myEntries.want) shareBadges.push({ type: "want", label: "want to hear" });
  if (myEntries.review) shareBadges.push({ type: "reviewed", label: "reviewed" });

  const { cardRef, share } = useShareCard({ filename: `${slugifyBase(song.title)}-taste-card.png` });

  const handleShare = async () => {
    const card = cardRef.current;
    if (!card) return;
    toast.promise(share(`${song.title} on #drawnto`), {
      loading: "Generating taste card…",
      success: "Taste card ready!",
      error: "Couldn't generate taste card.",
    });
  };

  return (
    <Shell onShare={handleShare} from={from} fromSlug={fromSlug}>
      <div className="absolute left-[-9999px] top-0" aria-hidden="true">
        <SongShareCard
          ref={cardRef as React.Ref<HTMLDivElement>}
          coverUrl={artworkUrl}
          title={song.title}
          artistName={song.artist?.name ?? null}
          badges={shareBadges}
        />
      </div>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-[152px] md:pb-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr]">
          <CoverArt
            url={artworkUrl}
            title={song.title}
            previewUrl={song.preview_url}
          />

          <div>
            <SongHeader
              song={{
                title: song.title,
                release_date: song.release_date,
                genre_tags: song.genre_tags,
                preview_url: song.preview_url,
                artist: song.artist,
              }}
              songArtists={songArtists as any}
            />

            {!userId && <ReviewPrompt />}

          {userId && (heardToday || hasInteractions) && (
            <div id="review-section" className="mt-5">
              <ReviewComposer
                songId={song.id}
                userId={userId}
                entry={myEntries.review}
                onPosted={() => {
                  setReviewPage(1);
                  void loadReviews();
                  void loadMyEntries();
                }}
              />
            </div>
          )}

          <div className="hidden md:block">
            <div className="mt-5 flex flex-wrap gap-2">
              {!myEntries.want && (
                <HeardButton
                  songId={song.id}
                  userId={userId}
                  entry={myEntries.heard}
                  wantEntry={myEntries.want}
                  onUpdate={loadMyEntries}
                />
              )}
              {!heardToday && !hasInteractions && (
                <WantButton
                  songId={song.id}
                  userId={userId}
                  entry={myEntries.want}
                  onUpdate={loadMyEntries}
                />
              )}
            </div>

            {userId && (heardToday || hasInteractions) && (
              <LikeDislike
                songId={song.id}
                userId={userId}
                likeEntry={myEntries.like}
                dislikeEntry={myEntries.dislike}
                onUpdate={loadMyEntries}
              />
            )}

            {userId && !heardToday && !hasInteractions && !myEntries.want && (
              <p className="mt-4 text-sm text-muted-foreground">
                Log a listen to like, dislike, or review this song.
              </p>
            )}
          </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-white">
            Reviews{totalReviewCount > 0 ? ` (${totalReviewCount})` : ""}
          </h2>
          {loadingReviews ? (
            <ReviewSkeletons />
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

      {/* Mobile fixed action bar — above BottomNav (z-40) */}
      {userId && (
        <div className="block md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t pb-safe">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            {!myEntries.want && (
              <HeardButton
                songId={song.id}
                userId={userId}
                entry={myEntries.heard}
                wantEntry={myEntries.want}
                onUpdate={loadMyEntries}
              />
            )}
            {!heardToday && !hasInteractions && (
              <WantButton
                songId={song.id}
                userId={userId}
                entry={myEntries.want}
                onUpdate={loadMyEntries}
              />
            )}
            {userId && (heardToday || hasInteractions) && (
              <>
                <LikeDislike
                  songId={song.id}
                  userId={userId}
                  likeEntry={myEntries.like}
                  dislikeEntry={myEntries.dislike}
                  onUpdate={loadMyEntries}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("review-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
                >
                  <Pencil size={12} />
                  Review
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
