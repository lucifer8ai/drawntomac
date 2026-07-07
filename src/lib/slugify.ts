function slugifyBase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generate an API-agnostic slug: slugified-title + UUID prefix.
 * No external IDs (iTunes, MusicBrainz, etc.) embedded in the slug.
 */
export function generateSlug(title: string): string {
  const prefix = crypto.randomUUID().split("-")[0];
  return `${slugifyBase(title)}-${prefix}`;
}

export { slugifyBase };
