"use client";

import { useEffect, useState } from "react";

type Sample = {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
};

type VoiceProfile = {
  id: string;
  name: string;
  avgSentenceLength: number;
  preferredTransitions: string[];
  toneMarkers: string[];
  punctuationHabits: Record<string, number>;
};

export function VoiceProfileClient() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [name, setName] = useState("My voice profile");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me");
    if (me.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const meData = (await me.json()) as { csrfToken?: string };
    if (meData.csrfToken) {
      localStorage.setItem("vp_csrf", meData.csrfToken);
    }

    const [samplesRes, profilesRes] = await Promise.all([
      fetch("/api/writing-samples"),
      fetch("/api/voice-profile")
    ]);

    const samplesPayload = (await samplesRes.json()) as { samples: Sample[] };
    const profilesPayload = (await profilesRes.json()) as { profiles: VoiceProfile[] };
    setSamples(samplesPayload.samples);
    setProfiles(profilesPayload.profiles);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load voice profile data"));
  }, []);

  async function uploadSample(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/writing-samples", {
      method: "POST",
      headers: {
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: formData
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to upload writing sample");
      return;
    }

    await load();
  }

  async function createProfile() {
    const response = await fetch("/api/voice-profile", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({
        name,
        sampleIds: selectedSamples
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to create voice profile");
      return;
    }

    await load();
  }

  return (
    <section className="stack">
      <div className="panel">
        <h1>Voice profile</h1>
        <p>Upload 2-10 writing samples and extract style traits you can apply during revisions.</p>
        <label className="file-label">
          Upload writing sample (.txt/.docx/.pdf)
          <input type="file" accept=".txt,.docx,.pdf" onChange={uploadSample} />
        </label>

        <div className="check-list">
          {samples.map((sample) => (
            <label key={sample.id} className="checkbox">
              <input
                type="checkbox"
                checked={selectedSamples.includes(sample.id)}
                onChange={(event) => {
                  setSelectedSamples((current) =>
                    event.target.checked ? [...current, sample.id] : current.filter((id) => id !== sample.id)
                  );
                }}
              />
              {sample.title} ({sample.sourceType})
            </label>
          ))}
        </div>

        <label>
          Profile name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn btn-primary" type="button" onClick={createProfile}>
          Build voice profile
        </button>
      </div>

      <div className="panel">
        <h2>Saved profiles</h2>
        {profiles.length === 0 ? <p>No profiles yet.</p> : null}
        <div className="feature-grid">
          {profiles.map((profile) => (
            <article key={profile.id}>
              <h3>{profile.name}</h3>
              <p>Average sentence length: {profile.avgSentenceLength.toFixed(1)} words</p>
              <p>Preferred transitions: {profile.preferredTransitions.join(", ") || "None detected"}</p>
              <p>Tone markers: {profile.toneMarkers.join(", ") || "None detected"}</p>
              <p>Punctuation habits: {JSON.stringify(profile.punctuationHabits)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
