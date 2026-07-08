import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

type DiaryEntry = Tables<"diary_entries">;

export function useToggleDiaryEntry(
  songId: string,
  userId: string | null,
  type: "want" | "like" | "dislike",
  entry: DiaryEntry | null,
) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!userId) return toast.error("Sign in to interact.");
    setLoading(true);

    if (entry) {
      const { error } = await supabase.from("diary_entries").delete().eq("id", entry.id);
      setLoading(false);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type,
      });
      setLoading(false);
      if (error) return toast.error(error.message);
    }
  }

  return { toggle, loading };
}
