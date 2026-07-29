import { ArrowLeft } from "lucide-react";

interface BackHeaderProps {
  label: string;
  onBack: () => void;
  solid: boolean;
  logo?: string;
  showTitle?: string;
}

export function BackHeader({
  label,
  onBack,
  solid,
  logo,
  showTitle,
}: BackHeaderProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between transition-colors duration-200"
      style={
        solid
          ? {
              backgroundColor: "oklch(0.04 0.002 280 / 0.95)",
              backdropFilter: "blur(24px)",
            }
          : {}
      }
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md text-sm font-medium text-white hover:bg-black/60 transition-colors shadow-lg"
      >
        <ArrowLeft size={18} />
        {label}
      </button>

      {logo && (
        <span className="absolute left-1/2 -translate-x-1/2 text-2xl font-black tracking-tight text-foreground">
          {logo}
        </span>
      )}

      {showTitle && (
        <span
          className={`text-sm text-muted-foreground transition-opacity duration-200 ${
            solid ? "opacity-100" : "opacity-0"
          }`}
        >
          {showTitle}
        </span>
      )}
    </div>
  );
}
