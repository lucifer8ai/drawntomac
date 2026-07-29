import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtistSelector } from "@/components/onboarding/ArtistSelector";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe("ArtistSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: [
        { id: "a1", name: "Seedhe Maut", image_url: null, song_count: 24 },
        { id: "a2", name: "DIVINE", image_url: null, song_count: 18 },
        { id: "a3", name: "KR$NA", image_url: null, song_count: 31 },
        { id: "a4", name: "AP Dhillon", image_url: null, song_count: 15 },
      ],
      error: null,
    });
  });

  it("renders loading skeleton initially", () => {
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={vi.fn()} />);
    expect(screen.getByText("Pick up to 3 artists you listen to.")).toBeTruthy();
  });

  it("renders artist rows after loading", async () => {
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Seedhe Maut")).toBeTruthy();
      expect(screen.getByText("DIVINE")).toBeTruthy();
      expect(screen.getByText("KR$NA")).toBeTruthy();
      expect(screen.getByText("AP Dhillon")).toBeTruthy();
    });
  });

  it("shows Continue disabled when fewer than 3 selected", async () => {
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Seedhe Maut")).toBeTruthy();
    });
    const btn = screen.getByRole("button", { name: "Continue" });
    expect(btn).toBeDisabled();
  });

  it("allows selecting up to 3 artists", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={onConfirm} />);
    await waitFor(() => {
      expect(screen.getByText("Seedhe Maut")).toBeTruthy();
    });

    await user.click(screen.getByText("Seedhe Maut"));
    await user.click(screen.getByText("DIVINE"));
    await user.click(screen.getByText("KR$NA"));

    const btn = screen.getByRole("button", { name: "Continue" });
    expect(btn).not.toBeDisabled();

    await user.click(btn);
    expect(onConfirm).toHaveBeenCalledWith(["a1", "a2", "a3"]);
  });

  it("shows counter as artists are selected", async () => {
    const user = userEvent.setup();
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Seedhe Maut")).toBeTruthy();
    });

    expect(screen.getByText("0 of 3 selected")).toBeTruthy();
    await user.click(screen.getByText("Seedhe Maut"));
    expect(screen.getByText("1 of 3 selected")).toBeTruthy();
  });

  it("renders error state with retry", async () => {
    mockRpc.mockRejectedValue(new Error("RPC error"));
    render(<ArtistSelector selectedArtistIds={[]} onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("No artists available yet.")).toBeTruthy();
    });
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("pre-populates initial selections", async () => {
    render(<ArtistSelector selectedArtistIds={["a2"]} onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("1 of 3 selected")).toBeTruthy();
    });
  });
});
