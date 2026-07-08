import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useToggleDiaryEntry(songId: string, userId: string | null, type: "want" | "like" | "dislike") {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!userId) return toast.error("Sign in to interact.");
    setLoading(true);

    // Always query the DB — never trust stale props for the existence check
    const { data: existing } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("user_id", userId)
      .eq("song_id", songId)
      .eq("type", type)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("diary_entries").delete().eq("id", existing.id);
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
