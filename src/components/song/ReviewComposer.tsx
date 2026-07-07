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

  useEffect(() => {
    setBody(entry?.body ?? "");
  }, [entry?.id]);

  const isEditing = !!entry;
  const canEdit = entry
    ? new Date(entry.created_at).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now()
    : true;

  async function submit() {
    setSubmitting(true);
    if (isEditing) {
      if (!canEdit) {
        setSubmitting(false);
        return toast.error("Reviews can only be edited within 48 hours.");
      }
      const { error } = await supabase
        .from("diary_entries")
        .update({ body: body.trim() || null })
        .eq("id", entry!.id);
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Review updated.");
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "review" as const,
        body: body.trim() || null,
      });
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Review posted.");
    }
    setBody("");
    onPosted();
  }

  if (isEditing && !canEdit) {
    return (
      <div
        className="mt-8 rounded-2xl p-5"
        style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <p className="text-sm" style={{ color: "#8A8276" }}>
          Your review is locked — editing is only available for 48 hours after posting.
        </p>
        {entry.body && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-white/90">{entry.body}</p>
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
          {submitting ? "Posting…" : isEditing ? "Update review" : "Post review"}
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
      to rate, review, or log a listen.
    </div>
  );
}
