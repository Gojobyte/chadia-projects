"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

interface Bailleur { id: string; nom: string; sigle: string; }
interface User { id: string; name: string; email: string; role: string; }

const categorieLabels: Record<string, string> = {
  NOTE_CONCEPTUELLE: "Note conceptuelle", PROPOSITION_TECHNIQUE: "Proposition technique",
  CADRE_LOGIQUE: "Cadre logique", BUDGET_PREVISIONNEL: "Budget prévisionnel",
  BUDGET_DETAIL: "Détail budgétaire", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV équipe", DOCUMENT_LEGAL: "Documents légaux",
};

const categorieDescs: Record<string, string> = {
  NOTE_CONCEPTUELLE: "Vue d'ensemble · 2-4 pages",
  PROPOSITION_TECHNIQUE: "Document principal · 20-40 pages",
  CADRE_LOGIQUE: "Matrice objectifs / indicateurs",
  BUDGET_PREVISIONNEL: "Synthèse budgétaire",
  BUDGET_DETAIL: "Ventilation par activité",
  PLAN_TRAVAIL: "Calendrier des activités",
  GANTT: "Diagramme de Gantt",
  CV: "CV de l'équipe",
  DOCUMENT_LEGAL: "Statuts, accréditations, attestations",
};

const ALL_DOCS = ["NOTE_CONCEPTUELLE", "PROPOSITION_TECHNIQUE", "CADRE_LOGIQUE", "BUDGET_PREVISIONNEL", "BUDGET_DETAIL", "PLAN_TRAVAIL", "GANTT", "CV", "DOCUMENT_LEGAL"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
  borderRadius: 6, background: "var(--surface)", fontSize: 13.5, color: "var(--text)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
};

export default function NouveauProjetPage() {
  const router = useRouter();
  const [bailleurs, setBailleurs] = useState<Bailleur[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    method: null as string | null,
    titre: "", reference: "", description: "", bailleurId: "",
    budget: "", devise: "EUR", dateLimite: "", appelOffreUrl: "", pays: "",
    documents: ["NOTE_CONCEPTUELLE", "PROPOSITION_TECHNIQUE", "CADRE_LOGIQUE", "BUDGET_PREVISIONNEL", "PLAN_TRAVAIL", "CV", "DOCUMENT_LEGAL"] as string[],
    membres: [] as string[],
  });

  useEffect(() => {
    fetch("/api/bailleurs").then(r => r.json()).then(d => setBailleurs(d.bailleurs ?? []));
    fetch("/api/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleDoc(value: string) {
    update("documents", form.documents.includes(value) ? form.documents.filter(d => d !== value) : [...form.documents, value]);
  }

  function toggleMember(id: string) {
    update("membres", form.membres.includes(id) ? form.membres.filter(m => m !== id) : [...form.membres, id]);
  }

  async function handleCreate() {
    setLoading(true); setError("");
    const res = await fetch("/api/projets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: form.titre, reference: form.reference, description: form.description,
        bailleurId: form.bailleurId, budget: form.budget ? Number(form.budget) : undefined,
        devise: form.devise, dateLimite: form.dateLimite, appelOffreUrl: form.appelOffreUrl,
        pays: form.pays, documents: form.documents,
      }),
    });
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error ?? "Erreur"); return; }
    router.push(`/projets/${data.projet.id}`);
  }

  const totalSteps = 4;
  const stepLabels = ["Méthode", "Informations", "Documents", "Équipe"];
  const canNext = step === 1 ? !!form.method : step === 2 ? !!form.titre && !!form.bailleurId && !!form.dateLimite && !!form.description : true;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: 0, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", border: "1px solid var(--border)", borderBottom: "none", background: "var(--surface)" }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="card-title">Nouveau projet</div>
          <span className="tag">Étape {step} / {totalSteps}</span>
        </div>
        <button className="icon-btn" onClick={() => router.push("/projets")}><Icons.X size={16} /></button>
      </div>

      <div className="card" style={{ borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }}>
        {/* Stepper */}
        <div className="row" style={{ padding: "14px 24px 6px", gap: 0 }}>
          {stepLabels.map((label, i) => {
            const idx = i + 1;
            const done = idx < step;
            const cur = idx === step;
            return (
              <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 50,
                  background: done || cur ? "var(--primary)" : "var(--surface-3)",
                  color: done || cur ? "white" : "var(--text-3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  boxShadow: cur ? "0 0 0 4px color-mix(in oklch, var(--primary) 18%, transparent)" : "none",
                }}>
                  {done ? <Icons.Check size={11} /> : idx}
                </div>
                <div style={{ fontSize: 12, fontWeight: cur ? 600 : 500, color: cur ? "var(--text)" : done ? "var(--text-2)" : "var(--text-4)" }}>{label}</div>
                {i < 3 && <div style={{ flex: 1, height: 1, background: done ? "var(--primary)" : "var(--border)" }} />}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && <div style={{ margin: "12px 24px 0", padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "var(--radius)", fontSize: 13 }}>{error}</div>}

        {/* Steps */}
        <div style={{ padding: "20px 24px 8px", minHeight: 360 }}>
          {/* Step 1: Method */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>Comment voulez-vous démarrer ?</h3>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>Trois façons de créer un projet de réponse à appel d&apos;offre.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: "ai", title: "Analyser un appel d'offre", desc: "Téléversez le PDF — l'IA extrait critères, budget, deadline et pré-remplit le projet.", Ic: Icons.Sparkles, badge: "Recommandé", color: "var(--primary)" },
                  { id: "template", title: "Partir d'un template", desc: "Choisissez un modèle (PNUD, UE, BADEA…) — structure et documents pré-créés.", Ic: Icons.Doc, color: "var(--info)" },
                  { id: "manual", title: "Création manuelle", desc: "Saisissez les informations à la main et choisissez les documents nécessaires.", Ic: Icons.Edit, color: "var(--text-3)" },
                ].map(o => {
                  const sel = form.method === o.id;
                  return (
                    <div key={o.id} onClick={() => update("method", o.id)}
                      style={{
                        border: `1px solid ${sel ? "var(--primary)" : "var(--border-strong)"}`,
                        background: sel ? "var(--primary-soft)" : "var(--surface)",
                        borderRadius: 10, padding: 16, cursor: "pointer",
                        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
                      }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in oklch, ${o.color} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: o.color }}>
                        <o.Ic size={20} />
                      </div>
                      <div>
                        <div className="row" style={{ gap: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{o.title}</div>
                          {o.badge && <span className="tag" style={{ background: "var(--primary-soft)", color: "var(--primary)", borderColor: "transparent" }}>{o.badge}</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 3 }}>{o.desc}</div>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: 50, border: `2px solid ${sel ? "var(--primary)" : "var(--border-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sel && <span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--primary)" }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Informations */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: "var(--text)" }}>Informations générales</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Titre du projet</label>
                  <input style={inputStyle} value={form.titre} onChange={e => update("titre", e.target.value)} placeholder="Ex : Renforcement de la résilience climatique au Sahel" required />
                </div>
                <div>
                  <label style={labelStyle}>Bailleur</label>
                  <select style={inputStyle} value={form.bailleurId} onChange={e => update("bailleurId", e.target.value)} required>
                    <option value="">Choisir le bailleur...</option>
                    {bailleurs.map(b => <option key={b.id} value={b.id}>{b.sigle} — {b.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Référence appel d&apos;offre</label>
                  <input style={inputStyle} value={form.reference} onChange={e => update("reference", e.target.value)} placeholder="Ex : PNUD-2026-SAH-014" />
                </div>
                <div>
                  <label style={labelStyle}>Pays / zone</label>
                  <input style={inputStyle} value={form.pays} onChange={e => update("pays", e.target.value)} placeholder="Mali, Burkina Faso..." />
                </div>
                <div>
                  <label style={labelStyle}>Date limite de soumission</label>
                  <input style={inputStyle} type="date" value={form.dateLimite} onChange={e => update("dateLimite", e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Budget demandé</label>
                  <div className="row" style={{ gap: 6 }}>
                    <input style={{ ...inputStyle, flex: 1 }} type="number" value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="0" />
                    <select style={{ ...inputStyle, width: 80 }} value={form.devise} onChange={e => update("devise", e.target.value)}>
                      <option>EUR</option><option>USD</option><option>FCFA</option>
                    </select>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description courte</label>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Résumé du projet en quelques phrases..." required />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Lien vers l&apos;appel d&apos;offres (optionnel)</label>
                  <input style={inputStyle} value={form.appelOffreUrl} onChange={e => update("appelOffreUrl", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div>
              <div className="row" style={{ marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Documents à produire</h3>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>Cochez les livrables exigés par l&apos;appel d&apos;offre — ils seront créés automatiquement.</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => update("documents", [...ALL_DOCS])}>Tout sélectionner</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {ALL_DOCS.map(c => {
                  const sel = form.documents.includes(c);
                  return (
                    <label key={c} style={{
                      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                      padding: "10px 12px",
                      border: `1px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                      background: sel ? "var(--primary-soft)" : "var(--surface)",
                      borderRadius: 8, cursor: "pointer",
                    }}>
                      <input type="checkbox" checked={sel} onChange={() => toggleDoc(c)} style={{ accentColor: "var(--primary)" }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{categorieLabels[c] ?? c}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{categorieDescs[c] ?? ""}</div>
                      </div>
                      {sel && <Icons.Check size={14} style={{ color: "var(--primary)" }} />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Equipe */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>Équipe projet</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 14 }}>Assignez les membres. Vous pourrez modifier les permissions plus tard.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {users.map(u => {
                  const sel = form.membres.includes(u.id);
                  const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id} onClick={() => toggleMember(u.id)}
                      style={{
                        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                        padding: "8px 12px",
                        border: `1px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                        background: sel ? "var(--primary-soft)" : "var(--surface)",
                        borderRadius: 8, cursor: "pointer",
                      }}>
                      <input type="checkbox" checked={sel} readOnly style={{ accentColor: "var(--primary)" }} />
                      <div className="row" style={{ gap: 10 }}>
                        <span className="avatar" style={{ background: "var(--primary)", width: 28, height: 28, fontSize: 10 }}>{initials}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{u.email}</div>
                        </div>
                      </div>
                      {sel && <Icons.Check size={14} style={{ color: "var(--primary)" }} />}
                    </div>
                  );
                })}
                {users.length === 0 && <p style={{ color: "var(--text-4)", fontSize: 13, padding: 16 }}>Aucun utilisateur trouvé</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer — navigation buttons */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/projets")}>Annuler</button>
          <div className="row" style={{ gap: 8 }}>
            {step > 1 && <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>Précédent</button>}
            {step < totalSteps ? (
              <button type="button" className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}
                style={{ opacity: !canNext ? 0.5 : 1 }}>
                Suivant <Icons.ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={loading} onClick={handleCreate}>
                <Icons.Check size={14} /> {loading ? "Création..." : "Créer le projet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
