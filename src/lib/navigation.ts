export type OriginSource = "feed" | "diary" | "discover" | "album" | "artist";

export interface OriginSearch {
  from?: OriginSource;
  fromSlug?: string;
}

export function resolveBackURL(from?: string, fromSlug?: string) {
  if (from === "album" && fromSlug) return { to: "/album/$slug" as const, params: { slug: fromSlug } };
  if (from === "artist" && fromSlug) return { to: "/artist/$slug" as const, params: { slug: fromSlug } };
  if (from) return { to: "/home" as const, search: { tab: from } };
  return { to: "/home" as const };
}
