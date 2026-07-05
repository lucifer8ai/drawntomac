export async function getArtistImages(): Promise<{ images: string[]; replacements?: string[] }> {
  try {
    const res = await fetch("/api/itunes/collage-images");
    if (!res.ok) return { images: [], replacements: [] };
    return (await res.json()) as { images: string[]; replacements?: string[] };
  } catch {
    return { images: [], replacements: [] };
  }
}