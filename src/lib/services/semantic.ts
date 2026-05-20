import {
  changedNamedEntities,
  changedNumbersDatesOrUnits,
  citationChanged,
  semanticSimilarity,
  splitSentences
} from "@/lib/utils/text";
import { getSemanticThreshold } from "@/lib/utils/env";

export interface DriftWarning {
  sentenceIndex: number;
  warningType: "LOW_SIMILARITY" | "CLAIM_STRENGTH" | "NAMED_ENTITY" | "NUMBER_OR_DATE" | "CITATION";
  message: string;
}

export interface SentenceAnalysis {
  sentenceIndex: number;
  originalSentence: string;
  revisedSentence: string;
  semanticScore: number;
  claimStrengthWarning: boolean;
  namedEntityWarning: boolean;
  numberOrDateWarning: boolean;
  citationWarning: boolean;
}

function claimStrengthShift(a: string, b: string): boolean {
  const weak = ["might", "may", "could", "possibly"];
  const strong = ["will", "must", "definitely", "always"];
  const weakInA = weak.some((word) => a.toLowerCase().includes(word));
  const strongInB = strong.some((word) => b.toLowerCase().includes(word));
  return weakInA && strongInB;
}

export function analyzeSemanticFidelity(original: string, revised: string) {
  const threshold = getSemanticThreshold();
  const originalSentences = splitSentences(original);
  const revisedSentences = splitSentences(revised);
  const sentenceCount = Math.max(originalSentences.length, revisedSentences.length);
  const analyses: SentenceAnalysis[] = [];
  const warnings: DriftWarning[] = [];

  for (let index = 0; index < sentenceCount; index += 1) {
    const sourceSentence = originalSentences[index] ?? "";
    const revisedSentence = revisedSentences[index] ?? "";
    const semanticScore = semanticSimilarity(sourceSentence, revisedSentence);
    const claimStrengthWarning = claimStrengthShift(sourceSentence, revisedSentence);
    const namedEntityWarning = changedNamedEntities(sourceSentence, revisedSentence);
    const numberOrDateWarning = changedNumbersDatesOrUnits(sourceSentence, revisedSentence);
    const citationWarning = citationChanged(sourceSentence, revisedSentence);

    analyses.push({
      sentenceIndex: index,
      originalSentence: sourceSentence,
      revisedSentence,
      semanticScore,
      claimStrengthWarning,
      namedEntityWarning,
      numberOrDateWarning,
      citationWarning
    });

    if (semanticScore < threshold) {
      warnings.push({
        sentenceIndex: index,
        warningType: "LOW_SIMILARITY",
        message: "Sentence meaning may have drifted below the configured semantic threshold."
      });
    }

    if (claimStrengthWarning) {
      warnings.push({
        sentenceIndex: index,
        warningType: "CLAIM_STRENGTH",
        message: "Potential change in claim strength detected."
      });
    }

    if (namedEntityWarning) {
      warnings.push({
        sentenceIndex: index,
        warningType: "NAMED_ENTITY",
        message: "Named entity changes detected."
      });
    }

    if (numberOrDateWarning) {
      warnings.push({
        sentenceIndex: index,
        warningType: "NUMBER_OR_DATE",
        message: "Numbers, units, or dates appear to have changed."
      });
    }

    if (citationWarning) {
      warnings.push({
        sentenceIndex: index,
        warningType: "CITATION",
        message: "Citation references changed."
      });
    }
  }

  const averageScore =
    analyses.length === 0 ? 1 : analyses.reduce((acc, item) => acc + item.semanticScore, 0) / analyses.length;

  return {
    analyses,
    warnings,
    semanticScore: averageScore
  };
}
