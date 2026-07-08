import { toast } from "sonner";
import { ThumbsUp, ThumbsDown } from "lucide-react";
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
  async function setSentiment(type: "like" | "dislike") {
    if (!userId) return toast.error("Sign in to interact.");

    const existingEntry = type === "like" ? likeEntry : dislikeEntry;
    const oppositeEntry = type === "like" ? dislikeEntry : likeEntry;

    // If toggling off, just delete
    if (existingEntry) {
      await supabase.from("diary_entries").delete().eq("id", existingEntry.id);
      onUpdate();
      return;
    }

    // Mutual exclusion: delete opposite before inserting
    if (oppositeEntry) {
      await supabase.from("diary_entries").delete().eq("id", oppositeEntry.id);
    }

    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      song_id: songId,
      type,
    });

    if (error) toast.error(error.message);
    onUpdate();
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => setSentiment("like")}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
        style={{
          backgroundColor: likeEntry ? "#4A9E6E" : "#000000",
          border: "1px solid rgba(245,240,232,0.08)",
          color: likeEntry ? "#000000" : "white",
        }}
      >
        <ThumbsUp size={14} fill={likeEntry ? "currentColor" : "none"} />
        Like
      </button>
      <button
        onClick={() => setSentiment("dislike")}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
        style={{
          backgroundColor: dislikeEntry ? "#D4556A" : "#000000",
          border: "1px solid rgba(245,240,232,0.08)",
          color: dislikeEntry ? "#000000" : "white",
        }}
      >
        <ThumbsDown size={14} fill={dislikeEntry ? "currentColor" : "none"} />
        Dislike
      </button>
    </div>
  );
}
