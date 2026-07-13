import { useState } from "react";
import { toast } from "sonner";
import { Heart, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

type DiaryEntry = Tables<"diary_entries">;

export function LikeDislike({
  songId,
  userId,
  likeEntry,
  dislikeEntry,
  onUpdate,
}: {
  songId: string;
  userId: string | null;
  likeEntry: DiaryEntry | null;
  dislikeEntry: DiaryEntry | null;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [optimisticLike, setOptimisticLike] = useState<DiaryEntry | null>(null);
  const [optimisticDislike, setOptimisticDislike] = useState<DiaryEntry | null>(null);

  const isLiked = optimisticLike ? !!optimisticLike : !!likeEntry;
  const isDisliked = optimisticDislike ? !!optimisticDislike : !!dislikeEntry;

  async function setSentiment(type: "like" | "dislike") {
    if (!userId) return toast.error("Sign in to interact.");
    setLoading(true);

    const currentActive = type === "like" ? isLiked : isDisliked;
    const setOptimistic = type === "like" ? setOptimisticLike : setOptimisticDislike;
    const clearOpposite = type === "like" ? setOptimisticDislike : setOptimisticLike;

    // Optimistic toggle: flip immediately
    setOptimistic(currentActive ? null : { id: crypto.randomUUID() } as DiaryEntry);
    if (!currentActive) clearOpposite(null);

    try {
      const existingEntry = type === "like" ? likeEntry : dislikeEntry;
      const oppositeEntry = type === "like" ? dislikeEntry : likeEntry;

      if (existingEntry) {
        await supabase.from("diary_entries").delete().eq("id", existingEntry.id);
      } else {
        if (oppositeEntry) {
          await supabase.from("diary_entries").delete().eq("id", oppositeEntry.id);
        }
        const { error } = await supabase.from("diary_entries").insert({
          user_id: userId,
          song_id: songId,
          type,
        });
        if (error) throw error;
      }
      if (type === "like") setOptimisticLike(null);
      else setOptimisticDislike(null);
      onUpdate();
    } catch (err: any) {
      if (type === "like") setOptimisticLike(null);
      else setOptimisticDislike(null);
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        aria-label={isLiked ? "Unlike" : "Like"}
        onClick={() => setSentiment("like")}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg min-h-[44px] min-w-[44px] justify-center border bg-raised px-3 py-2 text-sm font-semibold transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
      >
        <Heart
          size={16}
          fill={isLiked ? "var(--color-like)" : "none"}
          color={isLiked ? "var(--color-like)" : "var(--color-muted-foreground)"}
        />
      </button>
      <button
        type="button"
        aria-label={isDisliked ? "Remove dislike" : "Dislike"}
        onClick={() => setSentiment("dislike")}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg min-h-[44px] min-w-[44px] justify-center border bg-raised px-3 py-2 text-sm font-semibold transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
      >
        <ThumbsDown
          size={16}
          fill={isDisliked ? "var(--color-dislike)" : "none"}
          color={isDisliked ? "var(--color-dislike)" : "var(--color-muted-foreground)"}
        />
      </button>
    </div>
  );
}
