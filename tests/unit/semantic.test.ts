import { describe, expect, it } from "vitest";
import { analyzeSemanticFidelity } from "@/lib/services/semantic";

describe("semantic fidelity", () => {
  it("flags named entity and numeric drift", () => {
    const original = "Acme Corp increased output by 20% in 2025.";
    const revised = "Beta Corp increased output by 10% in 2024.";

    const result = analyzeSemanticFidelity(original, revised);

    expect(result.warnings.some((warning) => warning.warningType === "NAMED_ENTITY")).toBe(true);
    expect(result.warnings.some((warning) => warning.warningType === "NUMBER_OR_DATE")).toBe(true);
  });

  it("keeps high score for close paraphrase", () => {
    const original = "We will publish the update after legal review on Monday.";
    const revised = "We plan to publish the update on Monday after legal review.";

    const result = analyzeSemanticFidelity(original, revised);

    expect(result.semanticScore).toBeGreaterThan(0.65);
  });
});
