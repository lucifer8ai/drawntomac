import { forwardRef } from "react";

interface SongShareCardProps {
  coverUrl: string | null;
  title: string;
  artistName: string | null;
  badges: { type: string; label: string }[];
}

const badgeColors: Record<string, { bg: string; fg: string }> = {
  heard: { bg: "oklch(0.55 0.16 150 / 0.15)", fg: "oklch(0.55 0.16 150)" },
  like: { bg: "oklch(0.58 0.22 20 / 0.15)", fg: "oklch(0.58 0.22 20)" },
  dislike: { bg: "oklch(0.85 0 0 / 0.15)", fg: "oklch(0.85 0 0)" },
  want: { bg: "oklch(0.55 0.17 290 / 0.15)", fg: "oklch(0.55 0.17 290)" },
  save: { bg: "oklch(0.62 0.18 255 / 0.15)", fg: "oklch(0.62 0.18 255)" },
  reviewed: { bg: "oklch(0.62 0.18 255 / 0.15)", fg: "oklch(0.62 0.18 255)" },
};

export const SongShareCard = forwardRef<HTMLDivElement, SongShareCardProps>(
  ({ coverUrl, title, artistName, badges }, ref) => {
    return (
      <div
        ref={ref}
        className="shareable-card flex flex-col items-center justify-center gap-8"
        style={{
          width: 1080,
          height: 1080,
          backgroundColor: "oklch(0.04 0.002 280)",
          color: "oklch(0.90 0.01 90)",
          fontFamily: "'DM Sans', sans-serif",
          padding: "80px 60px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 540,
            height: 540,
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid oklch(0.90 0.01 90 / 0.1)",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                color: "oklch(0.90 0.01 90 / 0.2)",
              }}
            >
              ♫
            </div>
          )}
        </div>

        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            textAlign: "center",
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h1>

        {artistName && (
          <p
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "oklch(0.78 0.01 90)",
              marginTop: -20,
            }}
          >
            {artistName}
          </p>
        )}

        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {badges.map((b) => {
              const c = badgeColors[b.type] ?? { bg: "oklch(0.85 0 0 / 0.15)", fg: "oklch(0.85 0 0)" };
              return (
                <span
                  key={b.type}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 20px",
                    borderRadius: 9999,
                    fontSize: 24,
                    fontWeight: 600,
                    backgroundColor: c.bg,
                    color: c.fg,
                  }}
                >
                  {b.label}
                </span>
              );
            })}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 500,
            color: "oklch(0.58 0.02 85)",
          }}
        >
          #drawnto
        </div>
      </div>
    );
  },
);

SongShareCard.displayName = "SongShareCard";
