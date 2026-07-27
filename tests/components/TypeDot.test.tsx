import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypeDot } from "../../src/components/feed/TypeDot";

describe("TypeDot", () => {
  it("renders heard dot with correct aria label", () => {
    render(<TypeDot type="heard" />);
    const dot = screen.getByLabelText("heard");
    expect(dot).toBeTruthy();
    expect(dot.className).toContain("bg-heard");
  });

  it("renders liked dot", () => {
    render(<TypeDot type="like" />);
    const dot = screen.getByLabelText("liked");
    expect(dot.className).toContain("bg-like");
  });

  it("renders disliked dot", () => {
    render(<TypeDot type="dislike" />);
    const dot = screen.getByLabelText("disliked");
    expect(dot.className).toContain("bg-dislike");
  });

  it("renders want dot", () => {
    render(<TypeDot type="want" />);
    const dot = screen.getByLabelText("wants to hear");
    expect(dot.className).toContain("bg-want");
  });

  it("renders review dot with save color and extra ring", () => {
    render(<TypeDot type="review" />);
    const dot = screen.getByLabelText("reviewed");
    expect(dot.className).toContain("bg-save");
    expect(dot.className).toContain("ring-white/30");
  });

  it("all dots have base ring", () => {
    render(<TypeDot type="heard" />);
    const dot = screen.getByLabelText("heard");
    expect(dot.className).toContain("ring-black/20");
  });

  it("review dot has double ring", () => {
    render(<TypeDot type="review" />);
    const dot = screen.getByLabelText("reviewed");
    expect(dot.className).toContain("ring-black/20");
    expect(dot.className).toContain("ring-white/30");
  });
});
