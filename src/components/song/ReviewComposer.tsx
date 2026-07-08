import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

type DiaryEntry = Tables<"diary_entries">;

export function ReviewComposer({
  songId,
  userId,
  entry,
  onPosted,
}: {
  songId: string;
  userId: string;
  entry: DiaryEntry | null;
  onPosted: () => void;
}) {
  const [body, setBody] = useState(entry?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [postedEntryId, setPostedEntryId] = useState<string | null>(null);

  useEffect(() => {
    setBody(entry?.body ?? "");
    // Reset posted-tracking when parent signals via entry prop change
    if (entry) setPostedEntryId(entry.id);
  }, [entry?.id]);

  // Optimistic: treat as editing if we know we just posted, even before parent refetch
  const hasEntry = !!entry || !!postedEntryId;
  const currentEntry = entry ?? { id: postedEntryId!, created_at: new Date().toISOString(), body } as DiaryEntry;
  const canEdit = hasEntry
    ? new Date(currentEntry.created_at).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now()
    : true;

  async function submit() {
    setSubmitting(true);
    if (hasEntry) {
      if (!canEdit) {
        setSubmitting(false);
        return toast.error("Reviews can only be edited within 48 hours.");
      }
      const targetId = entry?.id ?? postedEntryId!;
      const { error } = await supabase
        .from("diary_entries")
        .update({ body: body.trim() || null })
        .eq("id", targetId);
      setSubmitting(false);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "review" as const,
        body: body.trim() || null,
      }).select("id").single();
      setSubmitting(false);
      if (error) return toast.error(error.message);
      // Immediately enter edit mode to prevent double-insert before parent refetch
      if (data) setPostedEntryId(data.id);
    }
    setBody("");
    onPosted();
  }

  if (hasEntry && !canEdit) {
    return (
      <div
        className="mt-8 rounded-2xl p-5"
        style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <p className="text-sm" style={{ color: "#8A8276" }}>
          Your review is locked — editing is only available for 48 hours after posting.
        </p>
        {currentEntry.body && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-white/90">{currentEntry.body}</p>
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
          {submitting ? "Posting…" : hasEntry ? "Update review" : "Post review"}
        </button>
      </div>
    </div>
  );
}

export function ReviewPrompt() {
  return (
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
      to review or log a listen.
    </div>
  );
}
