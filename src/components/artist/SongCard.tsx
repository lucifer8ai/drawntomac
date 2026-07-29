import { Link } from "@tanstack/react-router";

export function SongCard({
  title,
  slug,
  imageUrl,
  subtitle,
}: {
  title: string;
  slug: string;
  imageUrl: string | null;
  subtitle?: string;
}) {
  return (
    <Link
      to="/song/$slug"
      params={{ slug }}
      className="block rounded-2xl border bg-raised overflow-hidden transition-colors hover:border-foreground/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${title} art`}
          className="w-full aspect-square object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full aspect-square bg-secondary/20 flex items-center justify-center text-3xl font-bold text-muted-foreground">
          {title[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div className="p-3">
        <div className="truncate text-sm font-semibold text-foreground" title={title}>
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}
