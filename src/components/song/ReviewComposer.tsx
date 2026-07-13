import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
      <div className="mt-8 rounded-2xl border bg-raised p-5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a review…"
          rows={3}
          className="w-full resize-none rounded-xl border bg-transparent p-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="mt-3 flex justify-end gap-2">
          {entry && (
            <Button type="button" variant="raised" shape="pill" onClick={() => { setBody(entry.body ?? ""); setMode("viewing"); }}>
              Cancel
            </Button>
          )}
          <Button type="button" disabled={submitting} shape="pill" onClick={submit}>
            {submitting ? "Posting…" : entry ? "Save" : "Post review"}
          </Button>
        </div>
      </div>
    );
  }

  // STATE: review exists, collapsed — "See your review" button
  if (mode === "collapsed") {
    return (
      <div className="mt-8">
        <Button type="button" variant="raised" shape="pill" onClick={() => setMode(canEdit ? "viewing" : "locked")}>
          <Eye size={14} />
          See your review
        </Button>
      </div>
    );
  }

  // STATE: locked (>48h)
  if (mode === "locked") {
    return (
      <div className="mt-8 rounded-2xl border bg-raised p-5">
        <p className="text-xs font-medium text-muted-foreground">
          Your review is locked — editing is only available for 48 hours after posting.
        </p>
        {entry?.body && (
          <>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{entry.body}</p>
            <button
              type="button"
              onClick={() => setMode("collapsed")}
              className="mt-3 text-xs font-semibold text-muted-foreground"
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
    <div className="mt-8 rounded-2xl border bg-raised p-5">
      {entry?.body && (
        <p className="whitespace-pre-wrap text-base text-foreground/90">{entry.body}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" shape="pill" size="sm" onClick={() => setMode("write")}>
          <Pencil size={14} />
          Edit
        </Button>
        <button
          type="button"
          onClick={() => setMode("collapsed")}
          className="text-xs font-semibold text-muted-foreground"
        >
          Collapse
        </button>
      </div>
    </div>
  );
}

export function ReviewPrompt() {
  return (
    <div className="mt-8 rounded-2xl border bg-raised p-5 text-sm text-muted-foreground">
      <Link to="/" className="font-semibold text-primary">
        Sign in
      </Link>{" "}
      to review or log a listen.
    </div>
  );
}
