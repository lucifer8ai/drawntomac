import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

type DiaryEntry = Tables<"diary_entries">;
type Profile = Pick<Tables<"profiles">, "username" | "display_name" | "avatar_url">;

export type ReviewEntry = DiaryEntry & {
  profile: Profile | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export function ReviewList({
  reviews,
  userId,
  onToggleLike,
}: {
  reviews: ReviewEntry[];
  userId: string | null;
  onToggleLike: (entry: ReviewEntry) => void;
}) {
  if (reviews.length === 0) {
    return (
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
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} userId={userId} onToggleLike={() => onToggleLike(r)} />
      ))}
    </ul>
  );
}

function ReviewCard({
  review,
  userId,
  onToggleLike,
}: {
  review: ReviewEntry;
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
      profile: Profile | null;
    }>
  >([]);
  const [newComment, setNewComment] = useState("");

  async function loadComments() {
    const { data } = await supabase
      .from("review_comments")
      .select("id, body, user_id, created_at, profile:profiles(username,display_name,avatar_url)")
      .eq("entry_id", review.id)
      .order("created_at", { ascending: true });
    setComments((data as unknown as typeof comments) ?? []);
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
          {review.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">{review.body}</p>
          )}
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
