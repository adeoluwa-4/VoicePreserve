import { describe, expect, it } from "vitest";
import { extractVoiceFeatures } from "@/lib/services/voice-profile";

describe("voice profile extraction", () => {
  it("extracts baseline style features", () => {
    const features = extractVoiceFeatures([
      "I usually write with short sentences. However, I still explain context clearly.",
      "We therefore keep examples practical, and we avoid inflated wording."
    ]);

    expect(features.avgSentenceLength).toBeGreaterThan(0);
    expect(features.lexicalFeatures.uniqueTokenRatio).toBeGreaterThan(0);
    expect(features.preferredTransitions.length).toBeGreaterThan(0);
  });
});
