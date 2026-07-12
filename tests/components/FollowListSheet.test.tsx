import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FollowListSheet } from "@/components/profile/FollowListSheet";

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={params ? `/${to.replace("$", "")}${params.username}` : "/"} className={className}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const mockFollowers = [
  { id: "u1", username: "bob", avatar_url: null, display_name: "Bob" },
  { id: "u2", username: "carol", avatar_url: null, display_name: "Carol" },
];

describe("FollowListSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders followers list", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => {
        const ids = mockFollowers.map((f) => ({ following_id: f.id }));
        cb({ data: ids, error: null });
        return { then: vi.fn() };
      }),
    } as any;

    mockSupabase.from.mockReturnValue(chain);

    render(<FollowListSheet open type="followers" userId="user-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Followers")).toBeTruthy();
    });
  });

  it("renders following list", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => {
        cb({ data: [], error: null });
        return { then: vi.fn() };
      }),
    } as any;

    mockSupabase.from.mockReturnValue(chain);

    render(<FollowListSheet open type="following" userId="user-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Following")).toBeTruthy();
    });
  });

  it("shows empty state for followers", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => {
        cb({ data: [], error: null });
        return { then: vi.fn() };
      }),
    } as any;

    mockSupabase.from.mockReturnValue(chain);

    render(<FollowListSheet open type="followers" userId="user-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("No followers yet.")).toBeTruthy();
    });
  });

  it("shows empty state for following", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => {
        cb({ data: [], error: null });
        return { then: vi.fn() };
      }),
    } as any;

    mockSupabase.from.mockReturnValue(chain);

    render(<FollowListSheet open type="following" userId="user-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Not following anyone yet.")).toBeTruthy();
    });
  });

  it("does not fetch when closed", () => {
    render(<FollowListSheet open={false} type="followers" userId="user-1" onClose={() => {}} />);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
