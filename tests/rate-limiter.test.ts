import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limiter";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when RPC says allowed", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: true, error: null });

    const result = await checkRateLimit("test-key");
    expect(result).toBe(true);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("check_rate_limit", {
      lim_key: "test-key",
      lim_limit: 1,
      lim_window_sec: 1,
    });
  });

  it("returns false when RPC says denied", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: false, error: null });

    const result = await checkRateLimit("test-key");
    expect(result).toBe(false);
  });

  it("fails open (returns true) on RPC error", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "connection error" },
    });

    const result = await checkRateLimit("test-key");
    expect(result).toBe(true);
  });

  it("passes custom limit and window", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: true, error: null });

    await checkRateLimit("api-key", 5, 60);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("check_rate_limit", {
      lim_key: "api-key",
      lim_limit: 5,
      lim_window_sec: 60,
    });
  });
});
