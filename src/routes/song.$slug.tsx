import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart, MessageCircle, Play, Pause, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SongData = {
  id: string;
  title: string;
  slug: string;
  genius_thumbnail_url: string | null;
  preview_url: string | null;
  release_date: string | null;
  genre_tags: string[] | null;
  country: string | null;
  credits: Record<string, unknown> | null;
  release_group_mbid: string | null;
  artist: { id: string; name: string; slug: string } | null;
};

type DiaryEntry = {
  id: string;
  user_id: string;
  song_id: string;
  type: "heard" | "want" | "rating" | "review";
  rating: number | null;
  body: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

const RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export const Route = createFileRoute("/song/$slug")({
  head: ({ loaderData }) => {
    const s = (loaderData ?? undefined) as { song: SongData } | undefined;
    const songData = s?.song;
    const title = songData ? `${songData.title} — ${songData.artist?.name ?? "Unknown"} · #drawnto` : "#drawnto";
    return {
      meta: [
        { title },
        { name: "description", content: songData ? `Reviews and listens for ${songData.title}.` : "#drawnto" },
        { property: "og:title", content: title },
        ...(songData?.genius_thumbnail_url
          ? [{ property: "og:image", content: songData.genius_thumbnail_url }]
          : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("songs")
      .select(
        "id, title, slug, genius_thumbnail_url, preview_url, release_date, genre_tags, country, credits, release_group_mbid, artist:artists(id,name,slug)",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { song: data as unknown as SongData };
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
          <Link to="/" className="text-xs font-semibold" style={{ color: "#D4556A" }}>
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

function SongPage() {
  const { song } = Route.useLoaderData() as { song: SongData };
  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<DiaryEntry[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [myEntries, setMyEntries] = useState<{
    heard: DiaryEntry[];
    want: DiaryEntry | null;
    rating: DiaryEntry | null;
    review: DiaryEntry | null;
  }>({ heard: [], want: null, rating: null, review: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from("diary_entries")
      .select(
        "id, user_id, song_id, type, rating, body, created_at, updated_at, profile:profiles(username,display_name,avatar_url)",
      )
      .eq("song_id", song.id)
      .eq("type", "review")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as unknown as Omit<
      DiaryEntry,
      "like_count" | "liked_by_me" | "comment_count"
    >[];

    const ids = rows.map((r) => r.id);
    let reviewLikes = new Map<string, number>();
    let commentCounts = new Map<string, number>();
    let myLikes = new Set<string>();

    if (ids.length) {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("review_likes").select("entry_id, user_id").in("entry_id", ids),
        supabase.from("review_comments").select("entry_id").in("entry_id", ids),
      ]);
      (likes ?? []).forEach((l: { entry_id: string; user_id: string }) => {
        reviewLikes.set(l.entry_id, (reviewLikes.get(l.entry_id) ?? 0) + 1);
        if (userId && l.user_id === userId) myLikes.add(l.entry_id);
      });
      (comments ?? []).forEach((c: { entry_id: string }) =>
        commentCounts.set(c.entry_id, (commentCounts.get(c.entry_id) ?? 0) + 1),
      );
    }

    setReviews(
      rows.map((r) => ({
        ...r,
        like_count: reviewLikes.get(r.id) ?? 0,
        liked_by_me: myLikes.has(r.id),
        comment_count: commentCounts.get(r.id) ?? 0,
      })),
    );
    setLoadingReviews(false);
  }, [song.id, userId]);

  const loadMyEntries = useCallback(async () => {
    if (!userId) {
      setMyEntries({ heard: [], want: null, rating: null, review: null });
      return;
    }
    const { data } = await supabase
      .from("diary_entries")
      .select("id, user_id, song_id, type, rating, body, created_at, updated_at")
      .eq("user_id", userId)
      .eq("song_id", song.id)
      .order("created_at", { ascending: false });

    const heard: DiaryEntry[] = [];
    let want: DiaryEntry | null = null;
    let rating: DiaryEntry | null = null;
    let review: DiaryEntry | null = null;

    (data ?? []).forEach((e) => {
      const entry = e as unknown as DiaryEntry;
      switch (entry.type) {
        case "heard":
          heard.push(entry);
          break;
        case "want":
          want = entry;
          break;
        case "rating":
          rating = entry;
          break;
        case "review":
          review = entry;
          break;
      }
    });

    setMyEntries({ heard, want, rating, review });
  }, [userId, song.id]);

  useEffect(() => {
    loadReviews();
    loadMyEntries();
  }, [loadReviews, loadMyEntries]);

  async function toggleLike(entry: DiaryEntry) {
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

  function canEditReview(entry: DiaryEntry): boolean {
    return new Date(entry.created_at).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now();
  }

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          {/* Cover art */}
          <div className="mx-auto w-full max-w-[320px] md:mx-0">
            <div
              className="aspect-square w-full overflow-hidden rounded-2xl"
              style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
            >
              {song.genius_thumbnail_url ? (
                <img src={song.genius_thumbnail_url} alt={song.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl text-white/20">
                  ♫
                </div>
              )}
            </div>
            <PreviewButton url={song.preview_url} />
          </div>

          {/* Song info + actions */}
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white">{song.title}</h1>
            <p className="mt-1 text-lg" style={{ color: "#E07B6A" }}>
              {song.artist?.name ?? "Unknown artist"}
            </p>

            {song.release_date && (
              <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: "#8A8276" }}>
                {new Date(song.release_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {song.country ? ` · ${song.country}` : ""}
              </p>
            )}

            {song.genre_tags && song.genre_tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {song.genre_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: "rgba(245,240,232,0.08)", color: "#8A8276" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-5 flex flex-wrap gap-2">
              <HeardButton
                songId={song.id}
                userId={userId}
                entries={myEntries.heard}
                onUpdate={loadMyEntries}
              />
              <WantButton
                songId={song.id}
                userId={userId}
                entry={myEntries.want}
                onUpdate={loadMyEntries}
              />
            </div>

            {/* Star rating widget */}
            {userId ? (
              <StarRating
                songId={song.id}
                userId={userId}
                entry={myEntries.rating}
                onUpdate={loadMyEntries}
              />
            ) : null}

            {/* Review composer */}
            {userId ? (
              <ReviewComposer
                songId={song.id}
                userId={userId}
                entry={myEntries.review}
                canEdit={myEntries.review ? canEditReview(myEntries.review) : false}
                onPosted={() => {
                  loadReviews();
                  loadMyEntries();
                }}
              />
            ) : (
              <div
                className="mt-8 rounded-2xl p-5 text-sm"
                style={{
                  backgroundColor: "#000000",
                  border: "1px solid rgba(245,240,232,0.08)",
                  color: "#8A8276",
                }}
              >
                <Link to="/" style={{ color: "#D4556A" }} className="font-semibold">
                  Sign in
                </Link>{" "}
                to rate, review, or log a listen.
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">Reviews</h2>
          {loadingReviews ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : reviews.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center text-sm"
              style={{
                backgroundColor: "#000000",
                border: "1px solid rgba(245,240,232,0.08)",
                color: "#8A8276",
              }}
            >
              No reviews yet. Be the first.
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  userId={userId}
                  onToggleLike={() => toggleLike(r)}
                />
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
  const audio = useAudio(url);
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
      style={{ backgroundColor: "#D4556A" }}
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
      {playing ? "Pause preview" : "Play 30s preview"}
    </button>
  );
}

function useAudio(url: string | null) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!url || typeof Audio === "undefined") return;
    const a = new Audio(url);
    setAudio(a);
    return () => { a.pause(); };
  }, [url]);
  return audio;
}

/* ------- Heard Button ------- */

function HeardButton({
  songId,
  userId,
  entries,
  onUpdate,
}: {
  songId: string;
  userId: string | null;
  entries: DiaryEntry[];
  onUpdate: () => void;
}) {
  const count = entries.length;
  const today = new Date().toISOString().slice(0, 10);
  const heardToday = entries.some((e) => e.created_at?.slice(0, 10) === today);

  async function handle() {
    if (!userId) return toast.error("Sign in to log listens.");
    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      song_id: songId,
      type: "heard",
      listened_on: today,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logged your listen.");
    onUpdate();
  }

  return (
    <button
      onClick={handle}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        backgroundColor: heardToday ? "#4A9E6E" : "#000000",
        border: "1px solid rgba(245,240,232,0.08)",
        color: heardToday ? "#000000" : "white",
      }}
    >
      {heardToday ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
      Heard{count > 1 ? ` (${count})` : ""}
    </button>
  );
}

/* ------- Want Button ------- */

function WantButton({
  songId,
  userId,
  entry,
  onUpdate,
}: {
  songId: string;
  userId: string | null;
  entry: DiaryEntry | null;
  onUpdate: () => void;
}) {
  async function toggle() {
    if (!userId) return toast.error("Sign in to save songs.");
    if (entry) {
      await supabase.from("diary_entries").delete().eq("id", entry.id);
      toast.success("Removed from Want to hear.");
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "want",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Added to Want to hear.");
    }
    onUpdate();
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        backgroundColor: entry ? "#9D8EC4" : "#000000",
        border: "1px solid rgba(245,240,232,0.08)",
        color: entry ? "#000000" : "white",
      }}
    >
      {entry ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
      Want to hear
    </button>
  );
}

/* ------- Star Rating ------- */

function StarRating({
  songId,
  userId,
  entry,
  onUpdate,
}: {
  songId: string;
  userId: string;
  entry: DiaryEntry | null;
  onUpdate: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  async function setRating(r: number) {
    if (entry) {
      const { error } = await supabase
        .from("diary_entries")
        .update({ rating: r })
        .eq("id", entry.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "rating",
        rating: r,
      });
      if (error) return toast.error(error.message);
    }
    onUpdate();
  }

  return (
    <div className="mt-3 flex items-center gap-1.5">
      {RATINGS.map((r) => (
        <button
          key={r}
          onClick={() => setRating(r)}
          onMouseEnter={() => setHover(r)}
          onMouseLeave={() => setHover(null)}
          className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
          style={{
            backgroundColor:
              (hover ?? entry?.rating ?? 0) >= r ? "#D4556A" : "transparent",
            color: (hover ?? entry?.rating ?? 0) >= r ? "white" : "#8A8276",
            border: "1px solid rgba(245,240,232,0.08)",
          }}
        >
          {r}★
        </button>
      ))}
      {entry?.rating && (
        <span className="ml-1 text-xs" style={{ color: "#8A8276" }}>
          Your rating: {entry.rating}
        </span>
      )}
    </div>
  );
}

/* ------- Review Composer ------- */

function ReviewComposer({
  songId,
  userId,
  entry,
  canEdit,
  onPosted,
}: {
  songId: string;
  userId: string;
  entry: DiaryEntry | null;
  canEdit: boolean;
  onPosted: () => void;
}) {
  const [body, setBody] = useState(entry?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!entry;

  async function submit() {
    setSubmitting(true);
    if (isEditing) {
      if (!canEdit) {
        setSubmitting(false);
        return toast.error("Reviews can only be edited within 48 hours.");
      }
      const { error } = await supabase
        .from("diary_entries")
        .update({ body: body.trim() || null })
        .eq("id", entry.id);
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Review updated.");
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "review",
        body: body.trim() || null,
      });
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Review posted.");
    }
    setBody("");
    onPosted();
  }

  if (isEditing && !canEdit) {
    return (
      <div
        className="mt-8 rounded-2xl p-5"
        style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <p className="text-sm" style={{ color: "#8A8276" }}>
          Your review is locked — editing is only available for 48 hours after posting.
        </p>
        {entry.body && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-white/90">{entry.body}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-8 rounded-2xl p-5"
      style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a review…"
        rows={3}
        className="w-full resize-none rounded-xl bg-transparent p-3 text-sm text-white outline-none"
        style={{ border: "1px solid rgba(245,240,232,0.08)" }}
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={submitting}
          onClick={submit}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#D4556A" }}
        >
          {submitting ? "Posting…" : isEditing ? "Update review" : "Post review"}
        </button>
      </div>
    </div>
  );
}

/* ------- Review Card ------- */

function ReviewCard({
  review,
  userId,
  onToggleLike,
}: {
  review: DiaryEntry;
  userId: string | null;
  onToggleLike: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    Array<{
      id: string;
      body: string;
      user_id: string;
      created_at: string;
      profile: { username: string; display_name: string | null } | null;
    }>
  >([]);
  const [newComment, setNewComment] = useState("");

  async function loadComments() {
    const { data } = await supabase
      .from("review_comments")
      .select("id, body, user_id, created_at, profile:profiles(username,display_name)")
      .eq("entry_id", review.id)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as never);
  }

  async function postComment() {
    if (!userId) return toast.error("Sign in to comment.");
    const body = newComment.trim();
    if (!body) return;
    const { error } = await supabase
      .from("review_comments")
      .insert({ entry_id: review.id, user_id: userId, body });
    if (error) return toast.error(error.message);
    setNewComment("");
    loadComments();
  }

  const name = review.profile?.display_name || review.profile?.username || "Someone";
  return (
    <li
      className="rounded-2xl p-4"
      style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
          style={{ backgroundColor: "#9D8EC4", color: "#000000" }}
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
            <span className="text-xs" style={{ color: "#8A8276" }}>
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {review.body && <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">{review.body}</p>}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={onToggleLike}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: review.liked_by_me ? "#D4556A" : "#8A8276" }}
            >
              <Heart size={14} fill={review.liked_by_me ? "#D4556A" : "none"} />
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
              style={{ color: "#8A8276" }}
            >
              <MessageCircle size={14} />
              {review.comment_count}
            </button>
          </div>

          {showComments && (
            <div
              className="mt-3 space-y-2 border-t pt-3"
              style={{ borderColor: "rgba(245,240,232,0.08)" }}
            >
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
                    style={{ border: "1px solid rgba(245,240,232,0.08)" }}
                    onKeyDown={(e) => e.key === "Enter" && postComment()}
                  />
                  <button
                    onClick={postComment}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "#D4556A" }}
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "#8A8276" }}>
                  <Link to="/" style={{ color: "#D4556A" }}>
                    Sign in
                  </Link>{" "}
                  to reply.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
