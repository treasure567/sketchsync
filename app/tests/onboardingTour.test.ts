import {
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
  placeTourCard,
  readTourDone,
  writeTourDone,
} from "../components/onboardingTourSteps";

const viewport = { width: 375, height: 812 };
const card = { width: 351, height: 200 };

describe("quick tour steps", () => {
  it("is short enough to finish in under a minute", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(5);
    for (const isPhone of [true, false]) {
      const words = TOUR_STEPS.map(
        (step) =>
          `${step.title} ${step.body({ isPhone, isMac: false })}`.split(/\s+/)
            .length,
      ).reduce((sum, count) => sum + count, 0);
      // about 200 words per minute is a relaxed reading pace
      expect(words).toBeLessThan(200);
    }
  });

  it("covers drawing, moving, sharing and undo, and names SketchSync", () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual([
      "draw",
      "move",
      "share",
      "undo",
    ]);
    expect(TOUR_STEPS[0].title).toContain("SketchSync");
    for (const step of TOUR_STEPS) {
      for (const context of [
        { isPhone: true, isMac: false },
        { isPhone: false, isMac: true },
      ]) {
        expect(step.body(context)).not.toMatch(/sketchsync/i);
      }
    }
  });
});

describe("quick tour card placement", () => {
  it("centres the card without a target", () => {
    expect(placeTourCard(null, card, viewport)).toEqual({
      left: 12,
      top: 306,
      side: "centre",
    });
  });

  it("puts the card above a target at the bottom of a phone", () => {
    const toolbar = { left: 14, top: 756, width: 347, height: 48 };
    expect(placeTourCard(toolbar, card, viewport)).toEqual({
      left: 12,
      top: 544,
      side: "above",
    });
  });

  it("puts the card below a target near the top, clamped to the screen", () => {
    const share = { left: 1100, top: 16, width: 90, height: 36 };
    expect(
      placeTourCard(
        share,
        { width: 352, height: 180 },
        { width: 1200, height: 800 },
      ),
    ).toEqual({ left: 836, top: 64, side: "below" });
  });
});

describe("quick tour storage", () => {
  it("remembers completion", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    expect(readTourDone(storage)).toBe(false);
    writeTourDone(storage);
    expect(values.get(TOUR_STORAGE_KEY)).toBe("1");
    expect(readTourDone(storage)).toBe(true);
  });

  it("does not crash when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readTourDone(blocked)).toBeNull();
    expect(() => writeTourDone(blocked)).not.toThrow();
    expect(readTourDone(null)).toBeNull();
  });
});
