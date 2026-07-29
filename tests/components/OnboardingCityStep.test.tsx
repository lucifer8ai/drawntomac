import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CityStep } from "@/components/onboarding/CityStep";

let mockAuthUser: string | null = "user-1";
let mockProfileUpdate: any = null;

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: mockAuthUser ? { user: { id: mockAuthUser } } : { user: null }, error: null }) },
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

vi.mock("@/components/profile/LocationPicker", () => ({
  LocationPicker: ({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) => (
    <div data-testid="location-picker">
      <button onClick={() => onChange("location-1")}>Select Mumbai</button>
      <span>value: {value ?? "none"}</span>
    </div>
  ),
}));

describe("CityStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = "user-1";
    mockProfileUpdate = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "locations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { city: "Mumbai", country: "India" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          update: (payload: any) => {
            mockProfileUpdate = payload;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  it("renders title and optional label", () => {
    render(<CityStep onComplete={vi.fn()} selectedArtists={[]} />);
    expect(screen.getByText(/Where are you/)).toBeTruthy();
    expect(screen.getByText("(optional)")).toBeTruthy();
  });

  it("has Save and Skip buttons", () => {
    render(<CityStep onComplete={vi.fn()} selectedArtists={[]} />);
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Skip")).toBeTruthy();
  });

  it("calls onComplete when Skip is clicked", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CityStep onComplete={onComplete} selectedArtists={["artist-uuid-1"]} />);
    await user.click(screen.getByText("Skip"));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("renders LocationPicker", () => {
    render(<CityStep onComplete={vi.fn()} selectedArtists={[]} />);
    expect(screen.getByTestId("location-picker")).toBeTruthy();
  });

  it("writes discover_artist_ids on Skip", async () => {
    const user = userEvent.setup();
    const selectedArtists = ["artist-uuid-1", "artist-uuid-2", "artist-uuid-3"];
    render(<CityStep onComplete={vi.fn()} selectedArtists={selectedArtists} />);
    await user.click(screen.getByText("Skip"));
    await waitFor(() => {
      expect(mockProfileUpdate).not.toBeNull();
    });
    expect(mockProfileUpdate?.discover_artist_ids).toEqual(selectedArtists);
    expect(mockProfileUpdate?.onboarding_completed).toBe(true);
  });

  it("writes discover_artist_ids on Save with location", async () => {
    const user = userEvent.setup();
    const selectedArtists = ["artist-uuid-1", "artist-uuid-2", "artist-uuid-3"];
    render(<CityStep onComplete={vi.fn()} selectedArtists={selectedArtists} />);
    await user.click(screen.getByText("Select Mumbai"));
    await user.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockProfileUpdate).not.toBeNull();
    });
    expect(mockProfileUpdate?.discover_artist_ids).toEqual(selectedArtists);
    expect(mockProfileUpdate?.onboarding_completed).toBe(true);
    expect(mockProfileUpdate?.location_id).toBe("location-1");
    expect(mockProfileUpdate?.city).toBe("Mumbai");
  });

  it("writes discover_artist_ids on Save without location", async () => {
    const user = userEvent.setup();
    const selectedArtists = ["artist-uuid-1", "artist-uuid-2", "artist-uuid-3"];
    render(<CityStep onComplete={vi.fn()} selectedArtists={selectedArtists} />);
    await user.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockProfileUpdate).not.toBeNull();
    });
    expect(mockProfileUpdate?.discover_artist_ids).toEqual(selectedArtists);
    expect(mockProfileUpdate?.onboarding_completed).toBe(true);
    expect(mockProfileUpdate?.location_id).toBeUndefined();
  });
});
