import { toast } from "sonner";
import { BookmarkPlus, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const count = entries.length;
  const today = new Date().toISOString().slice(0, 10);
  const heardToday = entries.some((e) => e.created_at?.slice(0, 10) === today);

  async function handle() {
    if (!userId) return toast.error("Sign in to log listens.");
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
  async function toggle() {
    if (!userId) return toast.error("Sign in to save songs.");
    if (entry) {
      await supabase.from("diary_entries").delete().eq("id", entry.id);
      toast.success("Removed from Want to hear.");
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "want" as const,
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
