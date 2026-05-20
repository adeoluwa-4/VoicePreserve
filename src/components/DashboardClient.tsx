"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  title: string;
  description?: string | null;
  updatedAt: string;
};

export function DashboardClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [initialText, setInitialText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    const meRes = await fetch("/api/auth/me");
    if (meRes.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const meData = (await meRes.json()) as { csrfToken?: string };
    if (meData.csrfToken) {
      localStorage.setItem("vp_csrf", meData.csrfToken);
    }

    const response = await fetch("/api/projects");
    const data = (await response.json()) as { projects: Project[] };
    setProjects(data.projects);
  }

  useEffect(() => {
    loadProjects().catch(() => setError("Unable to load projects"));
  }, []);

  async function createProject() {
    setError(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({ title, description, initialText })
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Project creation failed");
      return;
    }

    setTitle("");
    setDescription("");
    setInitialText("");
    await loadProjects();
  }

  return (
    <section className="stack">
      <div className="panel">
        <h1>Recent projects</h1>
        <p>Start a project, upload a source document, generate rewrite options, and review semantic warnings.</p>
        <div className="project-list">
          {projects.map((project) => (
            <a key={project.id} className="project-card" href={`/projects/${project.id}`}>
              <h2>{project.title}</h2>
              <p>{project.description || "No description"}</p>
              <time dateTime={project.updatedAt}>Updated {new Date(project.updatedAt).toLocaleString()}</time>
            </a>
          ))}
          {projects.length === 0 ? <p>No projects yet.</p> : null}
        </div>
      </div>

      <div className="panel">
        <h2>Create project</h2>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Description
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Optional starting text
          <textarea rows={6} value={initialText} onChange={(event) => setInitialText(event.target.value)} />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn btn-primary" type="button" onClick={createProject}>
          Create project
        </button>
      </div>
    </section>
  );
}
