import { useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

type DiaryEntry = Tables<"diary_entries">;

export function HeardButton({
  songId,
  userId,
  entry,
  wantEntry,
  onUpdate,
}: {
  songId: string;
  userId: string | null;
  entry: DiaryEntry | null;
  wantEntry: DiaryEntry | null;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [optimisticEntry, setOptimisticEntry] = useState<DiaryEntry | null>(null);
  const isActive = optimisticEntry ? !!optimisticEntry : !!entry;

  async function toggle() {
    if (!userId) return toast.error("Sign in to log listens.");
    setLoading(true);

    const wasActive = isActive;
    setOptimisticEntry(wasActive ? null : { id: crypto.randomUUID() } as DiaryEntry);

    try {
      if (wasActive) {
        const realEntry = entry ?? optimisticEntry;
        if (realEntry) await supabase.from("diary_entries").delete().eq("id", realEntry.id);
      } else {
        if (wantEntry) await supabase.from("diary_entries").delete().eq("id", wantEntry.id);
        const { error } = await supabase.from("diary_entries").insert({
          user_id: userId,
          song_id: songId,
          type: "heard" as const,
        });
        if (error) throw error;
      }
      setOptimisticEntry(null);
      onUpdate();
    } catch (err: any) {
      setOptimisticEntry(null);
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg min-h-[44px] px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed border ${
        isActive ? "bg-heard text-heard-foreground border-heard" : "bg-raised text-foreground hover:bg-white/5"
      }`}
    >
      {isActive ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
      Heard
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
  const [loading, setLoading] = useState(false);
  const [optimisticEntry, setOptimisticEntry] = useState<DiaryEntry | null>(null);
  const isActive = optimisticEntry ? !!optimisticEntry : !!entry;

  async function handleClick() {
    if (!userId) return toast.error("Sign in to interact.");
    const wasActive = isActive;
    setLoading(true);
    setOptimisticEntry(wasActive ? null : { id: crypto.randomUUID() } as DiaryEntry);

    try {
      if (wasActive) {
        const realEntry = entry ?? optimisticEntry;
        if (realEntry) await supabase.from("diary_entries").delete().eq("id", realEntry.id);
      } else {
        const { data: heardEntry } = await supabase
          .from("diary_entries")
          .select("id")
          .eq("user_id", userId)
          .eq("song_id", songId)
          .eq("type", "heard")
          .maybeSingle();
        if (heardEntry) await supabase.from("diary_entries").delete().eq("id", heardEntry.id);
        const { error } = await supabase.from("diary_entries").insert({
          user_id: userId,
          song_id: songId,
          type: "want" as const,
        });
        if (error) throw error;
      }
      setOptimisticEntry(null);
      onUpdate();
    } catch (err: any) {
      setOptimisticEntry(null);
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg min-h-[44px] px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed border ${
        isActive ? "bg-want text-want-foreground border-want" : "bg-raised text-foreground hover:bg-white/5"
      }`}
    >
      {isActive ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
      Want to hear
    </button>
  );
}
