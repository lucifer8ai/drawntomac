import { Newspaper, BookOpen, Compass } from "lucide-react";

type Tab = "feed" | "diary" | "discover";

const tabs: { id: Tab; label: string; Icon: typeof Newspaper }[] = [
  { id: "feed", label: "Feed", Icon: Newspaper },
  { id: "diary", label: "Diary", Icon: BookOpen },
  { id: "discover", label: "Discover", Icon: Compass },
];

export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden pb-safe">
      <div className="flex items-center justify-around border-t bg-background/95 py-3 backdrop-blur-xl">
        {tabs.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 min-h-[44px] min-w-[44px] justify-center transition-colors"
            >
              <Icon
                size={20}
                fill={active ? "var(--color-primary)" : "none"}
                color={active ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
