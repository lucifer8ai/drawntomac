import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("CompletionScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders personalized message", () => {
    render(<CompletionScreen artistCount={3} />);
    expect(screen.getByText("You're all set.")).toBeTruthy();
    expect(screen.getByText(/Listening to 3 artists/)).toBeTruthy();
  });

  it("uses singular when count is 1", () => {
    render(<CompletionScreen artistCount={1} />);
    expect(screen.getByText(/Listening to 1 artist/)).toBeTruthy();
  });

  it("renders zero-artist fallback", () => {
    render(<CompletionScreen artistCount={0} />);
    expect(screen.getByText("Your feed is ready.")).toBeTruthy();
  });

  it("navigates to /home on button click", () => {
    render(<CompletionScreen artistCount={3} />);
    const btn = screen.getByText(/Go to your feed/);
    btn.click();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
  });
});
