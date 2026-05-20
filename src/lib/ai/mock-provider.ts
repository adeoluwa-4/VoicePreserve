import { RewriteCandidate, RewriteContext, RewriteProvider } from "@/lib/ai/provider";
import { splitSentences } from "@/lib/utils/text";

function tuneSentence(sentence: string, context: RewriteContext, variant: number): string {
  let revised = sentence;

  if (context.goal === "CONCISE") {
    revised = revised
      .replace(/\b(in order to|due to the fact that|it is important to note that)\b/gi, "to")
      .replace(/\bvery\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  if (context.goal === "PROFESSIONAL") {
    revised = revised.replace(/\bI think\b/gi, "The analysis indicates");
  }

  if (context.goal === "PERSONAL") {
    revised = revised.replace(/\bThe team\b/gi, "We");
  }

  if (context.goal === "NATURAL") {
    revised = revised.replace(/\butilize\b/gi, "use").replace(/\bcommence\b/gi, "start");
  }

  if (context.goal === "MATCH_SAMPLES") {
    revised = `${revised} ${variant % 2 === 0 ? "This sounds aligned with your prior style." : "This keeps your familiar rhythm."}`;
  }

  if (context.formality <= 2) {
    revised = revised.replace(/\btherefore\b/gi, "so");
  }

  if (context.formality >= 4) {
    revised = revised.replace(/\bso\b/gi, "therefore");
  }

  if (context.tone === "confident") {
    revised = revised.replace(/\bmight\b/gi, "will likely");
  }

  for (const term of context.lockedTerms) {
    if (!sentence.includes(term)) {
      continue;
    }
    revised = revised.replace(new RegExp(term, "gi"), term);
  }

  return revised;
}

export class MockRewriteProvider implements RewriteProvider {
  async generate(text: string, context: RewriteContext, optionsCount: number): Promise<RewriteCandidate[]> {
    const sentences = splitSentences(text);
    const candidates: RewriteCandidate[] = [];

    for (let index = 0; index < optionsCount; index += 1) {
      const rewritten = sentences
        .map((sentence, sentenceIndex) => {
          if (context.preserveSentenceStructure && sentenceIndex % 2 === 0) {
            return sentence;
          }
          return tuneSentence(sentence, context, index + 1);
        })
        .join(" ");

      candidates.push({
        rewrittenText: rewritten,
        rationale: `Option ${index + 1} prioritizes ${context.goal.toLowerCase()} changes with ${context.tone} tone and reading level ${context.readingLevel}.`
      });
    }

    return candidates;
  }
}
