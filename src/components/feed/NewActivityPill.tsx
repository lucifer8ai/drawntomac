import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewActivityPillProps {
  count: number;
  onScrollToTop: () => void;
  onDismiss: () => void;
}

export function NewActivityPill({ count, onScrollToTop, onDismiss }: NewActivityPillProps) {
  if (count <= 0) return null;

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-slide-down-fade">
      <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 shadow-lg">
        <button
          type="button"
          onClick={onScrollToTop}
          className="flex items-center gap-1 text-sm font-semibold text-primary-foreground hover:opacity-80 transition-opacity"
        >
          ↑ New activity
          {count > 1 && (
            <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-xs">
              {count}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 rounded-full p-0.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          aria-label="Dismiss new activity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
