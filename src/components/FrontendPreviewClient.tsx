"use client";

import { useMemo, useState } from "react";

type Goal = "NATURAL" | "CONCISE" | "PROFESSIONAL" | "PERSONAL" | "MATCH_SAMPLES";

type SentenceItem = {
  index: number;
  original: string;
  revised: string;
  rationale: string;
  warning?: string;
  decision: "PENDING" | "ACCEPTED" | "REJECTED";
};

const goalLabels: Record<Goal, string> = {
  NATURAL: "Sound more natural",
  CONCISE: "Sound more concise",
  PROFESSIONAL: "Sound more professional",
  PERSONAL: "Sound more personal",
  MATCH_SAMPLES: "Match my own writing samples"
};

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

function rewriteSentence(sentence: string, goal: Goal): string {
  let out = sentence;
  if (goal === "NATURAL") out = out.replace(/utilize/gi, "use").replace(/commence/gi, "start");
  if (goal === "CONCISE") out = out.replace(/in order to/gi, "to").replace(/it is important to note that/gi, "");
  if (goal === "PROFESSIONAL") out = out.replace(/I think/gi, "The analysis indicates");
  if (goal === "PERSONAL") out = out.replace(/The team/gi, "We");
  if (goal === "MATCH_SAMPLES") out = `${out} This keeps your familiar cadence.`;
  return out.replace(/\s{2,}/g, " ").trim();
}

export function FrontendPreviewClient() {
  const [goal, setGoal] = useState<Goal>("NATURAL");
  const [readingLevel, setReadingLevel] = useState("grade9");
  const [tone, setTone] = useState("balanced");
  const [formality, setFormality] = useState(3);
  const [aggressiveness, setAggressiveness] = useState(3);
  const [preserveTerminology, setPreserveTerminology] = useState(true);
  const [preserveSentenceStructure, setPreserveSentenceStructure] = useState(false);
  const [preserveCitation, setPreserveCitation] = useState(true);
  const [sourceText, setSourceText] = useState(
    "Our new process is expected to improve throughput by 30 percent over Q4. We should announce this next Monday after legal review."
  );
  const [sentences, setSentences] = useState<SentenceItem[]>([]);

  const semanticScore = useMemo(() => {
    if (sentences.length === 0) return 0;
    const unchanged = sentences.filter((s) => s.original === s.revised).length;
    return Number((0.75 + unchanged / (sentences.length * 4)).toFixed(2));
  }, [sentences]);

  function generatePreview() {
    const source = splitSentences(sourceText);
    const next: SentenceItem[] = source.map((original, index) => {
      const revised = preserveSentenceStructure && index % 2 === 0 ? original : rewriteSentence(original, goal);
      const warning = revised !== original && original.match(/\d|Monday|Tuesday|Wednesday|Thursday|Friday/i)
        ? "Numbers/dates changed or require manual verification."
        : undefined;

      return {
        index,
        original,
        revised,
        rationale: `Adjusted for ${goalLabels[goal].toLowerCase()} with ${tone} tone and ${readingLevel} readability.`,
        warning,
        decision: "PENDING"
      };
    });

    setSentences(next);
  }

  function setDecision(index: number, decision: "ACCEPTED" | "REJECTED") {
    setSentences((current) => current.map((s) => (s.index === index ? { ...s, decision } : s)));
  }

  return (
    <section className="stack">
      <div className="panel">
        <h1>Frontend Preview Mode</h1>
        <p>
          This page runs entirely in the browser with mock data so you can evaluate the VoicePreserve UI before backend setup.
        </p>
      </div>

      <div className="panel">
        <h2>Input and controls</h2>
        <label>
          Source text
          <textarea rows={6} value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
        </label>

        <div className="grid two">
          <label>
            Revision goal
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {Object.entries(goalLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Reading level
            <input value={readingLevel} onChange={(e) => setReadingLevel(e.target.value)} />
          </label>

          <label>
            Tone
            <input value={tone} onChange={(e) => setTone(e.target.value)} />
          </label>

          <label>
            Formality
            <input type="number" min={1} max={5} value={formality} onChange={(e) => setFormality(Number(e.target.value))} />
          </label>

          <label>
            Edit aggressiveness
            <input
              type="number"
              min={1}
              max={5}
              value={aggressiveness}
              onChange={(e) => setAggressiveness(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="inline-actions">
          <label className="checkbox">
            <input checked={preserveTerminology} type="checkbox" onChange={(e) => setPreserveTerminology(e.target.checked)} />
            Preserve terminology
          </label>
          <label className="checkbox">
            <input
              checked={preserveSentenceStructure}
              type="checkbox"
              onChange={(e) => setPreserveSentenceStructure(e.target.checked)}
            />
            Preserve sentence structure
          </label>
          <label className="checkbox">
            <input checked={preserveCitation} type="checkbox" onChange={(e) => setPreserveCitation(e.target.checked)} />
            Preserve citations
          </label>
        </div>

        <button className="btn btn-primary" type="button" onClick={generatePreview}>
          Generate 1-3 rewrite options (mock)
        </button>
      </div>

      <div className="panel">
        <h2>Diff and review</h2>
        {sentences.length === 0 ? (
          <p>No preview yet. Generate rewrites above.</p>
        ) : (
          <>
            <p>
              Semantic score (mock): <strong>{semanticScore}</strong>
            </p>
            <div className="diff-grid">
              {sentences.map((s) => (
                <article key={s.index} className="diff-card">
                  <h3>Sentence {s.index + 1}</h3>
                  <p>
                    <strong>Original:</strong> {s.original}
                  </p>
                  <p>
                    <strong>Revised:</strong> {s.revised}
                  </p>
                  <p>
                    <strong>Rationale:</strong> {s.rationale}
                  </p>
                  {s.warning ? <p className="error-text">Warning: {s.warning}</p> : null}
                  <p>
                    <strong>Decision:</strong> {s.decision}
                  </p>
                  <div className="inline-actions">
                    <button className="btn btn-small" type="button" onClick={() => setDecision(s.index, "ACCEPTED")}>
                      Accept
                    </button>
                    <button className="btn btn-small" type="button" onClick={() => setDecision(s.index, "REJECTED")}>
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Next step for full app</h2>
        <p>
          When you are ready for real login, uploads, persistence, and exports, install Docker Desktop and run Postgres + Redis.
        </p>
      </div>
    </section>
  );
}
