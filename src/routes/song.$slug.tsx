import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart, MessageCircle, ExternalLink, Play, Pause, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Song = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  preview_url: string | null;
  spotify_url: string | null;
  release_date: string | null;
  artist: { id: string; name: string; slug: string } | null;
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export const Route = createFileRoute("/song/$slug")({
  head: ({ loaderData }) => {
    const s = loaderData as { song: Song } | undefined;
    const title = s?.song ? `${s.song.title} — ${s.song.artist?.name ?? "Unknown"} · #drawnto` : "#drawnto";
    return {
      meta: [
        { title },
        { name: "description", content: s?.song ? `Reviews and listens for ${s.song.title}.` : "#drawnto" },
        { property: "og:title", content: title },
        ...(s?.song?.cover_url ? [{ property: "og:image", content: s.song.cover_url }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, slug, cover_url, preview_url, spotify_url, release_date, artist:artists(id,name,slug)")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { song: data as unknown as Song };
  },
  component: SongPage,
  errorComponent: ({ error }) => (
    <Shell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Couldn't load this song. {error.message}
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
    <div className="min-h-screen" style={{ backgroundColor: "#0D0A06", color: "white" }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: "rgba(13,10,6,0.9)", borderColor: "#2A2028", backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="text-2xl font-black tracking-tight text-white">#d.To</Link>
          <Link to="/" className="text-xs font-semibold" style={{ color: "#E8624A" }}>
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

function SongPage() {
  const { song } = Route.useLoaderData();
  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [libStatus, setLibStatus] = useState<"heard" | "want" | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, user_id, rating, body, created_at, profile:profiles(username,display_name,avatar_url)")
      .eq("song_id", song.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as Array<Omit<Review, "like_count" | "liked_by_me" | "comment_count">>;
    const ids = rows.map((r) => r.id);
    let likeCounts = new Map<string, number>();
    let commentCounts = new Map<string, number>();
    let myLikes = new Set<string>();
    if (ids.length) {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("review_likes").select("review_id, user_id").in("review_id", ids),
        supabase.from("review_comments").select("review_id").in("review_id", ids),
      ]);
      (likes ?? []).forEach((l: { review_id: string; user_id: string }) => {
        likeCounts.set(l.review_id, (likeCounts.get(l.review_id) ?? 0) + 1);
        if (userId && l.user_id === userId) myLikes.add(l.review_id);
      });
      (comments ?? []).forEach((c: { review_id: string }) =>
        commentCounts.set(c.review_id, (commentCounts.get(c.review_id) ?? 0) + 1),
      );
    }
    setReviews(
      rows.map((r) => ({
        ...r,
        like_count: likeCounts.get(r.id) ?? 0,
        liked_by_me: myLikes.has(r.id),
        comment_count: commentCounts.get(r.id) ?? 0,
      })),
    );
    setLoadingReviews(false);
  }, [song.id, userId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!userId) {
      setLibStatus(null);
      return;
    }
    supabase
      .from("library_entries")
      .select("status")
      .eq("user_id", userId)
      .eq("song_id", song.id)
      .maybeSingle()
      .then(({ data }) => setLibStatus((data?.status as "heard" | "want" | null) ?? null));
  }, [userId, song.id]);

  async function toggleLibrary(status: "heard" | "want") {
    if (!userId) return toast.error("Sign in to save songs.");
    if (libStatus === status) {
      await supabase.from("library_entries").delete().eq("user_id", userId).eq("song_id", song.id);
      setLibStatus(null);
    } else {
      await supabase
        .from("library_entries")
        .upsert({ user_id: userId, song_id: song.id, status }, { onConflict: "user_id,song_id" });
      setLibStatus(status);
      toast.success(status === "heard" ? "Added to Heard." : "Added to Want to hear.");
    }
  }

  async function toggleLike(r: Review) {
    if (!userId) return toast.error("Sign in to like.");
    if (r.liked_by_me) {
      await supabase.from("review_likes").delete().eq("review_id", r.id).eq("user_id", userId);
    } else {
      await supabase.from("review_likes").insert({ review_id: r.id, user_id: userId });
    }
    setReviews((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
          : x,
      ),
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          <div className="mx-auto w-full max-w-[320px] md:mx-0">
            <div
              className="aspect-square w-full overflow-hidden rounded-2xl"
              style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}
            >
              {song.cover_url ? (
                <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <PreviewButton url={song.preview_url} />
          </div>

          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white">{song.title}</h1>
            <p className="mt-1 text-lg" style={{ color: "#E07B6A" }}>{song.artist?.name ?? "Unknown artist"}</p>
            {song.release_date && (
              <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: "#8A7A6A" }}>
                {song.release_date}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => toggleLibrary("heard")}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: libStatus === "heard" ? "#8A9E7A" : "#1A1510",
                  border: "1px solid #2A2028",
                  color: libStatus === "heard" ? "#0D0A06" : "white",
                }}
              >
                {libStatus === "heard" ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                Heard
              </button>
              <button
                onClick={() => toggleLibrary("want")}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: libStatus === "want" ? "#9D8EC4" : "#1A1510",
                  border: "1px solid #2A2028",
                  color: libStatus === "want" ? "#0D0A06" : "white",
                }}
              >
                {libStatus === "want" ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                Want to hear
              </button>
              {song.spotify_url && (
                <a
                  href={song.spotify_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}
                >
                  <ExternalLink size={14} /> Spotify
                </a>
              )}
            </div>

            {userId ? (
              <ReviewComposer songId={song.id} userId={userId} onPosted={loadReviews} />
            ) : (
              <div
                className="mt-8 rounded-2xl p-5 text-sm"
                style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028", color: "#8A7A6A" }}
              >
                <Link to="/" style={{ color: "#E8624A" }} className="font-semibold">
                  Sign in
                </Link>{" "}
                to rate this song, write a review, or log a listen.
              </div>
            )}
          </div>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">Reviews</h2>
          {loadingReviews ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : reviews.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center text-sm"
              style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028", color: "#8A7A6A" }}
            >
              No reviews yet. Be the first — this song is waiting to be chosen.
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} userId={userId} onToggleLike={() => toggleLike(r)} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </Shell>
  );
}

function PreviewButton({ url }: { url: string | null }) {
  const [playing, setPlaying] = useState(false);
  const audio = useMemo(() => (typeof Audio !== "undefined" && url ? new Audio(url) : null), [url]);
  useEffect(() => {
    if (!audio) return;
    const stop = () => setPlaying(false);
    audio.addEventListener("ended", stop);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", stop);
    };
  }, [audio]);
  if (!url || !audio) return null;
  return (
    <button
      onClick={() => {
        if (playing) {
          audio.pause();
          setPlaying(false);
        } else {
          audio.play();
          setPlaying(true);
        }
      }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white"
      style={{ backgroundColor: "#E8624A" }}
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
      {playing ? "Pause preview" : "Play 30s preview"}
    </button>
  );
}

const RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function ReviewComposer({ songId, userId, onPosted }: { songId: string; userId: string; onPosted: () => void }) {
  const [rating, setRating] = useState<number>(4);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      song_id: songId,
      rating,
      body: body.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setBody("");
    toast.success("Review posted.");
    onPosted();
  }

  return (
    <div className="mt-8 rounded-2xl p-5" style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}>
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider" style={{ color: "#8A7A6A" }}>Rate</span>
        <div className="flex flex-wrap gap-1">
          {RATINGS.map((r) => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: rating === r ? "#E8624A" : "transparent",
                color: rating === r ? "white" : "#8A7A6A",
                border: "1px solid #2A2028",
              }}
            >
              {r}★
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say something about this song (optional)…"
        rows={3}
        className="mt-3 w-full resize-none rounded-xl bg-transparent p-3 text-sm text-white outline-none"
        style={{ border: "1px solid #2A2028" }}
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={submitting}
          onClick={submit}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#E8624A" }}
        >
          {submitting ? "Posting…" : "Post review"}
        </button>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  userId,
  onToggleLike,
}: {
  review: Review;
  userId: string | null;
  onToggleLike: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; body: string; user_id: string; created_at: string; profile: { username: string; display_name: string | null } | null }>>([]);
  const [newComment, setNewComment] = useState("");

  async function loadComments() {
    const { data } = await supabase
      .from("review_comments")
      .select("id, body, user_id, created_at, profile:profiles(username,display_name)")
      .eq("review_id", review.id)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as never);
  }

  async function postComment() {
    if (!userId) return toast.error("Sign in to comment.");
    const body = newComment.trim();
    if (!body) return;
    const { error } = await supabase.from("review_comments").insert({ review_id: review.id, user_id: userId, body });
    if (error) return toast.error(error.message);
    setNewComment("");
    loadComments();
  }

  const name = review.profile?.display_name || review.profile?.username || "Someone";
  return (
    <li className="rounded-2xl p-4" style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
          style={{ backgroundColor: "#9D8EC4", color: "#0D0A06" }}
        >
          {review.profile?.avatar_url ? (
            <img src={review.profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-xs" style={{ color: "#E8624A" }}>{review.rating}★</span>
            <span className="text-xs" style={{ color: "#8A7A6A" }}>
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {review.body && <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">{review.body}</p>}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={onToggleLike}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: review.liked_by_me ? "#E8624A" : "#8A7A6A" }}
            >
              <Heart size={14} fill={review.liked_by_me ? "#E8624A" : "none"} />
              {review.like_count}
            </button>
            <button
              onClick={() => {
                setShowComments((s) => {
                  const next = !s;
                  if (next) loadComments();
                  return next;
                });
              }}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "#8A7A6A" }}
            >
              <MessageCircle size={14} />
              {review.comment_count}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "#2A2028" }}>
              {comments.map((c) => (
                <div key={c.id} className="text-xs">
                  <span className="font-semibold text-white">
                    {c.profile?.display_name || c.profile?.username || "Someone"}
                  </span>{" "}
                  <span className="text-white/80">{c.body}</span>
                </div>
              ))}
              {userId ? (
                <div className="flex gap-2 pt-1">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Reply…"
                    className="flex-1 rounded-full bg-transparent px-3 py-1.5 text-xs text-white outline-none"
                    style={{ border: "1px solid #2A2028" }}
                    onKeyDown={(e) => e.key === "Enter" && postComment()}
                  />
                  <button
                    onClick={postComment}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "#E8624A" }}
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "#8A7A6A" }}>
                  <Link to="/" style={{ color: "#E8624A" }}>Sign in</Link> to reply.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
