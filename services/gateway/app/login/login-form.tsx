"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push(callbackUrl);
  }

  const accessDenied = searchParams.get("error");

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true">C</span>
          <h1 className="login-title">CHADIA <em>Projects</em></h1>
          <p className="login-sub">Plateforme de gestion des marchés publics</p>
        </div>

        {(error || accessDenied) && (
          <div className="login-error" role="alert">
            <i className="ph ph-warning-circle" aria-hidden="true"></i>
            <span>{error || "Accès refusé."}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="email" className="field-label">
              Email
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="input"
              placeholder="vous@organisation.org"
            />
          </div>

          <div className="field">
            <label htmlFor="password" className="field-label">
              Mot de passe
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn--primary btn--lg login-submit ${loading ? "btn--loading" : ""}`}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="login-foot">
          Plateforme institutionnelle. Accès réservé aux membres autorisés.
        </p>
      </div>
    </div>
  );
}
