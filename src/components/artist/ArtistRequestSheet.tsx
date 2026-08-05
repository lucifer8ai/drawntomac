import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ArtistRequestSheet() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  function addField() {
    if (fields.length >= 10) return;
    setFields([...fields, ""]);
  }

  function removeField(i: number) {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, idx) => idx !== i));
  }

  const validCount = fields.filter((f) => f.trim()).length;

  async function submit() {
    const names = fields.map((f) => f.trim()).filter(Boolean);
    if (!names.length) return;

    setSubmitting(true);
    const res = await fetch("/api/artist-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artists: names }),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(`${data.count} artist${data.count > 1 ? "s" : ""} requested`);
      setOpen(false);
      setFields([""]);
    } else {
      toast.error(data.error ?? "Failed to submit");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="artist-request-btn rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors bg-background"
          aria-label="Request an artist"
        >
          <Plus size={20} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request an artist</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Artists you request will be reviewed and imported soon.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((value, i) => (
            <div key={i} className="flex gap-2 items-center min-h-[44px]">
              <span className="text-xs text-muted-foreground w-5 tabular-nums">
                {i + 1}.
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const n = [...fields];
                  n[i] = e.target.value;
                  setFields(n);
                }}
                placeholder="Artist name"
                disabled={submitting}
                className="flex-1 rounded-lg border bg-raised px-3 py-2 text-sm text-foreground outline-none border-border focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {fields.length < 10 && (
            <button
              type="button"
              onClick={addField}
              disabled={submitting}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              + Add another artist
            </button>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            disabled={validCount === 0 || submitting}
            onClick={submit}
          >
            {submitting
              ? "Submitting…"
              : validCount > 0
                ? `Submit ${validCount}`
                : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
