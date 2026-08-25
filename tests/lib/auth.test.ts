import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/types";
import {
  extractClientIp,
  isUserAdmin,
  normalizeIdentifier,
  passwordSignIn,
  resolveUserEmail,
  validateResetPassword,
  validateSigninInput,
  validateSignupInput,
} from "../../src/lib/auth";

describe("normalizeIdentifier", () => {
  it("detects email", () => {
    expect(normalizeIdentifier("  Foo@Example.COM ")).toEqual({
      kind: "email",
      value: "foo@example.com",
    });
  });

  it("detects and lowercases username", () => {
    expect(normalizeIdentifier("  My_Name ")).toEqual({
      kind: "username",
      value: "my_name",
    });
  });
});

describe("validateSignupInput", () => {
  it("accepts a valid email and password", () => {
    expect(validateSignupInput("Foo@Example.com", "secret1")).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(validateSignupInput("nope", "secret1")).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects a short password", () => {
    expect(validateSignupInput("a@b.co", "12345")).toBe(
      "Password must be at least 6 characters.",
    );
  });

  it("rejects a password over 72 bytes", () => {
    expect(validateSignupInput("a@b.co", "a".repeat(73))).toBe(
      "Password must be 72 bytes or fewer.",
    );
  });
});

describe("validateSigninInput", () => {
  it("accepts email and password", () => {
    expect(validateSigninInput("a@b.co", "secret1")).toBeNull();
  });

  it("accepts username and password", () => {
    expect(validateSigninInput("my_name", "secret1")).toBeNull();
  });

  it("rejects an empty identifier", () => {
    expect(validateSigninInput("   ", "secret1")).toBe(
      "Enter your email or username.",
    );
  });

  it("rejects an empty password", () => {
    expect(validateSigninInput("a@b.co", "")).toBe("Enter your password.");
  });
});

describe("validateResetPassword", () => {
  it("accepts matching passwords", () => {
    expect(validateResetPassword("secret1", "secret1")).toBeNull();
  });

  it("rejects mismatched passwords", () => {
    expect(validateResetPassword("secret1", "secret2")).toBe(
      "Passwords do not match.",
    );
  });

  it("rejects a short password", () => {
    expect(validateResetPassword("12345", "12345")).toBe(
      "Password must be at least 6 characters.",
    );
  });
});

describe("extractClientIp", () => {
  it("uses x-forwarded-for first value", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(extractClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(extractClientIp(request)).toBe("9.9.9.9");
  });

  it("falls back to unknown", () => {
    const request = new Request("http://localhost");
    expect(extractClientIp(request)).toBe("unknown");
  });
});

describe("isUserAdmin", () => {
  const mockFrom = vi.fn();
  const admin = {
    from: mockFrom,
  } as unknown as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockProfileResult(data: { is_admin: boolean } | null) {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
    });
  }

  it("returns true when profile is admin", async () => {
    mockProfileResult({ is_admin: true });
    await expect(isUserAdmin(admin, "u1")).resolves.toBe(true);
  });

  it("returns false when profile is not admin", async () => {
    mockProfileResult({ is_admin: false });
    await expect(isUserAdmin(admin, "u1")).resolves.toBe(false);
  });

  it("returns false when profile does not exist", async () => {
    mockProfileResult(null);
    await expect(isUserAdmin(admin, "u1")).resolves.toBe(false);
  });
});

describe("passwordSignIn", () => {
  const mockSignInWithPassword = vi.fn();

  const anonClient = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  } as unknown as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session and user for an authenticated-role token", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
          user: { id: "u1", email: "a@b.co", role: "authenticated" },
        },
      },
      error: null,
    });

    await expect(
      passwordSignIn(anonClient, "a@b.co", "secret1"),
    ).resolves.toEqual({
      session: { access_token: "access", refresh_token: "refresh" },
      user: { id: "u1", email: "a@b.co", role: "authenticated" },
    });
  });

  it("rejects a non-authenticated role token", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
          user: { id: "u1", email: "a@b.co", role: "service_role" },
        },
      },
      error: null,
    });

    await expect(
      passwordSignIn(anonClient, "a@b.co", "secret1"),
    ).resolves.toEqual({
      error: "Invalid credentials",
    });
  });

  it("rejects auth errors generically", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid_grant" },
    });

    await expect(
      passwordSignIn(anonClient, "a@b.co", "secret1"),
    ).resolves.toEqual({
      error: "Invalid email/username or password",
    });
  });
});

describe("resolveUserEmail", () => {
  const mockGetUserById = vi.fn();
  const mockFrom = vi.fn();
  const admin = {
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  } as unknown as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns email for a resolved username", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "u1" },
            error: null,
          }),
        }),
      }),
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "found@example.com" } },
      error: null,
    });

    await expect(resolveUserEmail(admin, "my_name")).resolves.toEqual({
      email: "found@example.com",
    });
  });

  it("returns generic error when profile is not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(resolveUserEmail(admin, "nope")).resolves.toEqual({
      error: "Invalid email/username or password",
    });
  });
});
