"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Icons } from "@/components/icons";

interface Doc {
  id: string; titre: string; categorie: string; statut: string;
  contenu: string | null; fichierUrl: string | null;
  projet: { id: string; titre: string };
  assigneA: { name: string } | null;
}

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", REDACTION: "Rédaction", RELECTURE: "Relecture",
  VALIDATION: "Validation", FINALISATION: "Finalisation", VALIDE: "Validé",
};

const statutPillClass: Record<string, string> = {
  BROUILLON: "pill-brouillon", REDACTION: "pill-redaction", RELECTURE: "pill-relecture",
  VALIDATION: "pill-validation", FINALISATION: "pill-finalisation", VALIDE: "pill-valide",
};

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget",
  BUDGET_DETAIL: "Budget détaillé", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Gantt", CV: "CV", DOCUMENT_LEGAL: "Docs légaux", AUTRE: "Autre",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "var(--text-3)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

export default function DocumentPage() {
  const params = useParams();
  const projetId = params.id as string;
  const docId = params.docId as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [statutOpen, setStatutOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => { setDoc(d.document); setLoading(false); });
  }, [docId]);

  async function changeStatut(statut: string) {
    setStatutOpen(false);
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  async function createGoogleDoc() {
    setCreating(true); setError("");
    const res = await fetch(`/api/documents/${docId}/create-google-doc`, { method: "POST" });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(res.status === 403 ? "google-connect" : data.error ?? "Erreur"); return; }
    setDoc(prev => prev ? { ...prev, fichierUrl: data.url, statut: "REDACTION" } : null);
  }

  async function saveContentToApp() {
    setSaving(true); setSaveMsg("");
    const res = await fetch(`/api/documents/${docId}/save-content`, { method: "POST" });
    const data = await res.json();
    setSaving(false);
    setSaveMsg(res.ok ? "Copie sauvegardée !" : (data.error ?? "Erreur"));
    if (res.ok) setDoc(prev => prev ? { ...prev, contenu: data.contenu } : null);
  }

  async function unlinkDoc() {
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fichierUrl: null }) });
    setDoc(prev => prev ? { ...prev, fichierUrl: null } : null);
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!doc) return <p style={{ color: "var(--danger)", padding: 32 }}>Document introuvable.</p>;

  const hasGoogleDoc = doc.fichierUrl?.includes("docs.google.com");
  const hasContenu = !!doc.contenu;
  const initials = doc.assigneA?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div style={{ maxWidth: "100%", padding: "20px 32px 48px" }}>

      {/* ─── Breadcrumbs + Action bar ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        {/* Left: breadcrumbs */}
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--text-3)" }}>
          <Link href="/projets" style={{ color: "var(--text-3)", cursor: "pointer" }}>Projets</Link>
          <span>/</span>
          <Link href={`/projets/${projetId}`} style={{ color: "var(--text-3)", cursor: "pointer" }}>{doc.projet.titre}</Link>
          <span>/</span>
          <span style={{ color: "var(--text)" }}>{doc.titre}</span>
        </div>

        {/* Right: action buttons */}
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-4)", display: "flex", alignItems: "center", gap: 4 }}>
            <Icons.Check size={12} /> Sauvegardé · il y a 2s
          </span>
          <button className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
            <Icons.Comment size={14} /> 3
          </button>
          <button className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
            <Icons.Eye size={14} /> Aperçu
          </button>
          <button className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
            <Icons.Download size={14} /> Export
          </button>
          <button className="btn btn-primary btn-sm" style={{ gap: 4 }}>
            <Icons.Check size={14} /> Marquer prêt
          </button>
        </div>
      </div>

      {/* ─── Document header ─── */}
      <div style={{ marginBottom: 24 }}>
        {/* Category label */}
        <span style={{ ...labelStyle, marginBottom: 8 }}>
          {categorieLabels[doc.categorie] ?? doc.categorie}
        </span>

        {/* Status pill + assigned user */}
        <div className="row" style={{ gap: 10, marginBottom: 12, marginTop: 8 }}>
          {/* Status pill with dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className={`pill ${statutPillClass[doc.statut] ?? ""}`}
              onClick={() => setStatutOpen(!statutOpen)}
              style={{ cursor: "pointer", border: "none", background: undefined }}
            >
              {statutLabels[doc.statut]}
              <Icons.ArrowDown size={10} style={{ marginLeft: 4 }} />
            </button>
            {statutOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                padding: "4px 0", minWidth: 160,
              }}>
                {Object.entries(statutLabels).map(([key, label]) => (
                  <button key={key} onClick={() => changeStatut(key)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 14px", border: "none",
                    background: doc.statut === key ? "var(--surface-2)" : "transparent",
                    cursor: "pointer", fontSize: 13, color: "var(--text)",
                    fontWeight: doc.statut === key ? 600 : 400,
                  }}>
                    <span className={`pill ${statutPillClass[key] ?? ""}`} style={{ fontSize: 11 }}>{label}</span>
                    {doc.statut === key && <Icons.Check size={14} style={{ marginLeft: "auto", color: "var(--primary)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned user */}
          {doc.assigneA && (
            <div className="row" style={{ gap: 6 }}>
              <div className="avatar" style={{ width: 22, height: 22, fontSize: 9, background: "var(--primary)" }}>
                {initials}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{doc.assigneA.name}</span>
            </div>
          )}
        </div>

        {/* Large editable title */}
        <h1 style={{
          fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
          color: "var(--text)", lineHeight: 1.25, margin: 0,
        }}>
          {doc.titre}
        </h1>
      </div>

      {/* ─── Two-column layout ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24, alignItems: "flex-start" }}>

        {/* ─── Left: Main content ─── */}
        <div style={{ minWidth: 0 }}>

          {/* Google Doc linked: show toolbar + iframe */}
          {hasGoogleDoc && (
            <div>
              {/* Toolbar */}
              <div className="card" style={{ padding: "10px 14px", marginBottom: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <a href={doc.fichierUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ gap: 4 }}>
                    <Icons.Doc size={14} /> Ouvrir dans Google Docs
                  </a>
                  <button onClick={saveContentToApp} disabled={saving} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
                    <Icons.Download size={14} /> {saving ? "Sauvegarde..." : "Sauvegarder dans l'app"}
                  </button>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--text-4)" }}>
                    {saveMsg || "Cliquez « Sauvegarder » pour garder une copie locale"}
                  </span>
                  <button onClick={unlinkDoc} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", gap: 4 }}>
                    <Icons.X size={12} /> Délier
                  </button>
                </div>
              </div>

              {/* Iframe */}
              <div className="card" style={{ overflow: "hidden", padding: 0 }}>
                <iframe
                  src={doc.fichierUrl!.replace("/edit", "/edit?embedded=true")}
                  style={{ width: "100%", height: "75vh", minHeight: 600, border: "none", display: "block" }}
                  title={doc.titre}
                />
              </div>
            </div>
          )}

          {/* Local content (no Google Doc, but has contenu) */}
          {!hasGoogleDoc && hasContenu && (
            <div className="card" style={{ padding: "28px 32px" }}>
              <div style={{
                fontSize: 14, lineHeight: 1.7, color: "var(--text)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {doc.contenu}
              </div>
            </div>
          )}

          {/* Nothing: creation options */}
          {!hasGoogleDoc && !hasContenu && (
            <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: "var(--primary-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Icons.Doc size={28} style={{ color: "var(--primary)" }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                Créer le document
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
                Un Google Doc sera créé automatiquement dans votre Google Drive, ou commencez à rédiger directement.
              </p>

              {error === "google-connect" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--warning)" }}>
                    Connectez votre compte Google pour créer des documents.
                  </p>
                  <button
                    onClick={() => signIn("google", { callbackUrl: window.location.href })}
                    className="btn btn-secondary"
                    style={{ gap: 8 }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connecter Google Drive
                  </button>
                </div>
              ) : error ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
                  <button onClick={createGoogleDoc} className="btn btn-primary">
                    Réessayer
                  </button>
                </div>
              ) : (
                <button onClick={createGoogleDoc} disabled={creating} className="btn btn-primary" style={{ gap: 6 }}>
                  <Icons.Doc size={16} />
                  {creating ? "Création en cours..." : "Créer le Google Doc"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Right sidebar ─── */}
        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Plan / Outline section */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Plan</div>
            {hasContenu || hasGoogleDoc ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <SidebarLink label="Introduction" level={0} />
                <SidebarLink label="Contexte" level={0} />
                <SidebarLink label="Objectifs" level={0} />
                <SidebarLink label="Résultats attendus" level={1} />
                <SidebarLink label="Méthodologie" level={0} />
                <SidebarLink label="Budget" level={0} />
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-4)", margin: 0 }}>
                Le plan apparaitra une fois le document créé.
              </p>
            )}
          </div>

          {/* Commentaires section */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <span style={labelStyle}>Commentaires</span>
              <span className="tag" style={{ marginLeft: "auto", fontSize: 10.5 }}>3</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CommentCard
                initials="AK"
                name="Adoum K."
                time="il y a 2h"
                text="Revoir la section budget avec les derniers chiffres du bailleur."
              />
              <CommentCard
                initials="MN"
                name="Marie N."
                time="il y a 5h"
                text="Le cadre logique doit être aligné avec les objectifs."
              />
              <CommentCard
                initials="SD"
                name="Sarah D."
                time="hier"
                text="Ajouter les indicateurs de suivi."
              />
            </div>
          </div>

          {/* Document info */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Informations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <InfoRow label="Catégorie" value={categorieLabels[doc.categorie] ?? doc.categorie} />
              <InfoRow label="Statut" value={statutLabels[doc.statut]} />
              <InfoRow label="Assigné à" value={doc.assigneA?.name ?? "Non assigné"} />
              {hasGoogleDoc && <InfoRow label="Source" value="Google Docs" />}
            </div>
          </div>
        </div>
      </div>

      {/* Click-away to close status dropdown */}
      {statutOpen && (
        <div
          onClick={() => setStatutOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}
    </div>
  );
}

/* ─── Sidebar outline link ─── */
function SidebarLink({ label, level }: { label: string; level: number }) {
  return (
    <a
      href="#"
      style={{
        display: "block",
        fontSize: 12.5,
        color: "var(--text-2)",
        padding: "4px 0",
        paddingLeft: level * 14,
        textDecoration: "none",
        borderRadius: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "var(--primary)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)"; }}
    >
      {label}
    </a>
  );
}

/* ─── Comment card ─── */
function CommentCard({ initials, name, time, text }: { initials: string; name: string; time: string; text: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 8 }}>
      <div className="row" style={{ gap: 6, marginBottom: 6 }}>
        <div className="avatar" style={{ width: 20, height: 20, fontSize: 8, background: "var(--primary)" }}>
          {initials}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{name}</span>
        <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: "auto" }}>{time}</span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

/* ─── Info row ─── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{value}</span>
    </div>
  );
}
