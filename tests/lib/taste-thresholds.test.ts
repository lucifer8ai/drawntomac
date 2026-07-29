import { describe, it, expect } from "vitest";
import { getTastePercentage } from "@/lib/taste-thresholds";

describe("getTastePercentage", () => {
  describe("heard", () => {
    it("returns 0 for count 0", () => {
      expect(getTastePercentage("heard", 0)).toBe(0);
    });
    it("returns 8 for 1–10", () => {
      expect(getTastePercentage("heard", 1)).toBe(8);
      expect(getTastePercentage("heard", 5)).toBe(8);
      expect(getTastePercentage("heard", 10)).toBe(8);
    });
    it("returns 15 for 11–20", () => {
      expect(getTastePercentage("heard", 11)).toBe(15);
      expect(getTastePercentage("heard", 20)).toBe(15);
    });
    it("returns 27 for 21–39", () => {
      expect(getTastePercentage("heard", 21)).toBe(27);
      expect(getTastePercentage("heard", 39)).toBe(27);
    });
    it("returns 46 for 40–79", () => {
      expect(getTastePercentage("heard", 40)).toBe(46);
      expect(getTastePercentage("heard", 79)).toBe(46);
    });
    it("returns 50 for 80–95", () => {
      expect(getTastePercentage("heard", 80)).toBe(50);
      expect(getTastePercentage("heard", 95)).toBe(50);
    });
    it("returns 55 for 96–105", () => {
      expect(getTastePercentage("heard", 96)).toBe(55);
      expect(getTastePercentage("heard", 105)).toBe(55);
    });
    it("returns 60 for 106–149", () => {
      expect(getTastePercentage("heard", 106)).toBe(60);
      expect(getTastePercentage("heard", 149)).toBe(60);
    });
    it("returns 73 for 150–189", () => {
      expect(getTastePercentage("heard", 150)).toBe(73);
      expect(getTastePercentage("heard", 189)).toBe(73);
    });
    it("returns 81 for 190–239", () => {
      expect(getTastePercentage("heard", 190)).toBe(81);
      expect(getTastePercentage("heard", 239)).toBe(81);
    });
    it("returns 95 for 240–399", () => {
      expect(getTastePercentage("heard", 240)).toBe(95);
      expect(getTastePercentage("heard", 399)).toBe(95);
    });
    it("returns 100 for 400+", () => {
      expect(getTastePercentage("heard", 400)).toBe(100);
      expect(getTastePercentage("heard", 9999)).toBe(100);
    });
  });

  describe("liked", () => {
    it("returns 0 for count 0", () => {
      expect(getTastePercentage("liked", 0)).toBe(0);
    });
    it("returns 10 for 1–10", () => {
      expect(getTastePercentage("liked", 1)).toBe(10);
      expect(getTastePercentage("liked", 10)).toBe(10);
    });
    it("returns 18 for 11–39", () => {
      expect(getTastePercentage("liked", 11)).toBe(18);
      expect(getTastePercentage("liked", 39)).toBe(18);
    });
    it("returns 25 for 40–99", () => {
      expect(getTastePercentage("liked", 40)).toBe(25);
      expect(getTastePercentage("liked", 99)).toBe(25);
    });
    it("returns 33 for 100–159", () => {
      expect(getTastePercentage("liked", 100)).toBe(33);
      expect(getTastePercentage("liked", 159)).toBe(33);
    });
    it("returns 55 for 160–200", () => {
      expect(getTastePercentage("liked", 160)).toBe(55);
      expect(getTastePercentage("liked", 200)).toBe(55);
    });
    it("returns 63 for 201–249", () => {
      expect(getTastePercentage("liked", 201)).toBe(63);
      expect(getTastePercentage("liked", 249)).toBe(63);
    });
    it("returns 78 for 250–310", () => {
      expect(getTastePercentage("liked", 250)).toBe(78);
      expect(getTastePercentage("liked", 310)).toBe(78);
    });
    it("returns 88 for 311–369", () => {
      expect(getTastePercentage("liked", 311)).toBe(88);
      expect(getTastePercentage("liked", 369)).toBe(88);
    });
    it("returns 94 for 370–429", () => {
      expect(getTastePercentage("liked", 370)).toBe(94);
      expect(getTastePercentage("liked", 429)).toBe(94);
    });
    it("returns 99 for 430–469", () => {
      expect(getTastePercentage("liked", 430)).toBe(99);
      expect(getTastePercentage("liked", 469)).toBe(99);
    });
    it("returns 100 for 470+", () => {
      expect(getTastePercentage("liked", 470)).toBe(100);
      expect(getTastePercentage("liked", 9999)).toBe(100);
    });
  });

  describe("disliked", () => {
    it("returns 0 for count 0", () => {
      expect(getTastePercentage("disliked", 0)).toBe(0);
    });
    it("returns 12 for 1–15", () => {
      expect(getTastePercentage("disliked", 1)).toBe(12);
      expect(getTastePercentage("disliked", 15)).toBe(12);
    });
    it("returns 33 for 16–59", () => {
      expect(getTastePercentage("disliked", 16)).toBe(33);
      expect(getTastePercentage("disliked", 59)).toBe(33);
    });
    it("returns 55 for 60–99", () => {
      expect(getTastePercentage("disliked", 60)).toBe(55);
      expect(getTastePercentage("disliked", 99)).toBe(55);
    });
    it("returns 89 for 100–149", () => {
      expect(getTastePercentage("disliked", 100)).toBe(89);
      expect(getTastePercentage("disliked", 149)).toBe(89);
    });
    it("returns 96 for 150–199", () => {
      expect(getTastePercentage("disliked", 150)).toBe(96);
      expect(getTastePercentage("disliked", 199)).toBe(96);
    });
    it("returns 100 for 200+", () => {
      expect(getTastePercentage("disliked", 200)).toBe(100);
      expect(getTastePercentage("disliked", 9999)).toBe(100);
    });
  });

  describe("want", () => {
    it("returns 0 for count 0", () => {
      expect(getTastePercentage("want", 0)).toBe(0);
    });
    it("returns 19 for 1–10", () => {
      expect(getTastePercentage("want", 1)).toBe(19);
      expect(getTastePercentage("want", 10)).toBe(19);
    });
    it("returns 27 for 11–39", () => {
      expect(getTastePercentage("want", 11)).toBe(27);
      expect(getTastePercentage("want", 39)).toBe(27);
    });
    it("returns 55 for 40–55", () => {
      expect(getTastePercentage("want", 40)).toBe(55);
      expect(getTastePercentage("want", 55)).toBe(55);
    });
    it("returns 78 for 56–58", () => {
      expect(getTastePercentage("want", 56)).toBe(78);
      expect(getTastePercentage("want", 58)).toBe(78);
    });
    it("returns 88 for 59–62", () => {
      expect(getTastePercentage("want", 59)).toBe(88);
      expect(getTastePercentage("want", 62)).toBe(88);
    });
    it("returns 95 for 63–65", () => {
      expect(getTastePercentage("want", 63)).toBe(95);
      expect(getTastePercentage("want", 65)).toBe(95);
    });
    it("returns 100 for 66+", () => {
      expect(getTastePercentage("want", 66)).toBe(100);
      expect(getTastePercentage("want", 9999)).toBe(100);
    });
  });

  describe("review", () => {
    it("returns 0 for count 0", () => {
      expect(getTastePercentage("review", 0)).toBe(0);
    });
    it("returns 9 for 1–10", () => {
      expect(getTastePercentage("review", 1)).toBe(9);
      expect(getTastePercentage("review", 10)).toBe(9);
    });
    it("returns 16 for 11–20", () => {
      expect(getTastePercentage("review", 11)).toBe(16);
      expect(getTastePercentage("review", 20)).toBe(16);
    });
    it("returns 26 for 21–39", () => {
      expect(getTastePercentage("review", 21)).toBe(26);
      expect(getTastePercentage("review", 39)).toBe(26);
    });
    it("returns 39 for 40–79", () => {
      expect(getTastePercentage("review", 40)).toBe(39);
      expect(getTastePercentage("review", 79)).toBe(39);
    });
    it("returns 48 for 80–95", () => {
      expect(getTastePercentage("review", 80)).toBe(48);
      expect(getTastePercentage("review", 95)).toBe(48);
    });
    it("returns 55 for 96–105", () => {
      expect(getTastePercentage("review", 96)).toBe(55);
      expect(getTastePercentage("review", 105)).toBe(55);
    });
    it("returns 60 for 106–149", () => {
      expect(getTastePercentage("review", 106)).toBe(60);
      expect(getTastePercentage("review", 149)).toBe(60);
    });
    it("returns 73 for 150–189", () => {
      expect(getTastePercentage("review", 150)).toBe(73);
      expect(getTastePercentage("review", 189)).toBe(73);
    });
    it("returns 86 for 190–239", () => {
      expect(getTastePercentage("review", 190)).toBe(86);
      expect(getTastePercentage("review", 239)).toBe(86);
    });
    it("returns 98 for 240–399", () => {
      expect(getTastePercentage("review", 240)).toBe(98);
      expect(getTastePercentage("review", 399)).toBe(98);
    });
    it("returns 100 for 400+", () => {
      expect(getTastePercentage("review", 400)).toBe(100);
      expect(getTastePercentage("review", 9999)).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("clamps negative count to 0", () => {
      expect(getTastePercentage("heard", -5)).toBe(0);
      expect(getTastePercentage("liked", -1)).toBe(0);
    });
    it("clamps NaN to 0", () => {
      expect(getTastePercentage("heard", NaN)).toBe(0);
    });
    it("floors float counts", () => {
      expect(getTastePercentage("heard", 10.7)).toBe(8);
      expect(getTastePercentage("liked", 39.9)).toBe(18);
    });
    it("handles Infinity count", () => {
      expect(getTastePercentage("heard", Infinity)).toBe(0);
    });
  });
});
