"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface AuthResponse {
  user: { id: string; email: string; displayName?: string | null };
  csrfToken: string;
}

export function AuthClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const authError = searchParams.get("authError");
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

  async function submit() {
    setError(null);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload = mode === "login" ? { email, password } : { email, password, displayName };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as Partial<AuthResponse> & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Authentication failed");
        return;
      }

      if (data.csrfToken) {
        localStorage.setItem("vp_csrf", data.csrfToken);
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Cannot reach the auth service. Make sure the app server and database are running.");
    }
  }

  return (
    <section className="panel narrow">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <p>Use email/password or continue with Google authentication.</p>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {mode === "signup" ? (
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      {authError ? (
        <p className="error-text">
          {authError === "google_not_configured"
            ? "Google login is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            : "Google login failed. Please try again."}
        </p>
      ) : null}
      <button className="btn btn-primary" type="button" onClick={submit}>
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
      {googleEnabled ? (
        <a className="btn btn-secondary google-btn" href="/api/auth/google/start">
          <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
            <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 3.1l6-6C34.4 3.2 29.6 1 24 1 14.6 1 6.5 6.5 2.6 14.4l7 5.4C11.4 13.3 17.1 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.4-.5-5H24v9.5h12.7c-.5 3-2.2 5.6-4.7 7.3l7.2 5.6c4.2-3.9 7.3-9.7 7.3-17.4z"/>
            <path fill="#FBBC05" d="M9.6 28.2c-.5-1.3-.8-2.7-.8-4.2s.3-2.9.8-4.2l-7-5.4C1 17.4 0 20.6 0 24s1 6.6 2.6 9.6l7-5.4z"/>
            <path fill="#34A853" d="M24 47c6.5 0 11.9-2.2 15.9-5.9l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.9 0-12.6-3.8-14.7-10.3l-7 5.4C6.5 41.5 14.6 47 24 47z"/>
          </svg>
          Continue with Google
        </a>
      ) : null}
      <button className="btn btn-link" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login") }>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
