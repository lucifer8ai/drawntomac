import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockPasswordSignIn = vi.fn();
const mockIsUserAdmin = vi.fn();
const mockValidateSigninInput = vi.fn();
const mockNormalizeIdentifier = vi.fn();
const mockExtractClientIp = vi.fn();
const mockResolveUserEmail = vi.fn();

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/auth", () => ({
  passwordSignIn: mockPasswordSignIn,
  isUserAdmin: mockIsUserAdmin,
  validateSigninInput: mockValidateSigninInput,
  normalizeIdentifier: mockNormalizeIdentifier,
  extractClientIp: mockExtractClientIp,
  resolveUserEmail: mockResolveUserEmail,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {},
}));

vi.mock("@/integrations/supabase/anon.server", () => ({
  supabaseAnonServer: {},
}));

describe("/api/auth/signin adminOnly", () => {
  let handler: (ctx: { request: Request }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockCheckRateLimit.mockResolvedValue(true);
    mockValidateSigninInput.mockReturnValue(null);
    mockNormalizeIdentifier.mockReturnValue({
      kind: "email",
      value: "admin@example.com",
    });
    mockExtractClientIp.mockReturnValue("1.2.3.4");
    mockResolveUserEmail.mockResolvedValue({
      email: "admin@example.com",
    });
    mockPasswordSignIn.mockResolvedValue({
      session: { access_token: "access", refresh_token: "refresh" },
      user: { id: "u1", email: "admin@example.com", role: "authenticated" },
    });

    const mod = await import("@/routes/api/auth/signin");
    handler = mod.Route.options.server!.handlers!.POST!;
  });

  function makeRequest(body: unknown) {
    const request = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { request };
  }

  it("returns 403 when adminOnly is true and user is not admin", async () => {
    mockIsUserAdmin.mockResolvedValue(false);

    const res = await handler(
      makeRequest({
        identifier: "admin@example.com",
        password: "secret1",
        adminOnly: true,
      }),
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("This account isn't an admin.");
    expect(mockPasswordSignIn).toHaveBeenCalled();
  });

  it("returns 200 when adminOnly is true and user is admin", async () => {
    mockIsUserAdmin.mockResolvedValue(true);

    const res = await handler(
      makeRequest({
        identifier: "admin@example.com",
        password: "secret1",
        adminOnly: true,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toBeTruthy();
    expect(mockIsUserAdmin).toHaveBeenCalledWith({}, "u1");
  });

  it("returns 200 and skips isUserAdmin when adminOnly is omitted", async () => {
    const res = await handler(
      makeRequest({
        identifier: "admin@example.com",
        password: "secret1",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toBeTruthy();
    expect(mockIsUserAdmin).not.toHaveBeenCalled();
  });
});
