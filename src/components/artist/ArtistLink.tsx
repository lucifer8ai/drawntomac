import { Link } from "@tanstack/react-router";

export function ArtistLink({
  name,
  slug,
  className,
}: {
  name: string | null;
  slug: string | null;
  className?: string;
}) {
  if (!name) return <span className={className}>Unknown</span>;
  if (!slug) return <span className={className}>{name}</span>;
  return (
    <Link
      to="/artist/$slug"
      params={{ slug }}
      className={className ? `${className} hover:underline` : "hover:underline"}
    >
      {name}
    </Link>
  );
}
