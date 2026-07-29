import { describe, it, expect, vi } from "vitest";
import { uploadArtworkFromUrl } from "../../src/lib/storage";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

function mockClient() {
  return {
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  };
}

function mockFetchResponse(ok: boolean, contentType = "image/jpeg") {
  return {
    ok,
    headers: new Headers({ "content-type": contentType }),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  };
}

describe("uploadArtworkFromUrl", () => {
  it("returns Supabase public URL on success", async () => {
    mockUpload.mockResolvedValue({ data: { path: "songs/test.jpg" }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://supabase.co/storage/v1/object/public/artwork/songs/test.jpg" } });

    const client = mockClient();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(true)));

    const result = await uploadArtworkFromUrl(client, "https://images.genius.com/abc.jpg", "songs/test.jpg");
    expect(result).toBe("https://supabase.co/storage/v1/object/public/artwork/songs/test.jpg");
    expect(mockUpload).toHaveBeenCalledWith("songs/test.jpg", expect.any(ArrayBuffer), expect.objectContaining({ contentType: "image/jpeg", upsert: true }));
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(false)));
    const result = await uploadArtworkFromUrl(mockClient(), "https://images.genius.com/404.jpg", "songs/nope.jpg");
    expect(result).toBeNull();
  });

  it("returns null when storage upload fails", async () => {
    mockUpload.mockResolvedValue({ data: null, error: new Error("Bucket not found") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(true)));

    const result = await uploadArtworkFromUrl(mockClient(), "https://images.genius.com/abc.jpg", "songs/test.jpg");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await uploadArtworkFromUrl(mockClient(), "https://images.genius.com/abc.jpg", "songs/test.jpg");
    expect(result).toBeNull();
  });

  it("uses PNG content-type when server returns it", async () => {
    mockUpload.mockResolvedValue({ data: { path: "songs/test.png" }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://supabase.co/p.png" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(true, "image/png")));

    const result = await uploadArtworkFromUrl(mockClient(), "https://images.genius.com/abc.png", "songs/test.png");
    expect(result).toBe("https://supabase.co/p.png");
    expect(mockUpload).toHaveBeenCalledWith("songs/test.png", expect.any(ArrayBuffer), expect.objectContaining({ contentType: "image/png", upsert: true }));
  });
});
