import { Link } from "@tanstack/react-router";

export function ArtistLink({
  name,
  slug,
  className,
  from,
}: {
  name: string | null;
  slug: string | null;
  className?: string;
  from?: string;
}) {
  if (!name) return <span className={className}>Unknown</span>;
  if (!slug) return <span className={className}>{name}</span>;
  return (
    <Link
      to="/artist/$slug"
      params={{ slug }}
      search={from ? { from } : undefined}
      className={className ? `${className} hover:underline` : "hover:underline"}
    >
      {name}
    </Link>
  );
}
