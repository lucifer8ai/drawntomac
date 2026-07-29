export function ArtistHeader({
  name,
  leadCount,
  featuredCount,
}: {
  name: string;
  leadCount: number;
  featuredCount: number;
}) {
  const total = leadCount + featuredCount;

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-white">{name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} songs · {leadCount} as lead{featuredCount > 0 ? ` · ${featuredCount} featured` : ""}
      </p>
    </div>
  );
}
