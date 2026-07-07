import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white disabled:opacity-30"
        style={{ border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs text-white/50">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white disabled:opacity-30"
        style={{ border: "1px solid rgba(245,240,232,0.08)" }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
