"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/icons";

interface Template { id: string; categorie: string; titre: string; description: string | null; contenu: string; createdAt: string; }

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget prévisionnel",
  BUDGET_DETAIL: "Budget détaillé", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV", DOCUMENT_LEGAL: "Documents légaux", AUTRE: "Autre",
};

const categorieIcons: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "var(--info)", BUDGET_PREVISIONNEL: "var(--success)",
  CADRE_LOGIQUE: "var(--accent)", NOTE_CONCEPTUELLE: "var(--primary)",
  PLAN_TRAVAIL: "var(--text-3)", BUDGET_DETAIL: "var(--success)",
  GANTT: "var(--info)", CV: "var(--primary)", DOCUMENT_LEGAL: "var(--text-3)", AUTRE: "var(--text-4)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
  borderRadius: 6, background: "var(--surface)", fontSize: 13.5, color: "var(--text)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categorie: "PROPOSITION_TECHNIQUE", titre: "", description: "", contenu: "" });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => { setTemplates(d.templates ?? []); setLoading(false); });
  }, []);

  const selected = templates.find(t => t.id === selectedId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormLoading(true);
    const res = await fetch("/api/templates", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates(prev => [...prev, data.template]);
      setForm({ categorie: "PROPOSITION_TECHNIQUE", titre: "", description: "", contenu: "" });
      setShowForm(false);
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (loading) return <p style={{ color: "var(--text-3)", padding: 32, fontSize: 13 }}>Chargement...</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Templates</div>
          <div className="page-subtitle">{templates.length} modèles disponibles · {Object.keys(categorieLabels).length} catégories</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><Icons.Download size={14} /> Exporter</button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            <Icons.Plus size={14} /> {showForm ? "Annuler" : "Nouveau template"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Templates", v: String(templates.length), sub: "modèles créés", c: "var(--primary)" },
          { l: "Catégories", v: String(new Set(templates.map(t => t.categorie)).size), sub: "types de documents", c: "var(--info)" },
          { l: "Plus utilisé", v: templates.length > 0 ? "Prop. tech." : "—", sub: "modèle populaire", c: "var(--accent)" },
          { l: "Dernier ajout", v: templates.length > 0 ? new Date(templates[templates.length - 1].createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—", sub: "date de création", c: "var(--success)" },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{k.l}</div>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={inputStyle}>
                {Object.entries(categorieLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Titre</label>
              <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required style={inputStyle} placeholder="Ex: Template proposition PNUD" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionnel" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Contenu du template (HTML)</label>
              <textarea value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} required rows={8}
                placeholder="<h2>Section 1</h2>&#10;<p>Contenu du template...</p>"
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", resize: "vertical", minHeight: 120 }} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ opacity: formLoading ? 0.5 : 1 }}>
              <Icons.Check size={14} /> {formLoading ? "Création..." : "Créer le template"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
          </div>
        </form>
      )}

      {/* Layout 5/7 */}
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 16 }}>
        {/* Liste des templates */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {templates.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <Icons.Doc size={28} style={{ color: "var(--text-4)", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-3)", fontSize: 13 }}>Aucun template. Créez-en un pour commencer.</p>
            </div>
          ) : templates.map(t => {
            const isSelected = selectedId === t.id;
            const color = categorieIcons[t.categorie] ?? "var(--text-3)";
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                style={{
                  textAlign: "left", width: "100%", padding: 14,
                  background: "var(--surface)", border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", cursor: "pointer",
                  ...(isSelected ? { boxShadow: "0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent)" } : {}),
                }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="tag" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)`, color, borderColor: "transparent" }}>
                    {categorieLabels[t.categorie] ?? t.categorie}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    style={{ color: "var(--danger)", fontSize: 10, background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}>
                    <Icons.Trash size={12} />
                  </button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.titre}</div>
                {t.description && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{t.description}</div>}
              </button>
            );
          })}
        </div>

        {/* Aperçu du template */}
        <div>
          {selected ? (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{selected.titre}</div>
                  <span className="tag" style={{ marginTop: 4, background: `color-mix(in oklch, ${categorieIcons[selected.categorie] ?? "var(--text-3)"} 12%, transparent)`, color: categorieIcons[selected.categorie], borderColor: "transparent" }}>
                    {categorieLabels[selected.categorie]}
                  </span>
                </div>
                <button className="btn btn-primary btn-sm"><Icons.Doc size={14} /> Utiliser</button>
              </div>
              <div style={{ padding: 20, background: "var(--surface-2)", maxHeight: 600, overflowY: "auto" }}>
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)" }}
                  dangerouslySetInnerHTML={{ __html: selected.contenu }}
                />
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <Icons.Doc size={28} style={{ color: "var(--text-4)", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sélectionnez un template pour voir son contenu</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
