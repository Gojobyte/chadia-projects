"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface Doc {
  id: string; titre: string; categorie: string; statut: string;
  contenu: string | null; fichierUrl: string | null;
  projet: { id: string; titre: string };
  assigneA: { name: string } | null;
  commentaires?: { id: string; contenu: string; createdAt: string; user: { name: string } }[];
}

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", REDACTION: "Rédaction", RELECTURE: "Relecture",
  VALIDATION: "Validation", FINALISATION: "Finalisation", VALIDE: "Validé",
};
const statutKeys: Record<string, string> = {
  BROUILLON: "brouillon", REDACTION: "redaction", RELECTURE: "relecture",
  VALIDATION: "validation", FINALISATION: "finalisation", VALIDE: "accepte",
};
const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget prévisionnel",
  BUDGET_DETAIL: "Détail budgétaire", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV équipe", DOCUMENT_LEGAL: "Documents légaux", AUTRE: "Autre",
};

export default function DocumentPage() {
  const params = useParams();
  const projetId = params.id as string;
  const docId = params.docId as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [contenu, setContenu] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [statutOpen, setStatutOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => {
        setDoc(d.document);
        setContenu(d.document?.contenu ?? "");
        setLoading(false);
      });
  }, [docId]);

  // Auto-save toutes les 3 secondes apres modification
  const saveContent = useCallback(async (text: string) => {
    setSaving(true);
    await fetch(`/api/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: text }),
    });
    setSaving(false);
    setLastSaved(new Date());
  }, [docId]);

  // Debounce save
  useEffect(() => {
    if (!doc) return;
    const timer = setTimeout(() => {
      if (contenu !== (doc.contenu ?? "")) {
        saveContent(contenu);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [contenu, doc, saveContent]);

  async function changeStatut(statut: string) {
    setStatutOpen(false);
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  async function markReady() {
    await changeStatut("VALIDE");
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!doc) return <p style={{ color: "var(--danger)", padding: 32 }}>Document introuvable.</p>;

  const initials = doc.assigneA?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const saveLabel = saving ? "Sauvegarde..." : lastSaved ? `Sauvegardé · il y a ${Math.max(1, Math.round((Date.now() - lastSaved.getTime()) / 1000))}s` : "Sauvegardé";

  // Extraire les sections du contenu pour le plan
  const sections = contenu.split("\n").filter(l => l.startsWith("# ") || l.startsWith("## ")).map(l => ({
    level: l.startsWith("## ") ? 1 : 0,
    text: l.replace(/^#+\s*/, ""),
  }));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 32px 80px" }}>
      {/* Breadcrumbs + actions */}
      <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--text-3)", marginBottom: 16 }}>
        <Link href="/projets" style={{ color: "var(--text-3)", cursor: "pointer" }}>Projets</Link>
        <span>/</span>
        <Link href={`/projets/${projetId}`} style={{ color: "var(--text-3)", cursor: "pointer" }}>{doc.projet.titre}</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{doc.titre}</span>
        <div style={{ marginLeft: "auto" }} className="row">
          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{saveLabel}</span>
          <button className="btn btn-ghost btn-sm"><Icons.Comment size={14} /> {doc.commentaires?.length ?? 0}</button>
          <button className="btn btn-ghost btn-sm"><Icons.Eye size={14} /> Aperçu</button>
          <button className="btn btn-secondary btn-sm"><Icons.Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={markReady}><Icons.Check size={14} /> Marquer prêt</button>
        </div>
      </div>

      {/* Doc title area */}
      <div style={{ marginBottom: 28 }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>
            {categorieLabels[doc.categorie] ?? doc.categorie}
          </span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          {/* Status pill with dropdown */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setStatutOpen(!statutOpen)}
              className={`pill pill-${statutKeys[doc.statut] ?? "brouillon"}`}
              style={{ cursor: "pointer" }}>
              <span className="dot" />
              {statutLabels[doc.statut] ?? doc.statut}
            </button>
            {statutOpen && (
              <>
                <div onClick={() => setStatutOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", padding: "4px 0", minWidth: 160 }}>
                  {Object.entries(statutLabels).map(([key, label]) => (
                    <button key={key} onClick={() => changeStatut(key)} style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px",
                      border: "none", background: doc.statut === key ? "var(--surface-2)" : "transparent",
                      cursor: "pointer", fontSize: 13, color: "var(--text)",
                    }}>
                      {label}
                      {doc.statut === key && <Icons.Check size={14} style={{ marginLeft: "auto", color: "var(--primary)" }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {doc.assigneA && (
            <span className="row" style={{ marginLeft: 8, gap: 5, fontSize: 12, color: "var(--text-3)" }}>
              <span className="avatar avatar-sm" style={{ background: "var(--primary)", width: 18, height: 18, fontSize: 8 }}>{initials}</span>
              {doc.assigneA.name.split(" ")[0]}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.2, margin: 0 }}>
          {doc.titre}
        </h1>
      </div>

      {/* Two-column layout: editor + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 32 }}>
        {/* ─── Left: Editor ─── */}
        <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-2)" }}>
          {/* AI suggestion block */}
          <div style={{ border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)", borderRadius: 8, padding: 14, background: "color-mix(in oklch, var(--primary) 4%, transparent)", marginBottom: 20 }}>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              <Icons.Sparkles size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Suggestion IA</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8, margin: 0 }}>
              L&apos;IA peut générer un brouillon pour ce document basé sur les informations du projet. Voulez-vous générer le contenu ?
            </p>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm">Générer le brouillon</button>
              <button className="btn btn-ghost btn-sm">Ignorer</button>
            </div>
          </div>

          {/* Textarea editor */}
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder={"# 1. Contexte et justification\n\nDécrivez le contexte du projet...\n\n# 2. Objectifs spécifiques\n\n- Objectif 1\n- Objectif 2\n\n# 3. Méthodologie\n\nDécrivez l'approche...\n\n# 4. Plan de travail\n\n# 5. Budget\n\n# 6. Équipe & expertise\n\nTapez '/' pour des suggestions..."}
            style={{
              width: "100%", minHeight: 600, padding: "24px 28px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", fontSize: 15, lineHeight: 1.7,
              color: "var(--text)", fontFamily: "inherit", resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* ─── Right sidebar ─── */}
        <aside style={{ position: "sticky", top: 64, height: "fit-content" }}>
          {/* Plan / Outline */}
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Plan</div>
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 12, marginBottom: 24 }}>
            {sections.length > 0 ? sections.map((s, i) => (
              <div key={i} style={{
                fontSize: 12.5, padding: "5px 0", paddingLeft: s.level * 12,
                color: i === 0 ? "var(--primary)" : "var(--text-3)",
                fontWeight: i === 0 ? 600 : 400, cursor: "pointer",
              }}>
                {s.text}
              </div>
            )) : (
              <>
                {["1. Contexte et justification", "2. Objectifs spécifiques", "3. Cadre logique", "4. Méthodologie", "5. Plan de travail", "6. Budget", "7. Équipe & expertise"].map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, padding: "5px 0", color: "var(--text-4)", fontWeight: 400 }}>{s}</div>
                ))}
              </>
            )}
          </div>

          {/* Commentaires */}
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Commentaires · {doc.commentaires?.length ?? 0}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {(doc.commentaires ?? []).length > 0 ? (
              doc.commentaires!.map(c => {
                const cInit = c.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className="card" style={{ padding: 10 }}>
                    <div className="row" style={{ gap: 6, marginBottom: 5 }}>
                      <span className="avatar avatar-sm" style={{ background: "var(--primary)", width: 18, height: 18, fontSize: 8 }}>{cInit}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.user.name.split(" ")[0]}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-4)" }}>
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.45, margin: 0 }}>{c.contenu}</p>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>Aucun commentaire</p>
            )}
          </div>

          {/* Infos */}
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Informations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <InfoRow label="Catégorie" value={categorieLabels[doc.categorie] ?? doc.categorie} />
            <InfoRow label="Assigné à" value={doc.assigneA?.name ?? "Non assigné"} />
            <InfoRow label="Projet" value={doc.projet.titre} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
