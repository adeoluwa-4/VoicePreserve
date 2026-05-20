import { splitSentences } from "@/lib/utils/text";

const transitionWords = ["however", "therefore", "meanwhile", "additionally", "instead", "because", "although"];

export interface VoiceProfileFeatures {
  avgSentenceLength: number;
  preferredTransitions: string[];
  toneMarkers: string[];
  punctuationHabits: Record<string, number>;
  lexicalFeatures: {
    uniqueTokenRatio: number;
    firstPersonRate: number;
  };
}

export function extractVoiceFeatures(samples: string[]): VoiceProfileFeatures {
  const combined = samples.join(" ").trim();
  const sentences = splitSentences(combined);
  const words = combined.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);

  const transitionCounts = transitionWords
    .map((word) => ({ word, count: words.filter((item) => item === word).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => item.word);

  const punctuationHabits = {
    commas: (combined.match(/,/g) ?? []).length,
    semicolons: (combined.match(/;/g) ?? []).length,
    exclamations: (combined.match(/!/g) ?? []).length,
    emDashes: (combined.match(/—/g) ?? []).length
  };

  const avgSentenceLength =
    sentences.length === 0 ? 0 : words.length / Math.max(sentences.length, 1);

  const firstPersonCount = words.filter((word) => ["i", "we", "my", "our", "me", "us"].includes(word)).length;

  const toneMarkers = ["hedging", "direct", "warm"].filter((marker) => {
    if (marker === "hedging") {
      return words.some((word) => ["might", "could", "perhaps", "maybe"].includes(word));
    }
    if (marker === "direct") {
      return punctuationHabits.semicolons < punctuationHabits.commas;
    }
    return firstPersonCount > 0;
  });

  return {
    avgSentenceLength,
    preferredTransitions: transitionCounts,
    toneMarkers,
    punctuationHabits,
    lexicalFeatures: {
      uniqueTokenRatio: words.length === 0 ? 0 : uniqueWords.size / words.length,
      firstPersonRate: words.length === 0 ? 0 : firstPersonCount / words.length
    }
  };
}
