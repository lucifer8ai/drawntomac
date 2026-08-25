import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDashboard } from "../../../src/routes/admin/index";

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();
const mockToastError = vi.fn();

vi.mock("@tanstack/react-router", () => {
  const createFileRoute = () => (opts: unknown) => opts;
  return {
    Link: ({
      to,
      className,
      children,
    }: {
      to: string;
      className?: string;
      children: React.ReactNode;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    createFileRoute,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } },
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

describe("AdminDashboard sign out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Sign out button", () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("calls signOut and navigates to / on click", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(<AdminDashboard />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("disables the button and shows signing-out state while in flight", async () => {
    let resolveSignOut: () => void = () => {};
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<AdminDashboard />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("button", { name: "Signing out..." })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Signing out..." })
        .hasAttribute("disabled"),
    ).toBe(true);

    resolveSignOut();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("shows a toast error and stays when signOut rejects", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();

    render(<AdminDashboard />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Could not sign out. Please try again.",
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
