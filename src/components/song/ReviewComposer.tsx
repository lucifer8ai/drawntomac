import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";

const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

type DiaryEntry = Tables<"diary_entries">;

type Mode = "write" | "collapsed" | "viewing" | "locked";

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
  const [mode, setMode] = useState<Mode>(entry ? "collapsed" : "write");

  useEffect(() => {
    if (entry) {
      setBody(entry.body ?? "");
      setMode("collapsed");
    } else {
      setBody("");
      setMode("write");
    }
  }, [entry?.id]);

  const canEdit = entry
    ? new Date(entry.created_at).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now()
    : true;

  async function submit() {
    setSubmitting(true);

    const { data: dbEntry } = await supabase
      .from("diary_entries")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("song_id", songId)
      .eq("type", "review")
      .maybeSingle();

    const targetId = entry?.id ?? dbEntry?.id;
    const isUpdate = !!targetId;

    if (isUpdate) {
      if (!canEdit) {
        setSubmitting(false);
        return toast.error("Reviews can only be edited within 48 hours.");
      }
      const { error } = await supabase
        .from("diary_entries")
        .update({ body: body.trim() || null })
        .eq("id", targetId);
      setSubmitting(false);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("diary_entries").insert({
        user_id: userId,
        song_id: songId,
        type: "review" as const,
        body: body.trim() || null,
      });
      setSubmitting(false);
      if (error) return toast.error(error.message);
    }
    setBody("");
    onPosted();
  }

  // STATE: no review posted yet — show composer
  if (mode === "write") {
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
            {submitting ? "Posting…" : "Post review"}
          </button>
        </div>
      </div>
    );
  }

  // STATE: review exists, collapsed — "See your review" button
  if (mode === "collapsed") {
    return (
      <div className="mt-8">
        <button
          onClick={() => setMode(canEdit ? "viewing" : "locked")}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
          style={{ color: "#8A8276", border: "1px solid rgba(245,240,232,0.08)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#F5F0E8";
            e.currentTarget.style.borderColor = "rgba(245,240,232,0.20)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#8A8276";
            e.currentTarget.style.borderColor = "rgba(245,240,232,0.08)";
          }}
        >
          <Eye size={14} />
          See your review
        </button>
      </div>
    );
  }

  // STATE: locked (>48h)
  if (mode === "locked") {
    return (
      <div
        className="mt-8 rounded-2xl p-5"
        style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <p className="text-xs font-medium" style={{ color: "#8A8276" }}>
          Your review is locked — editing is only available for 48 hours after posting.
        </p>
        {entry?.body && (
          <>
            <p className="mt-3 whitespace-pre-wrap text-sm text-white/90">{entry.body}</p>
            <button
              onClick={() => setMode("collapsed")}
              className="mt-3 text-xs font-semibold"
              style={{ color: "#8A8276" }}
            >
              Collapse
            </button>
          </>
        )}
      </div>
    );
  }

  // STATE: viewing — show review + edit button (within 48h)
  return (
    <div
      className="mt-8 rounded-2xl p-5"
      style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
    >
      {entry?.body && (
        <p className="whitespace-pre-wrap text-sm text-white/90">{entry.body}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setMode("write")}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "#D4556A" }}
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          onClick={() => setMode("collapsed")}
          className="text-xs font-semibold"
          style={{ color: "#8A8276" }}
        >
          Collapse
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
