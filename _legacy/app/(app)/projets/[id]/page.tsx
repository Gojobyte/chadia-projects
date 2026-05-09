"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { Icons } from "@/components/icons";
import { StrategicChecklist } from "@/components/projets/StrategicChecklist";

function daysUntil(d: string | Date): number { return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); }

interface Document {
  id: string; categorie: string; titre: string; statut: string;
  fichierUrl: string | null; progression: number;
  dateLimite: string | null; sectionId: string | null;
  assigneA: { id: string; name: string } | null;
}
interface Tache { id: string; titre: string; description: string | null; statut: string; priorite: string; dateLimite: string | null; assigneA: { id: string; name: string } | null; }
interface Membre { id: string; role: string; user: { id: string; name: string; email: string }; }
interface Activite { id: string; action: string; description: string; createdAt: string; user: { name: string }; }
interface Projet {
  id: string; titre: string; reference: string | null; description: string; statut: string;
  budget: number | null; devise: string; dateLimite: string; appelOffreUrl: string | null;
  pays: string | null; starred: boolean;
  bailleur: { nom: string; sigle: string };
  documents: Document[]; taches: Tache[]; membres: Membre[]; activites: Activite[];
  createdBy: { name: string };
}

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget",
  BUDGET_DETAIL: "Budget detaille", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Gantt", CV: "CV", DOCUMENT_LEGAL: "Docs legaux", AUTRE: "Autre",
};

const bailleurColors: Record<string, string> = {
  PNUD: "oklch(0.55 0.18 245)", UE: "oklch(0.55 0.18 270)",
  BADEA: "oklch(0.55 0.15 30)", AFD: "oklch(0.55 0.15 0)",
  USAID: "oklch(0.55 0.15 240)", BM: "oklch(0.5 0.15 200)",
};

function fmtMoney(n: number, cur = "EUR"): string {
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${sym}`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusLabels: Record<string, string> = {
  BROUILLON: "Brouillon", REDACTION: "Redaction", RELECTURE: "Relecture",
  VALIDATION: "Validation", FINALISATION: "Finalisation", VALIDE: "Valide",
  SOUMIS: "Soumis", EN_COURS: "En cours", EN_REVISION: "Revision",
  ACCEPTE: "Accepte", REJETE: "Rejete",
};

const statusColors: Record<string, string> = {
  BROUILLON: "var(--st-brouillon)", REDACTION: "var(--st-redaction)",
  RELECTURE: "var(--st-relecture)", VALIDATION: "var(--st-validation)",
  FINALISATION: "var(--st-finalisation)", VALIDE: "var(--st-soumis)",
  SOUMIS: "var(--st-soumis)", ACCEPTE: "var(--st-accepte)", REJETE: "var(--st-rejete)",
};

const pipelineSteps = ["BROUILLON", "REDACTION", "RELECTURE", "VALIDATION", "FINALISATION", "SOUMIS"];
// Mapper les statuts projet vers les positions du pipeline visuel
const projetStatusToStep: Record<string, number> = {
  BROUILLON: 0, EN_COURS: 1, EN_REVISION: 2, SOUMIS: 5, ACCEPTE: 6, REJETE: -1, ARCHIVE: -1,
};

export default function ProjetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kanban" | "timeline" | "docs" | "equipe" | "activite">("kanban");
  const [showNewDoc, setShowNewDoc] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projets/${id}`);
    if (res.ok) { const data = await res.json(); setProjet(data.projet); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function moveDocument(documentId: string, newStatut: string) {
    await fetch(`/api/projets/${id}/documents`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, statut: newStatut }),
    });
    load();
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32 }}>Chargement...</p>;
  if (!projet) return <p style={{ color: "var(--danger)", padding: 32 }}>Projet introuvable.</p>;

  const totalDocs = projet.documents.length;
  const valides = projet.documents.filter(d => d.statut === "VALIDE").length;
  const progression = totalDocs > 0 ? Math.round((valides / totalDocs) * 100) : 0;
  const tachesDone = projet.taches.filter(t => t.statut === "TERMINE").length;

  // Determiner l'etape pipeline du projet (mapper statut projet -> position visuelle)
  const pipelineIdx = projetStatusToStep[projet.statut] ?? -1;

  return (
    <div style={{ maxWidth: "100%", padding: "20px 32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--text-3)", marginBottom: 8 }}>
          <Link href="/projets" style={{ cursor: "pointer", color: "var(--text-3)" }}>Projets</Link>
          <span>/</span>
          <span style={{ color: "var(--text)" }}>{projet.titre}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start" }}>
          <div>
            <div className="row" style={{ gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 6,
                background: bailleurColors[projet.bailleur.sigle] ?? "oklch(0.55 0.13 200)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
                boxShadow: "inset 0 -6px 12px rgba(0,0,0,0.15)",
              }}>
                {projet.bailleur.sigle}
              </div>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text)" }}>{projet.titre}</h1>
                  <button onClick={async () => {
                    const res = await fetch(`/api/projets/${id}/star`, { method: "POST" });
                    if (res.ok) {
                      const data = await res.json();
                      setProjet(prev => prev ? { ...prev, starred: data.projet.starred } : null);
                      window.dispatchEvent(new Event("star-changed"));
                    }
                  }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <Icons.Star size={16} style={projet.starred ? { color: "var(--warning)", fill: "var(--warning)" } : { color: "var(--text-4)" }} />
                  </button>
                </div>
                <div className="row" style={{ gap: 10, marginTop: 4, fontSize: 12.5, color: "var(--text-3)" }}>
                  <span className="mono">{projet.reference ?? projet.bailleur.sigle}</span>
                  <span>·</span>
                  {projet.pays && <><span>{projet.pays}</span><span>·</span></>}
                  {projet.budget && <><span className="tnum">{fmtMoney(projet.budget, projet.devise)}</span><span>·</span></>}
                  <span>{fmtDate(projet.dateLimite)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setTab("kanban")}>
              <Icons.Sparkles size={14} /> Co-pilote IA
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setTab("equipe")}>
              <Icons.Users size={14} /> Equipe
            </button>
            <button className="btn btn-primary btn-sm">
              Soumettre <Icons.ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Pipeline strip */}
        <div className="card" style={{ marginTop: 16, padding: "14px 18px" }}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pipeline</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--text-2)" }}>
              <span className="tnum" style={{ fontWeight: 600, color: "var(--text)" }}>{progression}%</span> · {valides}/{totalDocs} documents · {tachesDone}/{projet.taches.length} taches
            </span>
          </div>
          <div className="row" style={{ gap: 0 }}>
            {pipelineSteps.map((s, i) => {
              const isCurrent = s === projet.statut;
              const isPast = pipelineIdx >= 0 && i < pipelineIdx;
              return (
                <div key={s} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: isPast ? "var(--primary)" : isCurrent ? "var(--primary)" : "var(--surface-3)",
                    color: isPast || isCurrent ? "white" : "var(--text-3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                    boxShadow: isCurrent ? "0 0 0 4px color-mix(in oklch, var(--primary) 18%, transparent)" : "none",
                  }}>
                    {isPast ? <Icons.Check size={12} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? "var(--text)" : isPast ? "var(--text-2)" : "var(--text-4)", whiteSpace: "nowrap" }}>
                    {statusLabels[s] ?? s}
                  </div>
                  {i < 5 && <div style={{ flex: 1, height: 1, background: isPast ? "var(--primary)" : "var(--border)", minWidth: 8 }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strategic Checklist — keyQuestions du TDR */}
      <StrategicChecklist
        projetId={id}
        sections={(projet.documents ?? [])
          .filter((d: Document) => d.sectionId)
          .map((d: Document) => ({ id: d.sectionId!, title: d.titre }))}
      />

      {/* Tabs */}
      <div className="row" style={{ borderBottom: "1px solid var(--border)", marginBottom: 16, gap: 2 }}>
        {([
          { id: "kanban" as const, label: "Kanban", Ic: Icons.Kanban },
          { id: "timeline" as const, label: "Timeline", Ic: Icons.Timeline },
          { id: "docs" as const, label: "Documents", Ic: Icons.Doc },
          { id: "equipe" as const, label: "Equipe", Ic: Icons.Users },
          { id: "activite" as const, label: "Activite", Ic: Icons.Clock },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
            color: tab === t.id ? "var(--text)" : "var(--text-3)",
            borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -1, background: "none", border: "none", cursor: "pointer",
          }}>
            <t.Ic size={14} /> {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }} className="row">
          <Link href={`/projets/${id}/budget`} className="btn btn-ghost btn-sm">
            <Icons.Money size={14} /> Budget
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNewDoc(true)}>
            <Icons.Plus size={14} /> Document
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "kanban" && <KanbanBoard projetId={id} documents={projet.documents} onMoveDocument={moveDocument} />}
      {tab === "timeline" && <DocTimeline documents={projet.documents} dateLimiteProjet={projet.dateLimite} />}
      {tab === "docs" && <DocsTable projetId={id} documents={projet.documents} />}
      {tab === "equipe" && <TeamView membres={projet.membres} />}
      {tab === "activite" && <ActivityView activites={projet.activites} />}

      {/* Modal nouveau document */}
      {showNewDoc && <NewDocModal projetId={id} onClose={() => setShowNewDoc(false)} onCreated={load} />}
    </div>
  );
}

/* ─── Timeline / Gantt ─── */
function DocTimeline({ documents, dateLimiteProjet }: { documents: Document[]; dateLimiteProjet: string }) {
  if (documents.length === 0) {
    return <div className="card" style={{ padding: 48, textAlign: "center" }}><p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucun document</p></div>;
  }

  // Calculer la plage de dates
  const deadlines = documents.filter(d => d.dateLimite).map(d => new Date(d.dateLimite!).getTime());
  const now = Date.now();
  const earliest = deadlines.length > 0 ? Math.min(...deadlines) : now;
  const latest = deadlines.length > 0 ? Math.max(...deadlines) : now;

  // Etendre la plage de 2 semaines avant/apres
  const startMs = earliest - 14 * 864e5;
  const endMs = latest + 14 * 864e5;
  const span = endMs - startMs;

  // Generer les labels de mois
  const months: string[] = [];
  const monthStarts: number[] = [];
  const d = new Date(startMs);
  d.setDate(1);
  while (d.getTime() <= endMs) {
    months.push(d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }));
    monthStarts.push(d.getTime());
    d.setMonth(d.getMonth() + 1);
  }

  const todayPct = ((now - startMs) / span) * 100;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header mois */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
        <div style={{ borderRight: "1px solid var(--border)", background: "var(--surface-2)", padding: "10px 14px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Document</div>
        <div style={{ display: "flex", background: "var(--surface-2)", position: "relative" }}>
          {months.map((m, i) => {
            const left = ((monthStarts[i] - startMs) / span) * 100;
            return (
              <div key={m + i} style={{ position: "absolute", left: `${left}%`, padding: "10px 14px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {m}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lignes */}
      {documents.map(doc => {
        const dlEnd = doc.dateLimite ? new Date(doc.dateLimite).getTime() : endMs;
        const dlStart = dlEnd - 7 * 864e5; // 1 semaine de duree
        const left = Math.max(0, ((dlStart - startMs) / span) * 100);
        const width = Math.min(100 - left, ((dlEnd - dlStart) / span) * 100);
        const color = doc.statut === "VALIDE" ? "var(--success)" : doc.statut === "BROUILLON" ? "var(--st-brouillon)" : "var(--primary)";
        const prog = doc.progression ?? 0;

        return (
          <div key={doc.id} style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderTop: "1px solid var(--border)", minHeight: 44 }}>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.titre}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-4)" }}>{categorieLabels[doc.categorie] ?? doc.categorie}</div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", top: "50%", transform: "translateY(-50%)",
                left: `${left}%`, width: `${width}%`, height: 22,
                background: `color-mix(in oklch, ${color} 18%, transparent)`,
                border: `1px solid color-mix(in oklch, ${color} 45%, transparent)`,
                borderRadius: 6,
                display: "flex", alignItems: "center", padding: "0 8px",
                fontSize: 10.5, fontWeight: 600, color: "var(--text-2)",
                overflow: "hidden",
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${prog}%`, background: `color-mix(in oklch, ${color} 25%, transparent)` }} />
                <span style={{ position: "relative" }}>{prog}%</span>
              </div>
              {/* Ligne aujourd'hui */}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, borderLeft: "2px dashed var(--accent)", zIndex: 1 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Documents Table ─── */
function DocsTable({ projetId, documents }: { projetId: string; documents: Document[] }) {
  return (
    <div className="card">
      <table className="t">
        <thead>
          <tr>
            <th>Document</th>
            <th>Categorie</th>
            <th>Statut</th>
            <th>Avancement</th>
            <th>Assigne a</th>
            <th>Echeance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map(d => {
            const prog = d.progression ?? 0;
            const dl = d.dateLimite ? daysUntil(d.dateLimite) : null;
            return (
              <tr key={d.id} style={{ cursor: "pointer" }}>
                <td>
                  <Link href={`/projets/${projetId}/docs/${d.id}`} style={{ fontWeight: 500, color: "var(--text)" }}>
                    {d.titre}
                  </Link>
                </td>
                <td style={{ fontSize: 12, color: "var(--text-3)" }}>{categorieLabels[d.categorie] ?? d.categorie}</td>
                <td>
                  <span className="pill" style={{ background: `color-mix(in oklch, ${statusColors[d.statut] ?? "var(--text-3)"} 12%, transparent)`, color: statusColors[d.statut] }}>
                    <span className="dot" style={{ background: statusColors[d.statut] }} />
                    {statusLabels[d.statut] ?? d.statut}
                  </span>
                </td>
                <td style={{ width: 160 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${prog}%`, height: "100%", background: "var(--primary)", borderRadius: 2 }} />
                    </div>
                    <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 28 }}>{prog}%</span>
                  </div>
                </td>
                <td>
                  {d.assigneA ? (
                    <div className="row" style={{ gap: 6 }}>
                      <div className="avatar" style={{ width: 20, height: 20, fontSize: 9, background: "var(--primary)" }}>
                        {d.assigneA.name.charAt(0)}
                      </div>
                      <span style={{ fontSize: 12 }}>{d.assigneA.name}</span>
                    </div>
                  ) : <span style={{ color: "var(--text-4)" }}>—</span>}
                </td>
                <td>
                  {dl !== null ? (
                    <span style={{ fontSize: 12, color: dl <= 3 ? "var(--danger)" : dl <= 7 ? "var(--warning)" : "var(--text-3)" }}>
                      {dl <= 0 ? "Expire !" : `${dl}j`}
                    </span>
                  ) : <span style={{ color: "var(--text-4)" }}>—</span>}
                </td>
                <td>
                  <Icons.More size={14} style={{ color: "var(--text-3)" }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {documents.length === 0 && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucun document</p>
        </div>
      )}
    </div>
  );
}

/* ─── Team View ─── */
function TeamView({ membres }: { membres: Membre[] }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Equipe projet · {membres.length} membres</div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
          <Icons.Plus size={14} /> Inviter
        </button>
      </div>
      {membres.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucun membre</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {membres.map(m => {
            const initials = m.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="row" style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, gap: 10 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, background: "var(--primary)" }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.user.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{m.role}</div>
                </div>
                <button className="icon-btn"><Icons.More size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Activity View ─── */
function ActivityView({ activites }: { activites: Activite[] }) {
  if (activites.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucune activite</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 18 }}>
      {activites.map((a, i) => {
        const initials = a.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div key={a.id} className="row" style={{ gap: 10, padding: "10px 0", borderBottom: i < activites.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: "var(--primary)", flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{a.user.name}</span>
              <span style={{ color: "var(--text-3)" }}> {a.description}</span>
              <div style={{ fontSize: 11.5, color: "var(--text-4)", marginTop: 2 }}>
                {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Modal Nouveau Document ─── */
function NewDocModal({ projetId, onClose, onCreated }: { projetId: string; onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<"create" | "import">("create");
  const [form, setForm] = useState({ titre: "", categorie: "PROPOSITION_TECHNIQUE", description: "" });
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const categories = [
    { value: "PROPOSITION_TECHNIQUE", label: "Proposition technique" },
    { value: "BUDGET_PREVISIONNEL", label: "Budget prévisionnel" },
    { value: "BUDGET_DETAIL", label: "Détail budgétaire" },
    { value: "CADRE_LOGIQUE", label: "Cadre logique" },
    { value: "NOTE_CONCEPTUELLE", label: "Note conceptuelle" },
    { value: "PLAN_TRAVAIL", label: "Plan de travail" },
    { value: "GANTT", label: "Diagramme de Gantt" },
    { value: "CV", label: "CV équipe" },
    { value: "DOCUMENT_LEGAL", label: "Documents légaux" },
    { value: "AUTRE", label: "Autre" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
    borderRadius: 6, background: "var(--surface)", fontSize: 13, color: "var(--text)",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)",
    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
  };

  async function handleCreate() {
    if (!form.titre.trim()) { setError("Le titre est requis"); return; }
    setCreating(true); setError("");
    const res = await fetch(`/api/projets/${projetId}/documents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? "Erreur"); return; }
    onCreated();
    onClose();
    if (data.document?.id) router.push(`/projets/${projetId}/docs/${data.document.id}`);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setError("");
    const titre = form.titre.trim() || file.name.replace(/\.[^.]+$/, "");

    const createRes = await fetch(`/api/projets/${projetId}/documents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, titre }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) { setError(createData.error ?? "Erreur"); setImporting(false); return; }

    const formData = new FormData();
    formData.append("file", file);
    const importRes = await fetch(`/api/documents/${createData.document.id}/import`, { method: "POST", body: formData });
    const importData = await importRes.json();
    setImporting(false);
    if (!importRes.ok) { setError(importData.error ?? "Erreur d'import"); return; }

    onCreated();
    onClose();
    router.push(`/projets/${projetId}/docs/${createData.document.id}`);
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 12, width: "100%", maxWidth: 520, boxShadow: "var(--shadow-lg)" }}>
        <div className="card-header">
          <div className="card-title">Nouveau document</div>
          <button className="icon-btn" onClick={onClose}><Icons.X size={16} /></button>
        </div>

        <div className="row" style={{ padding: "0 20px", gap: 0, borderBottom: "1px solid var(--border)" }}>
          {([
            { id: "create" as const, label: "Créer un document" },
            { id: "import" as const, label: "Importer depuis le PC" },
          ]).map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer",
              color: mode === t.id ? "var(--text)" : "var(--text-3)",
              borderBottom: mode === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {error && <div style={{ padding: "8px 12px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Titre du document</label>
              <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} style={inputStyle}
                placeholder="Ex : Proposition technique PNUD" />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={inputStyle}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {mode === "create" && (
              <>
                <div>
                  <label style={labelStyle}>Description (optionnel)</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle}
                    placeholder="Brève description du document" />
                </div>
                <button onClick={handleCreate} disabled={creating} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", opacity: creating ? 0.5 : 1 }}>
                  <Icons.Plus size={14} /> {creating ? "Création..." : "Créer le document"}
                </button>
              </>
            )}

            {mode === "import" && (
              <div style={{ border: "2px dashed var(--border-strong)", borderRadius: 10, padding: 28, textAlign: "center", background: "var(--surface-2)" }}>
                <Icons.Download size={24} style={{ color: "var(--text-3)", transform: "rotate(180deg)", margin: "0 auto 10px", display: "block" }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Déposer un fichier</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>.docx, .html, .txt, .md</div>
                <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                  <Icons.Download size={14} style={{ transform: "rotate(180deg)" }} /> {importing ? "Import en cours..." : "Choisir un fichier"}
                  <input type="file" accept=".docx,.html,.htm,.txt,.md" onChange={handleImport} style={{ display: "none" }} disabled={importing} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
