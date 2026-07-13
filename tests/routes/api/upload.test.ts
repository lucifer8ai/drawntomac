import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockList = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();

const mockFrom = vi.fn().mockReturnValue({
  upload: (...args: any[]) => mockUpload(...args),
  remove: (...args: any[]) => mockRemove(...args),
  list: (...args: any[]) => mockList(...args),
  getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "http://example.com/avatar.jpg" } }),
});

const mockSupabaseAdmin = {
  storage: {
    from: (...args: any[]) => mockFrom(...args),
  },
  auth: {
    getUser: (...args: any[]) => mockGetUser(...args),
    getSession: (...args: any[]) => mockGetSession(...args),
  },
};

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

function makeHeaders(token?: string): Record<string, string> {
  if (!token) return {};
  return { authorization: `Bearer ${token}` };
}

describe("/api/upload", () => {
  let handler: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/routes/api/upload");
    handler = mod.Route.options.server!.handlers!.POST!;
  });

  describe("POST", () => {
    it("returns 401 when no Authorization header", async () => {
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders(),
      });
      const res = await handler({ request: req });
      expect(res.status).toBe(401);
    });

    it("returns 401 when token is invalid", async () => {
      mockGetUser.mockResolvedValue({ data: null, error: { message: "invalid" } });
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("bad-token"),
      });
      const res = await handler({ request: req });
      expect(res.status).toBe(401);
    });

    it("returns 403 when token sub does not match userId", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "real-user-id" } }, error: null });
      const formData = new FormData();
      formData.append("userId", "different-user");
      formData.append("bucket", "avatars");
      formData.append("file", new File(["a"], "test.png", { type: "image/png" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(403);
    });

    it("returns 400 when file is missing", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "avatars");
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid bucket", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "evil");
      formData.append("file", new File(["a"], "test.png", { type: "image/png" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(400);
    });

    it("returns 413 when file exceeds 5MB", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      const bigFile = new File(["x".repeat(6 * 1024 * 1024)], "big.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "avatars");
      formData.append("file", bigFile);
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(413);
    });

    it("returns 400 for disallowed MIME type", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "avatars");
      formData.append("file", new File(["a"], "bad.txt", { type: "text/plain" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(400);
    });

    it("uploads avatar and returns URL on success", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      mockFrom.mockReturnValue({
        upload: mockUpload.mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockImplementation((path: string) => ({
          data: { publicUrl: `http://example.com/${path}` },
        })),
      });

      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "avatars");
      formData.append("file", new File(["image"], "photo.png", { type: "image/png" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toContain("u1/avatar.png");
    });

    it("uploads banner and returns URL on success", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      mockFrom.mockReturnValue({
        upload: mockUpload.mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockImplementation((path: string) => ({
          data: { publicUrl: `http://example.com/${path}` },
        })),
      });

      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "banners");
      formData.append("file", new File(["image"], "banner.webp", { type: "image/webp" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toContain("u1/banner.webp");
    });

    it("returns 500 when storage upload fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      mockFrom.mockReturnValue({
        upload: mockUpload.mockResolvedValue({ error: { message: "bucket not found" } }),
        getPublicUrl: vi.fn(),
      });

      const formData = new FormData();
      formData.append("userId", "u1");
      formData.append("bucket", "avatars");
      formData.append("file", new File(["a"], "test.png", { type: "image/png" }));
      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        headers: makeHeaders("valid"),
      });
      Object.defineProperty(req, "formData", { value: () => Promise.resolve(formData) });
      const res = await handler({ request: req });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    let deleteHandler: (request: Request) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import("@/routes/api/upload");
      deleteHandler = mod.Route.options.server!.handlers!.DELETE!;
    });

    it("returns 401 when no Authorization header", async () => {
      const req = new Request("http://localhost/api/upload?userId=u1&bucket=avatars", {
        method: "DELETE",
        headers: makeHeaders(),
      });
      const res = await deleteHandler({ request: req });
      expect(res.status).toBe(401);
    });

    it("returns 403 when token sub does not match userId", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } }, error: null });
      const req = new Request("http://localhost/api/upload?userId=wrong-user&bucket=avatars", {
        method: "DELETE",
        headers: makeHeaders("valid"),
      });
      const res = await deleteHandler({ request: req });
      expect(res.status).toBe(403);
    });

    it("deletes file when no files exist in folder", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      mockList.mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({
        list: mockList,
        remove: mockRemove,
      });

      const req = new Request("http://localhost/api/upload?userId=u1&bucket=avatars", {
        method: "DELETE",
        headers: makeHeaders("valid"),
      });
      const res = await deleteHandler({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(false);
    });

    it("deletes file on valid request", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      mockList.mockResolvedValue({ data: [{ name: "avatar.png" }], error: null });
      mockRemove.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        list: mockList,
        remove: mockRemove,
      });

      const req = new Request("http://localhost/api/upload?userId=u1&bucket=avatars", {
        method: "DELETE",
        headers: makeHeaders("valid"),
      });
      const res = await deleteHandler({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });
  });
});
