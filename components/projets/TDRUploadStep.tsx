"use client";

import { useState, useRef } from "react";
import { Icons } from "@/components/icons";

interface TDRUploadStepProps {
  onAnalyze: (source: { type: "pdf" | "url" | "text"; file?: File; url?: string; text?: string }) => void;
  loading: boolean;
  error: string | null;
}

export function TDRUploadStep({ onAnalyze, loading, error }: TDRUploadStepProps) {
  const [mode, setMode] = useState<"pdf" | "url" | "text">("pdf");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Seuls les fichiers PDF sont acceptés");
      return;
    }
    setFileName(file.name);
    onAnalyze({ type: "pdf", file });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1px solid var(--border-strong)",
    borderRadius: 6, background: "var(--surface)", fontSize: 14, color: "var(--text)",
  };

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
        Analyser un appel d&apos;offres
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
        L&apos;IA analyse le TDR et pré-remplit automatiquement votre projet : métadonnées, sections, tâches, critères d&apos;évaluation.
      </p>

      {/* Tabs source */}
      <div className="row" style={{ gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {([
          { id: "pdf" as const, label: "📄 Fichier PDF" },
          { id: "url" as const, label: "🔗 URL de l'appel" },
          { id: "text" as const, label: "📝 Texte brut" },
        ]).map(t => (
          <button key={t.id} onClick={() => setMode(t.id)} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer",
            color: mode === t.id ? "var(--text)" : "var(--text-3)",
            borderBottom: mode === t.id ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* PDF upload */}
      {mode === "pdf" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border-strong)"}`,
            borderRadius: 12, padding: "48px 32px", textAlign: "center",
            background: dragOver ? "var(--primary-soft)" : "var(--surface-2)",
            transition: "all 0.15s", cursor: "pointer",
          }}
          onClick={() => fileRef.current?.click()}
        >
          {loading ? (
            <>
              <Icons.Sparkles size={32} style={{ color: "var(--primary)", margin: "0 auto 12px", display: "block" }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Analyse en cours...
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>
                {fileName} — extraction des informations par l&apos;IA
              </div>
              <div className="progress" style={{ maxWidth: 300, margin: "16px auto 0" }}>
                <span style={{ width: "60%", animation: "pulse 1.5s infinite" }} />
              </div>
            </>
          ) : (
            <>
              <Icons.Download size={32} style={{ color: "var(--text-3)", transform: "rotate(180deg)", margin: "0 auto 12px", display: "block" }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                {fileName || "Déposer le PDF du TDR ici"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
                ou cliquez pour sélectionner un fichier · PDF uniquement · max 100 pages
              </div>
              <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                Choisir un fichier
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* URL */}
      {mode === "url" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              URL de l&apos;appel à propositions
            </label>
            <input value={url} onChange={e => setUrl(e.target.value)} style={inputStyle}
              placeholder="https://procurement-notices.undp.org/..." />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-4)" }}>
            Fonctionne avec : UNDP, AFD, EuropeAid, ReliefWeb, et la plupart des sites de bailleurs.
          </p>
          <button className="btn btn-primary" disabled={loading || !url.trim()}
            onClick={() => onAnalyze({ type: "url", url: url.trim() })}
            style={{ alignSelf: "flex-start", opacity: loading || !url.trim() ? 0.5 : 1 }}>
            {loading ? (
              <><Icons.Sparkles size={14} /> Analyse en cours...</>
            ) : (
              <><Icons.Sparkles size={14} /> Analyser cette URL</>
            )}
          </button>
        </div>
      )}

      {/* Texte brut */}
      {mode === "text" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              Collez le texte du TDR
            </label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={10} style={{ ...inputStyle, resize: "vertical", minHeight: 200 }}
              placeholder="Collez ici le texte de l'appel à propositions..." />
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-4)" }}>
              {text.length > 0 ? `${text.length.toLocaleString()} caractères` : "Min. 100 caractères"}
            </span>
            <button className="btn btn-primary" disabled={loading || text.length < 100}
              onClick={() => onAnalyze({ type: "text", text })}
              style={{ opacity: loading || text.length < 100 ? 0.5 : 1 }}>
              {loading ? (
                <><Icons.Sparkles size={14} /> Analyse en cours...</>
              ) : (
                <><Icons.Sparkles size={14} /> Analyser ce texte</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
