import { describe, expect, it } from "vitest";
import { engineTone } from "../src/audio/sound";

describe("engine tone", () => {
  it("rises in pitch and brightness with speed", () => {
    const slow = engineTone(0.2, true, false);
    const fast = engineTone(0.9, true, false);
    expect(fast.frequency).toBeGreaterThan(slow.frequency);
    expect(fast.cutoff).toBeGreaterThan(slow.cutoff);
  });

  it("nitro raises pitch and idling is quieter than driving", () => {
    expect(engineTone(0.8, true, true).frequency).toBeGreaterThan(
      engineTone(0.8, true, false).frequency,
    );
    expect(engineTone(0, false, false).gain).toBeLessThan(
      engineTone(0.5, true, false).gain,
    );
  });
});
