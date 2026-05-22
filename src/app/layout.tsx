import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "VoicePreserve",
  description:
    "Preserve your meaning, sound more like yourself, and keep an auditable editing trail for responsible AI-supported writing."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <a className="brand" href="/">
              VoicePreserve
            </a>
            <nav className="nav-links" aria-label="Main">
              <a href="/dashboard">Dashboard</a>
              <a href="/preview">Preview</a>
              <a href="/voice-profile">Voice Profile</a>
              <a href="/transparency-report">Transparency Reports</a>
              <a href="/auth">Sign in</a>
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
