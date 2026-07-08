import { toast } from "sonner";
import { BookmarkPlus, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToggleDiaryEntry } from "@/hooks/useToggleDiaryEntry";
import type { Tables } from "@/lib/types";

type DiaryEntry = Tables<"diary_entries">;

export function HeardButton({
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
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.listened_on === today);
  const olderCount = entries.filter((e) => e.listened_on !== today).length;

  async function toggle() {
    if (!userId) return toast.error("Sign in to log listens.");
    if (todayEntry) {
      await supabase.from("diary_entries").delete().eq("id", todayEntry.id);
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "heard" as const,
        listened_on: today,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    onUpdate();
  }

  const totalCount = olderCount + (todayEntry ? 1 : 0);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        backgroundColor: todayEntry ? "#4A9E6E" : "#000000",
        border: "1px solid rgba(245,240,232,0.08)",
        color: todayEntry ? "#000000" : "white",
      }}
    >
      {todayEntry ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
      Heard{totalCount > 1 ? ` (${totalCount})` : ""}
    </button>
  );
}

export function WantButton({
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
  const { toggle, loading } = useToggleDiaryEntry(songId, userId, "want");

  async function handleClick() {
    await toggle();
    onUpdate();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
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
