export interface RewriteContext {
  goal: "NATURAL" | "CONCISE" | "PROFESSIONAL" | "PERSONAL" | "MATCH_SAMPLES";
  readingLevel: string;
  tone: string;
  formality: number;
  aggressiveness: number;
  preserveSentenceStructure: boolean;
  preserveTerminology: boolean;
  lockedTerms: string[];
}

export interface RewriteCandidate {
  rewrittenText: string;
  rationale: string;
}

export interface RewriteProvider {
  generate(text: string, context: RewriteContext, optionsCount: number): Promise<RewriteCandidate[]>;
}
