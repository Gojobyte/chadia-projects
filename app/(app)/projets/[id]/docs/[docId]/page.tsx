"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const avatarColors = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)",
];

// Rendu markdown simplifie → HTML
function renderMarkdown(md: string): string {
  return md
    .split("\n\n")
    .map(block => {
      block = block.trim();
      if (!block) return "";
      // H1
      if (block.startsWith("# ")) return `<h2 style="font-size:22px;font-weight:600;color:var(--text);letter-spacing:-0.015em;margin:24px 0 12px">${block.slice(2)}</h2>`;
      // H2
      if (block.startsWith("## ")) return `<h3 style="font-size:18px;font-weight:600;color:var(--text);margin:20px 0 10px">${block.slice(3)}</h3>`;
      // Ordered list
      if (/^\d+\.\s/.test(block)) {
        const items = block.split("\n").map(l => `<li style="margin-bottom:6px;color:var(--text-2)">${formatInline(l.replace(/^\d+\.\s*/, ""))}</li>`).join("");
        return `<ol style="padding-left:22px;margin-bottom:16px">${items}</ol>`;
      }
      // Unordered list
      if (block.startsWith("- ")) {
        const items = block.split("\n").map(l => `<li style="margin-bottom:6px;color:var(--text-2)">${formatInline(l.replace(/^-\s*/, ""))}</li>`).join("");
        return `<ul style="padding-left:22px;margin-bottom:16px">${items}</ul>`;
      }
      // Paragraph
      return `<p style="margin-bottom:14px;color:var(--text-2)">${formatInline(block)}</p>`;
    })
    .join("");
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/==(.+?)==/g, '<mark style="background:color-mix(in oklch, var(--warning) 18%, transparent);color:var(--text);padding:1px 4px;border-radius:3px">$1</mark>');
}

export default function DocumentPage() {
  const params = useParams();
  const projetId = params.id as string;
  const docId = params.docId as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [contenu, setContenu] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [statutOpen, setStatutOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => {
        setDoc(d.document);
        setContenu(d.document?.contenu ?? "");
        setLoading(false);
      });
  }, [docId]);

  const saveContent = useCallback(async (text: string) => {
    setSaving(true);
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: text }),
    });
    setSaving(false);
    setLastSaved(new Date());
  }, [docId]);

  // Auto-save en mode edition
  useEffect(() => {
    if (!doc || !editing) return;
    const timer = setTimeout(() => {
      if (contenu !== (doc.contenu ?? "")) saveContent(contenu);
    }, 2000);
    return () => clearTimeout(timer);
  }, [contenu, doc, editing, saveContent]);

  async function changeStatut(statut: string) {
    setStatutOpen(false);
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!doc) return <p style={{ color: "var(--danger)", padding: 32 }}>Document introuvable.</p>;

  const initials = doc.assigneA?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const saveLabel = saving ? "Sauvegarde..." : lastSaved ? `Sauvegardé · il y a ${Math.max(1, Math.round((Date.now() - lastSaved.getTime()) / 1000))}s` : "Sauvegardé";

  // Sections pour le plan
  const sections = contenu.split("\n").filter(l => l.startsWith("# ") || l.startsWith("## ")).map(l => ({
    level: l.startsWith("## ") ? 1 : 0,
    text: l.replace(/^#+\s*/, ""),
  }));

  const hasContent = contenu.trim().length > 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 32px 80px" }}>
      {/* Breadcrumbs + actions */}
      <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--text-3)", marginBottom: 16 }}>
        <Link href="/projets" style={{ color: "var(--text-3)" }}>Projets</Link>
        <span>/</span>
        <Link href={`/projets/${projetId}`} style={{ color: "var(--text-3)" }}>{doc.projet.titre}</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{doc.titre}</span>
        <div style={{ marginLeft: "auto" }} className="row">
          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{saveLabel}</span>
          <button className="btn btn-ghost btn-sm"><Icons.Comment size={14} /> {doc.commentaires?.length ?? 0}</button>
          <button className="btn btn-ghost btn-sm"><Icons.Eye size={14} /> Aperçu</button>
          <button className="btn btn-secondary btn-sm"><Icons.Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => changeStatut("VALIDE")}><Icons.Check size={14} /> Marquer prêt</button>
        </div>
      </div>

      {/* Doc title area */}
      <div style={{ marginBottom: 28 }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>
            {categorieLabels[doc.categorie] ?? doc.categorie}
          </span>
          <span style={{ color: "var(--text-4)" }}>·</span>
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
              <span className="avatar avatar-sm" style={{ background: avatarColors[0], width: 18, height: 18, fontSize: 8 }}>{initials}</span>
              {doc.assigneA.name.split(" ")[0]}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.2, margin: 0 }}>
          {doc.titre}
        </h1>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 32 }}>
        {/* ─── Left: Document body ─── */}
        <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-2)" }}>

          {/* Mode rendu (vue normale) */}
          {!editing && hasContent && (
            <>
              <div
                onClick={() => setEditing(true)}
                style={{ cursor: "text", minHeight: 400 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(contenu) }}
              />
              {/* AI suggestion — en bas du contenu */}
              <div style={{ border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)", borderRadius: 8, padding: 14, background: "color-mix(in oklch, var(--primary) 4%, transparent)", marginTop: 20 }}>
                <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                  <Icons.Sparkles size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Suggestion IA</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                  L&apos;appel d&apos;offre demande une section &quot;Théorie du changement&quot; avec diagramme. Voulez-vous que je génère un brouillon ?
                </p>
                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm">Générer le brouillon</button>
                  <button className="btn btn-ghost btn-sm">Ignorer</button>
                </div>
              </div>
            </>
          )}

          {/* Mode édition */}
          {editing && (
            <>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); saveContent(contenu); }}>
                  <Icons.Eye size={14} /> Aperçu
                </button>
              </div>
              <textarea
                ref={editorRef as unknown as React.RefObject<HTMLTextAreaElement>}
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                autoFocus
                style={{
                  width: "100%", minHeight: 600, padding: "24px 28px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", fontSize: 15, lineHeight: 1.7,
                  color: "var(--text)", fontFamily: "inherit", resize: "vertical",
                  outline: "none",
                }}
              />
            </>
          )}

          {/* Vide — page de démarrage */}
          {!editing && !hasContent && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: "var(--primary-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Icons.Doc size={28} style={{ color: "var(--primary)" }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                Commencer la rédaction
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
                Rédigez directement ou laissez l&apos;IA générer un brouillon basé sur l&apos;appel d&apos;offre.
              </p>
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => {
                  setContenu("# 1. Contexte et justification\n\nLa région du Sahel fait face à une crise climatique aiguë...\n\n# 2. Objectifs spécifiques\n\n1. Diffuser des pratiques agroécologiques\n2. Réhabiliter les points d'eau\n3. Former des relais communautaires\n\n# 3. Cadre logique synthétique\n\n# 4. Méthodologie d'intervention\n\n# 5. Plan de travail\n\n# 6. Budget\n\n# 7. Équipe & expertise");
                  setEditing(true);
                }}>
                  <Icons.Edit size={14} /> Commencer à écrire
                </button>
                <button className="btn btn-secondary">
                  <Icons.Sparkles size={14} /> Générer avec l&apos;IA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right sidebar ─── */}
        <aside style={{ position: "sticky", top: 64, height: "fit-content" }}>
          {/* Plan */}
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
              ["1. Contexte et justification", "2. Objectifs spécifiques", "3. Cadre logique", "4. Méthodologie", "5. Plan de travail", "6. Budget", "7. Équipe & expertise"].map((s, i) => (
                <div key={i} style={{ fontSize: 12.5, padding: "5px 0", color: "var(--text-4)", fontWeight: 400 }}>{s}</div>
              ))
            )}
          </div>

          {/* Commentaires */}
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Commentaires · {doc.commentaires?.length ?? 0}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {(doc.commentaires ?? []).length > 0 ? (
              doc.commentaires!.map((c, ci) => {
                const cInit = c.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className="card" style={{ padding: 10 }}>
                    <div className="row" style={{ gap: 6, marginBottom: 5 }}>
                      <span className="avatar avatar-sm" style={{ background: avatarColors[ci % avatarColors.length], width: 18, height: 18, fontSize: 8 }}>{cInit}</span>
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
        </aside>
      </div>
    </div>
  );
}
