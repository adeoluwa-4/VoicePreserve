"use client";

import { useEffect, useMemo, useState } from "react";

type SourceDocument = {
  id: string;
  sourceType: string;
  originalFilename?: string | null;
  createdAt: string;
  content: string;
};

type SentenceDiff = {
  sentenceIndex: number;
  originalSentence: string;
  revisedSentence: string;
  rationale: string;
  semanticScore: number;
  claimStrengthWarning: boolean;
  namedEntityWarning: boolean;
  numberOrDateWarning: boolean;
  citationWarning: boolean;
  decision: "PENDING" | "ACCEPTED" | "REJECTED";
};

type Revision = {
  id: string;
  goal: "NATURAL" | "CONCISE" | "PROFESSIONAL" | "PERSONAL" | "MATCH_SAMPLES";
  readingLevel: string;
  tone: string;
  formality: number;
  aggressiveness: number;
  semanticScore: number;
  driftWarnings: Array<{ sentenceIndex: number; warningType: string; message: string }>;
  rewrittenText: string;
  optionIndex: number;
  createdAt: string;
  status: string;
  sentenceDiffs: SentenceDiff[];
};

type VoiceProfile = {
  id: string;
  name: string;
};

type ProjectData = {
  id: string;
  title: string;
  sourceDocuments: SourceDocument[];
  revisions: Revision[];
};

const goals = [
  { value: "NATURAL", label: "Sound more natural" },
  { value: "CONCISE", label: "Sound more concise" },
  { value: "PROFESSIONAL", label: "Sound more professional" },
  { value: "PERSONAL", label: "Sound more personal" },
  { value: "MATCH_SAMPLES", label: "Match my writing samples" }
] as const;

export function ProjectEditorClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [goal, setGoal] = useState<(typeof goals)[number]["value"]>("NATURAL");
  const [readingLevel, setReadingLevel] = useState("grade9");
  const [tone, setTone] = useState("balanced");
  const [formality, setFormality] = useState(3);
  const [aggressiveness, setAggressiveness] = useState(3);
  const [preserveTerminology, setPreserveTerminology] = useState(true);
  const [preserveSentenceStructure, setPreserveSentenceStructure] = useState(false);
  const [preserveCitation, setPreserveCitation] = useState(true);
  const [lockedTerms, setLockedTerms] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState("");
  const [newText, setNewText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedRevision = useMemo(
    () => project?.revisions.find((revision) => revision.id === selectedRevisionId) ?? project?.revisions[0] ?? null,
    [project, selectedRevisionId]
  );

  async function loadProject() {
    const me = await fetch("/api/auth/me");
    if (me.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const mePayload = (await me.json()) as { csrfToken?: string };
    if (mePayload.csrfToken) {
      localStorage.setItem("vp_csrf", mePayload.csrfToken);
    }

    const [projectRes, profileRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch("/api/voice-profile")
    ]);

    const projectPayload = (await projectRes.json()) as { project: ProjectData; error?: string };
    if (!projectRes.ok) {
      setError(projectPayload.error ?? "Failed to load project");
      return;
    }

    setProject(projectPayload.project);
    if (projectPayload.project.sourceDocuments[0]) {
      setSelectedSourceId(projectPayload.project.sourceDocuments[0].id);
    }
    if (projectPayload.project.revisions[0]) {
      setSelectedRevisionId(projectPayload.project.revisions[0].id);
    }

    if (profileRes.ok) {
      const profilePayload = (await profileRes.json()) as { profiles: VoiceProfile[] };
      setVoiceProfiles(profilePayload.profiles);
    }
  }

  useEffect(() => {
    loadProject().catch(() => setError("Unable to load project."));
  }, [projectId]);

  async function addPastedText() {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/source`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({ content: newText })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to add source text");
      return;
    }

    setNewText("");
    await loadProject();
  }

  async function uploadSourceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    const data = new FormData();
    data.append("projectId", projectId);
    data.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: data
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Upload failed");
      return;
    }

    await loadProject();
  }

  async function generateRewrites() {
    if (!selectedSourceId) {
      setError("Select a source document first.");
      return;
    }

    setError(null);
    const response = await fetch(`/api/projects/${projectId}/rewrite`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({
        projectId,
        sourceDocumentId: selectedSourceId,
        goal,
        readingLevel,
        tone,
        formality,
        aggressiveness,
        preserveTerminology,
        preserveSentenceStructure,
        preserveCitation,
        optionsCount: 3,
        lockedTerms: lockedTerms
          .split(",")
          .map((term) => term.trim())
          .filter(Boolean),
        lockedSentences: [],
        voiceProfileId: voiceProfileId || undefined
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Rewrite generation failed");
      return;
    }

    await loadProject();
  }

  async function decideSentence(sentenceIndex: number, decision: "ACCEPTED" | "REJECTED") {
    if (!selectedRevision) {
      return;
    }

    await fetch(`/api/projects/${projectId}/accept`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({ revisionId: selectedRevision.id, sentenceIndex, decision })
    });

    await loadProject();
  }

  async function generateTransparencyReport() {
    if (!selectedRevision) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/report`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({ revisionId: selectedRevision.id })
    });

    if (response.ok) {
      window.location.href = "/transparency-report";
    }
  }

  async function requestExport(exportType: "FINAL_TEXT" | "TRACKED_DIFF" | "REVISION_SUMMARY" | "TRANSPARENCY_REPORT") {
    if (!selectedRevision) {
      return;
    }

    await fetch(`/api/projects/${projectId}/export`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({
        exportType,
        revisionId: selectedRevision.id
      })
    });

    await loadProject();
  }

  async function restoreRevision() {
    if (!selectedRevision) {
      return;
    }

    await fetch(`/api/projects/${projectId}/restore`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({ revisionId: selectedRevision.id })
    });

    await loadProject();
  }

  return (
    <section className="stack">
      <div className="panel">
        <h1>{project?.title ?? "Project"}</h1>
        <p>Upload source content or paste text, then generate revision options with semantic fidelity warnings.</p>

        <label>
          Paste source text
          <textarea rows={5} value={newText} onChange={(event) => setNewText(event.target.value)} />
        </label>
        <div className="inline-actions">
          <button className="btn btn-secondary" type="button" onClick={addPastedText}>
            Add pasted text
          </button>
          <label className="file-label">
            Upload .txt/.docx/.pdf
            <input type="file" accept=".txt,.docx,.pdf" onChange={uploadSourceFile} />
          </label>
        </div>
      </div>

      <div className="panel">
        <h2>Rewrite controls</h2>
        <div className="grid two">
          <label>
            Source document
            <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
              {project?.sourceDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.originalFilename || `${doc.sourceType} - ${new Date(doc.createdAt).toLocaleString()}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Revision goal
            <select value={goal} onChange={(event) => setGoal(event.target.value as (typeof goals)[number]["value"])}>
              {goals.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Reading level
            <input value={readingLevel} onChange={(event) => setReadingLevel(event.target.value)} />
          </label>

          <label>
            Tone
            <input value={tone} onChange={(event) => setTone(event.target.value)} />
          </label>

          <label>
            Formality (1-5)
            <input type="number" min={1} max={5} value={formality} onChange={(event) => setFormality(Number(event.target.value))} />
          </label>

          <label>
            Edit aggressiveness (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={aggressiveness}
              onChange={(event) => setAggressiveness(Number(event.target.value))}
            />
          </label>

          <label>
            Voice profile
            <select value={voiceProfileId} onChange={(event) => setVoiceProfileId(event.target.value)}>
              <option value="">None</option>
              {voiceProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Locked terms (comma separated)
            <input value={lockedTerms} onChange={(event) => setLockedTerms(event.target.value)} />
          </label>
        </div>

        <div className="inline-actions">
          <label className="checkbox">
            <input checked={preserveTerminology} type="checkbox" onChange={(event) => setPreserveTerminology(event.target.checked)} />
            Preserve terminology
          </label>
          <label className="checkbox">
            <input
              checked={preserveSentenceStructure}
              type="checkbox"
              onChange={(event) => setPreserveSentenceStructure(event.target.checked)}
            />
            Preserve sentence structure
          </label>
          <label className="checkbox">
            <input checked={preserveCitation} type="checkbox" onChange={(event) => setPreserveCitation(event.target.checked)} />
            Preserve citations
          </label>
        </div>

        <button className="btn btn-primary" type="button" onClick={generateRewrites}>
          Generate 1-3 rewrite options
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="panel">
        <h2>Revision options and diffs</h2>
        <label>
          Revision option
          <select value={selectedRevision?.id ?? ""} onChange={(event) => setSelectedRevisionId(event.target.value)}>
            {project?.revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                Option {revision.optionIndex ?? 1} - {new Date(revision.createdAt).toLocaleString()} ({revision.goal})
              </option>
            ))}
          </select>
        </label>

        {selectedRevision ? (
          <>
            <p>
              Semantic score: <strong>{selectedRevision.semanticScore.toFixed(2)}</strong>
            </p>
            {selectedRevision.driftWarnings.length > 0 ? (
              <div className="warning-box">
                <h3>Meaning preservation warnings</h3>
                <ul>
                  {selectedRevision.driftWarnings.map((warning, index) => (
                    <li key={`${warning.warningType}-${index}`}>
                      Sentence {warning.sentenceIndex + 1}: {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="success-text">No semantic drift warnings detected above configured threshold.</p>
            )}

            <div className="diff-grid">
              {selectedRevision.sentenceDiffs.map((diff) => (
                <article key={diff.sentenceIndex} className="diff-card">
                  <h3>Sentence {diff.sentenceIndex + 1}</h3>
                  <p>
                    <strong>Original:</strong> {diff.originalSentence}
                  </p>
                  <p>
                    <strong>Revised:</strong> {diff.revisedSentence}
                  </p>
                  <p>
                    <strong>Rationale:</strong> {diff.rationale}
                  </p>
                  <p>
                    <strong>Decision:</strong> {diff.decision}
                  </p>
                  <div className="inline-actions">
                    <button className="btn btn-small" type="button" onClick={() => decideSentence(diff.sentenceIndex, "ACCEPTED")}>
                      Accept
                    </button>
                    <button className="btn btn-small" type="button" onClick={() => decideSentence(diff.sentenceIndex, "REJECTED")}>
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="inline-actions">
              <button className="btn btn-secondary" type="button" onClick={generateTransparencyReport}>
                Generate transparency report
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => requestExport("FINAL_TEXT")}>
                Export final text
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => requestExport("TRACKED_DIFF")}>
                Export tracked diff
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => requestExport("REVISION_SUMMARY")}>
                Export revision summary
              </button>
              <button className="btn btn-secondary" type="button" onClick={restoreRevision}>
                Restore this version
              </button>
            </div>
          </>
        ) : (
          <p>No revisions yet.</p>
        )}
      </div>
    </section>
  );
}
