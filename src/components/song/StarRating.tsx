import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

const RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

type DiaryEntry = Tables<"diary_entries">;

export function StarRating({
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
        type: "rating" as const,
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
