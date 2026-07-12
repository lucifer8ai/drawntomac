import { Headphones, Heart, ThumbsDown, Bookmark } from "lucide-react";
import { ProfileTasteStats } from "@/hooks/useProfileStats";

interface ProfileStatsRowProps {
  stats: ProfileTasteStats;
  loading: boolean;
}

const STAT_ITEMS: { key: keyof ProfileTasteStats; label: string; Icon: typeof Headphones; activeClass: string }[] = [
  { key: "heard", label: "Heard", Icon: Headphones, activeClass: "text-[--color-heard]" },
  { key: "liked", label: "Liked", Icon: Heart, activeClass: "text-[--color-like]" },
  { key: "disliked", label: "Disliked", Icon: ThumbsDown, activeClass: "text-muted-foreground" },
  { key: "want", label: "Want", Icon: Bookmark, activeClass: "text-[--color-want]" },
];

export function ProfileStatsRow({ stats, loading }: ProfileStatsRowProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-around py-2 animate-skeleton">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-5 w-5 rounded bg-muted" />
            <div className="h-6 w-8 rounded bg-muted" />
            <div className="h-3 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-around py-2">
      {STAT_ITEMS.map(({ key, label, Icon, activeClass }) => {
        const count = stats[key];
        const color = count > 0 ? activeClass : "text-muted-foreground/40";
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <Icon size={18} className={color} />
            <span className="text-xl font-semibold tabular-nums">{count}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
