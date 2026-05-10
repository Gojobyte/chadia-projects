"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
    <main className="login">
      <section className="login-form-side">
        <a className="login-brand" href="/">
          <span className="login-mark" aria-hidden="true">C</span>
          <span className="login-name">CHADIA <em>Projects</em></span>
        </a>

        <div className="login-form-wrap">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-eyebrow">Espace de travail</div>
            <h1 className="login-title">Bon retour <em>parmi nous.</em></h1>
            <p className="login-sub">
              Connectez-vous pour reprendre la rédaction, l&apos;évaluation et le suivi
              de vos appels d&apos;offres.
            </p>

            {(error || accessDenied) && (
              <div className="login-error" role="alert">
                <i className="ph ph-warning-circle" aria-hidden="true"></i>
                <span>{error || "Accès refusé."}</span>
              </div>
            )}

            <label className="login-field">
              <span className="login-field-label">Adresse e-mail professionnelle</span>
              <input
                className="input input--lg"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="prenom.nom@organisation.org"
              />
            </label>

            <label className="login-field">
              <span className="login-field-label">
                Mot de passe
                <a href="#" tabIndex={-1}>Mot de passe oublié</a>
              </span>
              <input
                className="input input--lg"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Maintenir la session active sur cet appareil</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className={`btn btn--primary login-submit ${loading ? "btn--loading" : ""}`}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>

            <div className="login-divider">ou</div>

            <button type="button" className="login-oauth" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.6 12.227c0-.709-.064-1.39-.184-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.981-4.305 2.981-7.351z" fill="#4285f4"/>
                <path d="M12 22c2.7 0 4.964-.895 6.619-2.422l-3.232-2.51c-.895.6-2.04.954-3.387.954-2.605 0-4.81-1.76-5.596-4.123H3.073v2.59A9.997 9.997 0 0 0 12 22z" fill="#34a853"/>
                <path d="M6.404 13.9a6.005 6.005 0 0 1 0-3.799V7.51H3.073a9.997 9.997 0 0 0 0 8.98l3.331-2.59z" fill="#fbbc05"/>
                <path d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.866-2.866C16.96 3.014 14.696 2 12 2A9.997 9.997 0 0 0 3.073 7.51l3.331 2.59C7.19 7.737 9.395 5.977 12 5.977z" fill="#ea4335"/>
              </svg>
              Continuer avec Google
              <span className="soon">Bientôt</span>
            </button>

            <div className="login-foot-link">
              <span>
                Pas encore de compte ?{" "}
                <a href="#" style={{ color: "var(--color-terracotta)" }}>
                  Demander un accès
                </a>
              </span>
            </div>
          </form>
        </div>

        <div className="login-bottom">
          <span>© 2026 CHADIA · N&apos;Djamena</span>
          <div className="links">
            <a href="/marches">Registre public</a>
            <a href="#">Aide</a>
            <a href="#">Confidentialité</a>
          </div>
        </div>
      </section>

      <aside className="login-stage" aria-hidden="true">
        <div className="stage-grid"></div>
        <span className="stage-mark">C</span>

        <div className="stage-meta">
          <span><span className="live"></span>Plateforme opérationnelle</span>
          <span>v2.4 · N&apos;Djamena · TCD</span>
        </div>

        <blockquote className="stage-quote">
          <div className="qmark">&ldquo;</div>
          <q>
            La transparence d&apos;un appel d&apos;offres tient à la <em>rigueur</em> de chaque ligne saisie.
          </q>
          <cite>
            Charte CHADIA Projects
            <small>Article 1 — Principe de traçabilité intégrale</small>
          </cite>
        </blockquote>

        <div className="stage-stats">
          <div>
            <div className="v">187</div>
            <div className="l">Appels d&apos;offres</div>
            <div className="h">publiés en 2026</div>
          </div>
          <div>
            <div className="v">42<em>md</em></div>
            <div className="l">FCFA attribués</div>
            <div className="h">sur 12 mois</div>
          </div>
          <div>
            <div className="v">1 248</div>
            <div className="l">Fournisseurs</div>
            <div className="h">référencés au registre</div>
          </div>
        </div>
      </aside>
    </main>
  );
}
