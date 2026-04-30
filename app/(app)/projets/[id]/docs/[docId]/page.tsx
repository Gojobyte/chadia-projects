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

// Convertir markdown en HTML (pour les anciens contenus)
function markdownToHtml(md: string): string {
  return md
    .split("\n\n")
    .map(block => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("# ")) return `<h2>${inlineFmt(block.slice(2))}</h2>`;
      if (block.startsWith("## ")) return `<h3>${inlineFmt(block.slice(3))}</h3>`;
      if (/^\d+\.\s/.test(block)) {
        const items = block.split("\n").map(l => `<li>${inlineFmt(l.replace(/^\d+\.\s*/, ""))}</li>`).join("");
        return `<ol>${items}</ol>`;
      }
      if (block.startsWith("- ")) {
        const items = block.split("\n").map(l => `<li>${inlineFmt(l.replace(/^-\s*/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineFmt(block)}</p>`;
    })
    .join("\n");
}
function inlineFmt(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/==(.+?)==/g, "<mark>$1</mark>");
}

const TEMPLATE_CONTENT = `<h2>1. Contexte et justification</h2>
<p>La région du Sahel — englobant le Mali, le Burkina Faso et le Niger — fait face à une crise climatique aiguë : hausse des températures de 1,5 °C depuis 1970, raréfaction des ressources en eau, et insécurité alimentaire chronique touchant <mark>plus de 18 millions de personnes</mark>.</p>
<p>Ce projet propose une approche intégrée de renforcement des capacités d'adaptation des communautés rurales sur 24 mois, articulée autour de trois piliers : agriculture résiliente, gestion participative de l'eau, et systèmes d'alerte précoce.</p>
<h2>2. Objectifs spécifiques</h2>
<ol>
<li>Diffuser des pratiques agroécologiques auprès de <strong>15 000 producteurs</strong></li>
<li>Réhabiliter <strong>120 points d'eau</strong> et 8 ouvrages de retenue</li>
<li>Former <strong>240 relais communautaires</strong> aux systèmes d'alerte précoce</li>
<li>Mettre en place un <strong>fonds résilience</strong> géré par les coopératives locales</li>
</ol>
<h2>3. Cadre logique synthétique</h2>
<p>Complétez le cadre logique ici...</p>
<h2>4. Méthodologie d'intervention</h2>
<p></p>
<h2>5. Plan de travail</h2>
<p></p>
<h2>6. Budget</h2>
<p></p>
<h2>7. Équipe &amp; expertise</h2>
<p></p>`;

export default function DocumentPage() {
  const params = useParams();
  const projetId = params.id as string;
  const docId = params.docId as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [statutOpen, setStatutOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => {
        const document = d.document;
        // Convertir markdown en HTML si le contenu n'est pas deja du HTML
        if (document?.contenu && !document.contenu.trim().startsWith("<")) {
          document.contenu = markdownToHtml(document.contenu);
        }
        setDoc(document);
        setLoading(false);
      });
  }, [docId]);

  // Injecter le contenu dans le contentEditable apres le chargement
  const contentLoaded = useRef(false);
  useEffect(() => {
    if (doc?.contenu && editorRef.current && !contentLoaded.current) {
      editorRef.current.innerHTML = doc.contenu;
      contentLoaded.current = true;
    }
  }, [doc]);

  const saveContent = useCallback(async (html: string) => {
    setSaving(true);
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: html }),
    });
    setSaving(false);
    setLastSaved(new Date());
  }, [docId]);

  // Auto-save quand l'utilisateur tape
  function handleInput() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const html = editorRef.current?.innerHTML ?? "";
      saveContent(html);
      // Mettre a jour doc.contenu pour le plan et l'apercu
      setDoc(prev => prev ? { ...prev, contenu: html } : null);
    }, 2000);
  }

  // Commandes clavier pour formater
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); }
      if (e.key === "u") { e.preventDefault(); document.execCommand("underline"); }
    }
  }

  async function changeStatut(statut: string) {
    setStatutOpen(false);
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  function startWithTemplate() {
    if (editorRef.current) {
      editorRef.current.innerHTML = TEMPLATE_CONTENT;
      editorRef.current.focus();
      saveContent(TEMPLATE_CONTENT);
      setDoc(prev => prev ? { ...prev, contenu: TEMPLATE_CONTENT } : null);
    }
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!doc) return <p style={{ color: "var(--danger)", padding: 32 }}>Document introuvable.</p>;

  const initials = doc.assigneA?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const saveLabel = saving ? "Sauvegarde..." : lastSaved ? `Sauvegardé · il y a ${Math.max(1, Math.round((Date.now() - lastSaved.getTime()) / 1000))}s` : "Sauvegardé";
  const hasContent = (doc.contenu ?? "").trim().length > 0;

  // Extraire les titres pour le plan
  const headings: { level: number; text: string }[] = [];
  const htmlContent = doc.contenu ?? "";
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = headingRegex.exec(htmlContent)) !== null) {
    headings.push({ level: parseInt(match[1]) - 2, text: match[2].replace(/<[^>]+>/g, "") });
  }

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
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(true)}><Icons.Eye size={14} /> Aperçu</button>
          <a href={`/api/documents/${docId}/export`} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}><Icons.Download size={14} /> Export .docx</a>
          <button className="btn btn-primary btn-sm" onClick={() => changeStatut("VALIDE")}><Icons.Check size={14} /> Marquer prêt</button>
        </div>
      </div>

      {/* Doc title */}
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
        {/* ─── Left: Éditeur contentEditable ─── */}
        <div>
          {hasContent ? (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              style={{
                outline: "none", minHeight: 500, fontSize: 15, lineHeight: 1.7, color: "var(--text-2)",
                cursor: "text",
              }}
            />
          ) : (
            /* État vide — page de démarrage */
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
              <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 400, margin: "0 auto 24px" }}>
                Rédigez directement comme dans Notion — ou laissez l&apos;IA générer un brouillon.
              </p>
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={startWithTemplate}>
                  <Icons.Edit size={14} /> Commencer à écrire
                </button>
                <button className="btn btn-secondary">
                  <Icons.Sparkles size={14} /> Générer avec l&apos;IA
                </button>
              </div>
            </div>
          )}

          {/* AI suggestion block — affiché sous le contenu */}
          {hasContent && (
            <div style={{ border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)", borderRadius: 8, padding: 14, background: "color-mix(in oklch, var(--primary) 4%, transparent)", marginTop: 24 }}>
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <Icons.Sparkles size={14} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Suggestion IA</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                L&apos;appel d&apos;offre demande une section &quot;Théorie du changement&quot;. Voulez-vous que je génère un brouillon basé sur les objectifs ci-dessus ?
              </p>
              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                <button className="btn btn-primary btn-sm">Générer le brouillon</button>
                <button className="btn btn-ghost btn-sm">Ignorer</button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right sidebar ─── */}
        <aside style={{ position: "sticky", top: 64, height: "fit-content" }}>
          {/* Plan */}
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Plan</div>
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 12, marginBottom: 24 }}>
            {headings.length > 0 ? headings.map((s, i) => (
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

      {/* ─── Modal Aperçu Document ─── */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}
          onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "white", borderRadius: 12, width: "100%", maxWidth: 800,
            maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            {/* Preview header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Aperçu du document</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{doc.titre} — {doc.projet.titre}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <a href={`/api/documents/${docId}/export`} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                  <Icons.Download size={14} /> Télécharger .docx
                </a>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                  <Icons.Download size={14} /> Imprimer / PDF
                </button>
                <button className="icon-btn" onClick={() => setShowPreview(false)}>
                  <Icons.X size={16} />
                </button>
              </div>
            </div>

            {/* Preview body — style page A4 */}
            <div style={{ padding: "48px 64px", fontFamily: "Georgia, serif", fontSize: "12pt", lineHeight: 1.8, color: "#1e293b" }}>
              {/* En-tête document */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: "10pt", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  {categorieLabels[doc.categorie] ?? doc.categorie}
                </div>
                <h1 style={{ fontSize: "20pt", fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{doc.titre}</h1>
                <div style={{ fontSize: "10pt", color: "#94a3b8" }}>
                  {doc.projet.titre} — {doc.assigneA?.name ?? "Non assigné"}
                </div>
                <hr style={{ border: "none", borderTop: "2px solid #e2e8f0", margin: "24px 0" }} />
              </div>

              {/* Contenu rendu */}
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{ __html: doc.contenu ?? "<p>Document vide</p>" }}
                style={{ fontSize: "11pt" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
