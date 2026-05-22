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
        <a className="btn btn-secondary" href="/api/auth/google/start">
          Continue with Google
        </a>
      ) : null}
      <button className="btn btn-link" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login") }>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
