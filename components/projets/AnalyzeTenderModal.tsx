"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

// Données extraites par /api/projets/analyze
interface QuickAnalysis {
  titre: string;
  bailleur: string | null;
  budget: number | null;
  devise: string | null;
  dateLimite: string | null;
  description: string;
  documentsRequis: string[];
  criteres: string[];
  resume: string;
}

interface AnalyzeTenderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projetId: string) => void;
}

type Tab = "url" | "text" | "upload";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
  borderRadius: 6, background: "var(--surface)", fontSize: 13, color: "var(--text)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
};

export function AnalyzeTenderModal({ open, onClose, onCreated }: AnalyzeTenderModalProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<QuickAnalysis | null>(null);
  const [bailleurs, setBailleurs] = useState<{ id: string; sigle: string; nom: string }[]>([]);
  const [bailleurId, setBailleurId] = useState("");

  if (!open) return null;

  function reset() {
    setUrl(""); setText(""); setFileName(""); setAnalysis(null); setErr(null); setBailleurId("");
  }

  async function loadBailleurs() {
    try {
      const res = await fetch("/api/bailleurs");
      if (res.ok) {
        const data = await res.json();
        const list = (data.bailleurs ?? data) as { id: string; sigle: string; nom: string }[];
        setBailleurs(list);
        if (analysis?.bailleur) {
          const match = list.find(b =>
            b.sigle.toLowerCase() === analysis.bailleur!.toLowerCase() ||
            b.nom.toLowerCase().includes(analysis.bailleur!.toLowerCase())
          );
          if (match) setBailleurId(match.id);
        }
      }
    } catch {
      // pas bloquant
    }
  }

  async function handleAnalyze() {
    setErr(null);
    setLoading(true);
    try {
      let body: Record<string, unknown> = {};
      if (tab === "url") {
        if (!url.trim()) throw new Error("Saisissez une URL.");
        body = { url: url.trim() };
      } else if (tab === "text") {
        if (text.trim().length < 100) throw new Error("Texte trop court (min. 100 caractères).");
        body = { text: text.trim() };
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Sélectionnez un fichier PDF.");
        const arrayBuf = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
        body = { file: base64, fileName: file.name };
      }
      const res = await fetch("/api/projets/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur d'analyse");
      setAnalysis(data.analysis as QuickAnalysis);
      await loadBailleurs();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!analysis) return;
    setErr(null);
    if (!bailleurId) {
      setErr("Sélectionnez un bailleur pour créer le projet.");
      return;
    }
    if (!analysis.dateLimite) {
      setErr("Date limite manquante. Renseignez-la avant de créer le projet.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/projets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: analysis.titre,
          description: analysis.description,
          bailleurId,
          dateLimite: analysis.dateLimite,
          budget: analysis.budget ?? undefined,
          devise: analysis.devise ?? "FCFA",
          appelOffreUrl: tab === "url" ? url.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de création");
      const projetId = data.projet?.id ?? data.id;
      onCreated?.(projetId);
      reset();
      onClose();
      if (projetId) router.push(`/projets/${projetId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: 12, width: "100%", maxWidth: 720,
          maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="card-header">
          <div className="card-title">
            <Icons.Sparkles size={16} style={{ color: "var(--primary)" }} /> Analyser un appel d&apos;offres
          </div>
          <button className="icon-btn" onClick={onClose}><Icons.X size={16} /></button>
        </div>

        {/* Tabs source */}
        {!analysis && (
          <div className="row" style={{ padding: "0 20px", gap: 0, borderBottom: "1px solid var(--border)" }}>
            {([
              { id: "url" as Tab, label: "URL" },
              { id: "text" as Tab, label: "Texte" },
              { id: "upload" as Tab, label: "Upload PDF" },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 16px", fontSize: 13, fontWeight: 500, background: "none",
                border: "none", cursor: "pointer",
                color: tab === t.id ? "var(--text)" : "var(--text-3)",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -1,
              }}>{t.label}</button>
            ))}
          </div>
        )}

        <div style={{ padding: 20, overflowY: "auto" }}>
          {err && (
            <div style={{ padding: "8px 12px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>
              {err}
            </div>
          )}

          {/* Étape 1 — saisie source */}
          {!analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tab === "url" && (
                <div>
                  <label style={labelStyle}>URL de l&apos;appel à propositions</label>
                  <input value={url} onChange={e => setUrl(e.target.value)} style={inputStyle}
                    placeholder="https://procurement-notices.undp.org/..." />
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6 }}>
                    Fonctionne avec UNDP, AFD, EuropeAid, ReliefWeb, et la plupart des sites bailleurs.
                  </p>
                </div>
              )}

              {tab === "text" && (
                <div>
                  <label style={labelStyle}>Texte du TDR</label>
                  <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 200 }}
                    placeholder="Collez ici le texte de l'appel à propositions..." />
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6 }}>
                    {text.length > 0 ? `${text.length.toLocaleString()} caractères` : "Min. 100 caractères"}
                  </p>
                </div>
              )}

              {tab === "upload" && (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-strong)", borderRadius: 12, padding: "32px 24px",
                    textAlign: "center", background: "var(--surface-2)", cursor: "pointer",
                  }}
                >
                  <Icons.Download size={28} style={{ color: "var(--text-3)", transform: "rotate(180deg)", margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    {fileName || "Déposer le PDF du TDR ici"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    PDF uniquement · max 100 pages
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                    onChange={e => setFileName(e.target.files?.[0]?.name ?? "")} />
                </div>
              )}

              <button className="btn btn-primary" disabled={loading} onClick={handleAnalyze}
                style={{ alignSelf: "flex-start", opacity: loading ? 0.5 : 1 }}>
                <Icons.Sparkles size={14} /> {loading ? "Analyse en cours..." : "Analyser"}
              </button>
            </div>
          )}

          {/* Étape 2 — résultats + création projet */}
          {analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginBottom: 4 }}>Résumé IA</div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{analysis.resume}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Titre</label>
                  <input value={analysis.titre} onChange={e => setAnalysis({ ...analysis, titre: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Bailleur (extrait : {analysis.bailleur ?? "—"})</label>
                  <select value={bailleurId} onChange={e => setBailleurId(e.target.value)} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {bailleurs.map(b => <option key={b.id} value={b.id}>{b.sigle} · {b.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date limite</label>
                  <input type="date" value={analysis.dateLimite?.slice(0, 10) ?? ""}
                    onChange={e => setAnalysis({ ...analysis, dateLimite: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Budget ({analysis.devise ?? "—"})</label>
                  <input type="number" value={analysis.budget ?? ""}
                    onChange={e => setAnalysis({ ...analysis, budget: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={analysis.description}
                    onChange={e => setAnalysis({ ...analysis, description: e.target.value })}
                    rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
              </div>

              {analysis.documentsRequis.length > 0 && (
                <div>
                  <label style={labelStyle}>Documents requis ({analysis.documentsRequis.length})</label>
                  <ul style={{ fontSize: 12, color: "var(--text-2)", paddingLeft: 18, margin: 0 }}>
                    {analysis.documentsRequis.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {analysis.criteres.length > 0 && (
                <div>
                  <label style={labelStyle}>Critères d&apos;évaluation ({analysis.criteres.length})</label>
                  <ul style={{ fontSize: 12, color: "var(--text-2)", paddingLeft: 18, margin: 0 }}>
                    {analysis.criteres.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={reset}>
                  <Icons.ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Recommencer
                </button>
                <button className="btn btn-primary" onClick={handleCreateProject} disabled={creating}
                  style={{ opacity: creating ? 0.5 : 1 }}>
                  <Icons.Plus size={14} /> {creating ? "Création..." : "Créer le projet"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
