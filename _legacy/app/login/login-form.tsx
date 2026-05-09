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
    e.preventDefault(); setError(""); setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Email ou mot de passe incorrect."); return; }
    router.push(callbackUrl);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark" style={{ margin: "0 auto 12px", width: 40, height: 40, fontSize: 14 }}>CP</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>CHADIA Projects</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Plateforme de montage de projets</p>
        </div>

        {error && <div style={{ padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "var(--radius)", fontSize: 13, marginBottom: 16 }} role="alert">{error}</div>}
        {searchParams.get("error") && <div style={{ padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "var(--radius)", fontSize: 13, marginBottom: 16 }} role="alert">Acces refuse.</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", fontSize: 13 }} placeholder="votre@email.com" />
          </div>
          <div>
            <label htmlFor="password" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>Mot de passe</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", fontSize: 13 }} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: 4 }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
