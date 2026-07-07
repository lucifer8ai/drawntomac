const CAA_BASE = "https://coverartarchive.org";

export interface CoverArtImage {
  id: string;
  image: string;
  thumbnails: Record<string, string>;
  types?: string[];
  front: boolean;
  back: boolean;
  approved: boolean;
  comment?: string;
}

export interface CoverArtResponse {
  images: CoverArtImage[];
  release: string;
}

/**
 * Fetch cover art for a release MBID. Returns the primary "Front" image URL
 * (large thumbnail) or null if none found.
 */
export async function getCoverArt(releaseMbid: string): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${encodeURIComponent(releaseMbid)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CoverArtResponse;
    const front = data.images?.find((img) => img.front && img.approved);
    if (front?.thumbnails?.["large"]) return front.thumbnails["large"];
    if (front?.thumbnails?.["small"]) return front.thumbnails["small"];
    if (front?.image) return front.image;
    if (data.images?.[0]?.thumbnails?.["large"]) return data.images[0].thumbnails["large"];
    return data.images?.[0]?.image ?? null;
  } catch {
    return null;
  }
}
