import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverFeedSection } from "@/components/feed/DiscoverFeedSection";

const mockRefresh = vi.fn();
const mockTriggerSearch = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, params, children, className }: any) => {
    const href = to.replace("$slug", params?.slug ?? "");
    return <a href={href} className={className}>{children}</a>;
  },
}));

vi.mock("@/routes/_authenticated/route", () => ({
  TabContext: { Provider: ({ children, value }: any) => children },
  useTabContext: () => ({ triggerSearch: mockTriggerSearch, activeTab: "feed", setTab: vi.fn(), profile: null, discoverSection: "for-you", setDiscoverSection: vi.fn() }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock("@/components/onboarding/ArtistSelector", () => ({
  ArtistSelector: ({ selectedArtistIds, onConfirm }: any) => (
    <div data-testid="artist-selector">
      <span>selected: {selectedArtistIds.length}</span>
      <button onClick={() => onConfirm(["a1", "a2", "a3"])}>Confirm artists</button>
    </div>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) },
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

const mockUseDiscoverFeed = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useDiscoverFeed", () => ({
  useDiscoverFeed: mockUseDiscoverFeed,
}));

describe("DiscoverFeedSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton", () => {
    mockUseDiscoverFeed.mockReturnValue({ feed: [], loading: true, error: null, refresh: mockRefresh });
    render(<DiscoverFeedSection />);
    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state with retry", async () => {
    mockUseDiscoverFeed.mockReturnValue({ feed: [], loading: false, error: "RPC error", refresh: mockRefresh });
    render(<DiscoverFeedSection />);
    expect(screen.getByText(/Couldn't load/)).toBeTruthy();
    const retryBtn = screen.getByText("Retry");
    await userEvent.click(retryBtn);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows empty state with Pick Artists CTA", () => {
    mockUseDiscoverFeed.mockReturnValue({ feed: [], loading: false, error: null, refresh: mockRefresh });
    render(<DiscoverFeedSection />);
    expect(screen.getByText(/Pick artists to personalize/)).toBeTruthy();
    expect(screen.getByText("Pick Artists")).toBeTruthy();
  });

  it("renders artist sections with album cards", () => {
    mockUseDiscoverFeed.mockReturnValue({
      feed: [
        {
          artistId: "a1",
          artistName: "Artist One",
          artistSlug: "artist-one",
          artistImageUrl: null,
          albums: [
            { releaseGroupId: "rg1", title: "Album A", slug: "album-a", imageUrl: null, releaseDate: null, songs: [{ id: "s1", title: "S1", slug: "s1", trackNumber: 1 }] },
            { releaseGroupId: "rg2", title: "Album B", slug: "album-b", imageUrl: null, releaseDate: null, songs: [{ id: "s2", title: "S2", slug: "s2", trackNumber: 1 }] },
          ],
        },
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<DiscoverFeedSection />);
    expect(screen.getByText("Artist One")).toBeTruthy();
    expect(screen.getByText("Album A")).toBeTruthy();
    expect(screen.getByText("Album B")).toBeTruthy();
    const songLabels = screen.getAllByText("1 song");
    expect(songLabels).toHaveLength(2);
  });

  it("shows +N more pill for > 5 albums", () => {
    const albums = Array.from({ length: 7 }, (_, i) => ({
      releaseGroupId: `rg${i}`,
      title: `Album ${i}`,
      slug: `album-${i}`,
      imageUrl: null,
      releaseDate: null,
      songs: [{ id: `s${i}`, title: `S${i}`, slug: `s${i}`, trackNumber: 1 }],
    }));
    mockUseDiscoverFeed.mockReturnValue({
      feed: [{ artistId: "a1", artistName: "Artist One", artistSlug: "artist-one", artistImageUrl: null, albums }],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<DiscoverFeedSection />);
    expect(screen.getByText("+2 more")).toBeTruthy();
  });

  it("album cards link to /album/$slug", () => {
    mockUseDiscoverFeed.mockReturnValue({
      feed: [
        {
          artistId: "a1",
          artistName: "Artist One",
          artistSlug: "artist-one",
          artistImageUrl: null,
          albums: [{ releaseGroupId: "rg1", title: "Album A", slug: "album-a", imageUrl: null, releaseDate: null, songs: [{ id: "s1", title: "S1", slug: "s1", trackNumber: 1 }] }],
        },
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<DiscoverFeedSection />);
    const link = screen.getByText("Album A").closest("a");
    expect(link?.getAttribute("href")).toBe("/album/album-a");
  });

  it("edit artists button opens dialog", async () => {
    mockUseDiscoverFeed.mockReturnValue({
      feed: [
        {
          artistId: "a1",
          artistName: "Artist One",
          artistSlug: "artist-one",
          artistImageUrl: null,
          albums: [{ releaseGroupId: "rg1", title: "Album A", slug: "album-a", imageUrl: null, releaseDate: null, songs: [{ id: "s1", title: "S1", slug: "s1", trackNumber: 1 }] }],
        },
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<DiscoverFeedSection />);
    const editBtn = screen.getByText("Edit artists");
    await userEvent.click(editBtn);
    expect(screen.getByTestId("dialog")).toBeTruthy();
    expect(screen.getByTestId("artist-selector")).toBeTruthy();
  });

  it("renders multiple artists", () => {
    mockUseDiscoverFeed.mockReturnValue({
      feed: [
        {
          artistId: "a1",
          artistName: "Artist One",
          artistSlug: "artist-one",
          artistImageUrl: null,
          albums: [{ releaseGroupId: "rg1", title: "Album A", slug: "album-a", imageUrl: null, releaseDate: null, songs: [{ id: "s1", title: "S1", slug: "s1", trackNumber: 1 }] }],
        },
        {
          artistId: "a2",
          artistName: "Artist Two",
          artistSlug: "artist-two",
          artistImageUrl: null,
          albums: [{ releaseGroupId: "rg2", title: "Album B", slug: "album-b", imageUrl: null, releaseDate: null, songs: [{ id: "s2", title: "S2", slug: "s2", trackNumber: 1 }] }],
        },
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<DiscoverFeedSection />);
    expect(screen.getByText("Artist One")).toBeTruthy();
    expect(screen.getByText("Artist Two")).toBeTruthy();
  });
});
