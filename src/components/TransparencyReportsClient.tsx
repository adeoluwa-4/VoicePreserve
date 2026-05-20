"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  title: string;
  transparencyReports: Array<{
    id: string;
    createdAt: string;
    editCount: number;
    usedWritingSamples: boolean;
    reportJson: {
      heavilyChangedSections?: Array<{ sentenceIndex: number; semanticScore: number }>;
      checkpoints?: Array<{ label: string; at: string }>;
    };
  }>;
};

export function TransparencyReportsClient() {
  const [projects, setProjects] = useState<Project[]>([]);

  async function requestReportExport(projectId: string, reportId: string) {
    await fetch(`/api/projects/${projectId}/export`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": localStorage.getItem("vp_csrf") ?? ""
      },
      body: JSON.stringify({
        exportType: "TRANSPARENCY_REPORT",
        reportId
      })
    });
  }

  useEffect(() => {
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

      const projectsRes = await fetch("/api/projects");
      const projectsPayload = (await projectsRes.json()) as { projects: Array<{ id: string; title: string }> };

      const detailPromises = projectsPayload.projects.map(async (project) => {
        const response = await fetch(`/api/projects/${project.id}`);
        const payload = (await response.json()) as {
          project: {
            id: string;
            title: string;
            transparencyReports: Project["transparencyReports"];
          };
        };
        return payload.project;
      });

      setProjects(await Promise.all(detailPromises));
    }

    load();
  }, []);

  return (
    <section className="stack">
      <div className="panel">
        <h1>Transparency reports</h1>
        <p>Review editing steps, timestamp checkpoints, heavily changed sections, and sample usage indicators.</p>
      </div>
      {projects.map((project) => (
        <article key={project.id} className="panel">
          <h2>{project.title}</h2>
          {project.transparencyReports.length === 0 ? <p>No reports yet.</p> : null}
          {project.transparencyReports.map((report) => (
            <div key={report.id} className="report-card">
              <p>
                Report {report.id.slice(0, 8)} created {new Date(report.createdAt).toLocaleString()}
              </p>
              <p>Edit count: {report.editCount}</p>
              <p>Writing samples used: {report.usedWritingSamples ? "Yes" : "No"}</p>
              <p>
                Heavily changed sections: {(report.reportJson.heavilyChangedSections ?? []).length}
              </p>
              <p>
                Checkpoints: {(report.reportJson.checkpoints ?? [])
                  .map((checkpoint) => `${checkpoint.label} (${new Date(checkpoint.at).toLocaleString()})`)
                  .join(" -> ")}
              </p>
              <button className="btn btn-small" type="button" onClick={() => requestReportExport(project.id, report.id)}>
                Export PDF
              </button>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
