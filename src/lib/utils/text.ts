const sentenceRegex = /[^.!?]+[.!?]?/g;

export function splitSentences(text: string): string[] {
  const matches = text.match(sentenceRegex) ?? [];
  return matches.map((item) => item.trim()).filter(Boolean);
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function semanticSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));

  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

export function changedNamedEntities(a: string, b: string): boolean {
  const entityRegex = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
  const aEntities = new Set(a.match(entityRegex) ?? []);
  const bEntities = new Set(b.match(entityRegex) ?? []);
  if (aEntities.size !== bEntities.size) {
    return true;
  }

  for (const entity of aEntities) {
    if (!bEntities.has(entity)) {
      return true;
    }
  }

  return false;
}

export function changedNumbersDatesOrUnits(a: string, b: string): boolean {
  const numberLikeRegex = /\b\d+(?:\.\d+)?(?:%|\s?(?:kg|km|m|hours?|days?|weeks?|months?|years?))?\b/gi;
  const aMatches = a.match(numberLikeRegex) ?? [];
  const bMatches = b.match(numberLikeRegex) ?? [];
  return aMatches.join("|") !== bMatches.join("|");
}

export function citationChanged(a: string, b: string): boolean {
  const citationRegex = /(\[[0-9]+\]|\([A-Za-z]+,\s?[0-9]{4}\))/g;
  const aCitations = a.match(citationRegex) ?? [];
  const bCitations = b.match(citationRegex) ?? [];
  return aCitations.join("|") !== bCitations.join("|");
}
