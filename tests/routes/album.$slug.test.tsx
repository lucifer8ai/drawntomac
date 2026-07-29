import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, ComponentType } from "react";

const state = vi.hoisted(() => ({
  routeMockData: null as any,
  RouteComponent: null as ComponentType | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (routeConfig: any) => {
    state.RouteComponent = routeConfig.component;
    return { useLoaderData: () => state.routeMockData };
  },
  Link: ({ to, params, children, className }: any) => {
    const href = to.replace("$slug", params?.slug ?? "");
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: () => {},
}));

import "@/routes/album.$slug";

function renderAlbumPage() {
  if (!state.RouteComponent) throw new Error("Route not loaded");
  return render(createElement(state.RouteComponent));
}

describe("album.$slug", () => {
  beforeEach(() => {
    state.routeMockData = null;
  });

  it("renders album title, artist name, and tracklist", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Test Album",
        slug: "test-album",
        image_url: null,
        primary_type: "Album",
        release_date: "2024-06-15",
        artist: { id: "a1", name: "Test Artist", slug: "test-artist" },
      },
      songs: [
        {
          id: "s1",
          title: "Song One",
          slug: "song-one",
          track_number: 1,
          genius_thumbnail_url: null,
        },
        {
          id: "s2",
          title: "Song Two",
          slug: "song-two",
          track_number: 2,
          genius_thumbnail_url: null,
        },
      ],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    expect(screen.getByText("Test Album")).toBeTruthy();
    expect(screen.getByText("by Test Artist")).toBeTruthy();
    expect(screen.getByText("Song One")).toBeTruthy();
    expect(screen.getByText("Song Two")).toBeTruthy();
    expect(screen.getByText("2 songs")).toBeTruthy();
  });

  it("renders artwork when image_url is set", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Art Album",
        slug: "art",
        image_url: "https://cdn.example/art.jpg",
        primary_type: "Album",
        release_date: null,
        artist: null,
      },
      songs: [],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe("https://cdn.example/art.jpg");
  });

  it("falls back to child song artwork when image_url is null", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "No Art Album",
        slug: "noart",
        image_url: null,
        primary_type: "Album",
        release_date: null,
        artist: null,
      },
      songs: [
        {
          id: "s1",
          title: "S1",
          slug: "s1",
          track_number: 1,
          genius_thumbnail_url: "https://cdn.example/song.jpg",
        },
      ],
      fallbackArtwork: "https://cdn.example/song.jpg",
    };
    renderAlbumPage();
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe("https://cdn.example/song.jpg");
  });

  it("shows album type and year", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Test EP",
        slug: "test-ep",
        image_url: null,
        primary_type: "EP",
        release_date: "2023-03-01",
        artist: null,
      },
      songs: [
        {
          id: "s1",
          title: "S1",
          slug: "s1",
          track_number: 1,
          genius_thumbnail_url: null,
        },
      ],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    expect(screen.getByText("EP")).toBeTruthy();
    expect(screen.getByText("2023")).toBeTruthy();
  });

  it("renders without crashing with 0 songs", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Empty Album",
        slug: "empty",
        image_url: null,
        primary_type: null,
        release_date: null,
        artist: { id: "a1", name: "Artist", slug: "artist" },
      },
      songs: [],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    expect(screen.getByText("Empty Album")).toBeTruthy();
    expect(screen.getByText("No songs found for this album.")).toBeTruthy();
  });

  it("renders back link and logo", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Test",
        slug: "test",
        image_url: null,
        primary_type: null,
        release_date: null,
        artist: null,
      },
      songs: [],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    expect(screen.getByText("#d.To")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("artist name links to artist page", () => {
    state.routeMockData = {
      album: {
        id: "rg1",
        title: "Test",
        slug: "test",
        image_url: null,
        primary_type: null,
        release_date: null,
        artist: { id: "a1", name: "My Artist", slug: "my-artist" },
      },
      songs: [],
      fallbackArtwork: null,
    };
    renderAlbumPage();
    const link = screen.getByText("by My Artist");
    expect(link.closest("a")?.getAttribute("href")).toBe("/artist/my-artist");
  });
});
