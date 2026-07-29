/**
 * Supabase Storage helper for artwork uploads.
 */

const ARTWORK_BUCKET = "artwork";

interface SupabaseStorageClient {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, fileBody: ArrayBuffer, options?: { contentType?: string; upsert?: boolean }) => Promise<{ data: any; error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
}

export async function uploadArtworkFromUrl(
  client: SupabaseStorageClient,
  imageUrl: string,
  storagePath: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const { data } = await client.storage
      .from(ARTWORK_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (!data) return null;
    const { data: publicUrl } = client.storage
      .from(ARTWORK_BUCKET)
      .getPublicUrl(storagePath);
    return publicUrl.publicUrl;
  } catch {
    return null;
  }
}
