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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  // Commandes clavier
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); }
      if (e.key === "u") { e.preventDefault(); document.execCommand("underline"); }
    }
    // Détecter "/" pour ouvrir le menu IA
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();
        if (editorRect) {
          setSlashPos({ top: rect.bottom - editorRect.top + 4, left: rect.left - editorRect.left });
          setShowSlashMenu(true);
        }
      }
    }
    // Fermer le menu avec Escape
    if (e.key === "Escape") { setShowSlashMenu(false); setAiSuggestion(null); }
  }

  // Appeler le copilote IA
  async function callCopilot(action: string) {
    setShowSlashMenu(false);
    setAiLoading(true);
    setAiSuggestion(null);

    // Supprimer le "/" tapé
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Enlever le dernier "/" si présent
      if (html.endsWith("/")) {
        editorRef.current.innerHTML = html.slice(0, -1);
      }
    }

    const context = editorRef.current?.innerText ?? "";
    const selection = window.getSelection()?.toString() ?? "";

    try {
      const res = await fetch(`/api/documents/${docId}/copilot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context: context.slice(-3000), selection }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setAiSuggestion(data.suggestion);
      } else {
        alert(data.error ?? "Erreur IA");
      }
    } catch {
      alert("Erreur de connexion");
    }
    setAiLoading(false);
  }

  // Accepter la suggestion IA — l'insérer dans l'éditeur
  function acceptSuggestion() {
    if (!aiSuggestion || !editorRef.current) return;
    editorRef.current.innerHTML += aiSuggestion;
    const html = editorRef.current.innerHTML;
    saveContent(html);
    setDoc(prev => prev ? { ...prev, contenu: html } : null);
    setAiSuggestion(null);
  }

  function rejectSuggestion() {
    setAiSuggestion(null);
  }

  // Formater un bloc (H2, H3, H4)
  function execBlock(tag: string) {
    document.execCommand("formatBlock", false, `<${tag}>`);
    editorRef.current?.focus();
  }

  // Insérer un tableau
  function insertTable() {
    const html = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <thead><tr><th style="border:1px solid var(--border);padding:8px 12px;background:var(--surface-2);text-align:left;font-weight:600">Colonne 1</th><th style="border:1px solid var(--border);padding:8px 12px;background:var(--surface-2);text-align:left;font-weight:600">Colonne 2</th><th style="border:1px solid var(--border);padding:8px 12px;background:var(--surface-2);text-align:left;font-weight:600">Colonne 3</th></tr></thead>
      <tbody><tr><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td></tr>
      <tr><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td><td style="border:1px solid var(--border);padding:8px 12px">Cellule</td></tr></tbody>
    </table><p><br></p>`;
    document.execCommand("insertHTML", false, html);
    editorRef.current?.focus();
  }

  // Insérer un encadré/callout
  function insertCallout() {
    const html = `<div style="background:var(--primary-soft);border:1px solid color-mix(in oklch, var(--primary) 30%, transparent);border-radius:8px;padding:14px 16px;margin:16px 0">
      <div style="font-size:11.5px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">POINT CLÉ</div>
      <p style="margin:0;color:var(--text-2)">Écrivez ici le contenu de l'encadré...</p>
    </div><p><br></p>`;
    document.execCommand("insertHTML", false, html);
    editorRef.current?.focus();
  }

  // Importer un fichier (.docx, .html, .txt)
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/documents/${docId}/import`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.html) {
        // Injecter le contenu importé dans l'éditeur
        if (editorRef.current) {
          editorRef.current.innerHTML = data.html;
        }
        contentLoaded.current = true;
        setDoc(prev => prev ? { ...prev, contenu: data.html } : null);
      } else {
        alert(data.error ?? "Erreur d'import");
      }
    } catch {
      alert("Erreur de connexion");
    }
    setImporting(false);
    // Reset l'input pour permettre de reimporter le meme fichier
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Chat IA interactif
  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    // Récupérer le texte sélectionné s'il y en a
    const selection = window.getSelection()?.toString() ?? "";
    const context = editorRef.current?.innerText?.slice(-3000) ?? "";

    try {
      const res = await fetch(`/api/documents/${docId}/copilot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "custom",
          context: `${userMsg}\n\nTexte sélectionné : ${selection || "(aucun)"}\n\nContenu du document :\n${context}`,
          selection,
        }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setChatMessages(prev => [...prev, { role: "ai", text: data.suggestion }]);
      } else {
        setChatMessages(prev => [...prev, { role: "ai", text: `Erreur : ${data.error ?? "Impossible de répondre"}` }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Erreur de connexion." }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // Insérer la réponse IA dans le document
  function insertAiResponse(html: string) {
    if (!editorRef.current) return;
    editorRef.current.innerHTML += html;
    const newHtml = editorRef.current.innerHTML;
    saveContent(newHtml);
    setDoc(prev => prev ? { ...prev, contenu: newHtml } : null);
  }

  // Remplacer la sélection par la réponse IA
  function replaceWithAiResponse(html: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      range.insertNode(frag);
      const newHtml = editorRef.current.innerHTML;
      saveContent(newHtml);
      setDoc(prev => prev ? { ...prev, contenu: newHtml } : null);
    }
  }

  async function changeStatut(statut: string) {
    setStatutOpen(false);
    await fetch(`/api/documents/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  function startWithTemplate() {
    // Mettre a jour doc.contenu — ca affiche le div contentEditable
    // Le useEffect injectera le HTML dans le ref au prochain rendu
    contentLoaded.current = false;
    setDoc(prev => prev ? { ...prev, contenu: TEMPLATE_CONTENT } : null);
    saveContent(TEMPLATE_CONTENT);
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

      {/* Layout: éditeur + sidebar + chat IA optionnel */}
      <div style={{ display: "grid", gridTemplateColumns: showChat ? "1fr 240px 320px" : "1fr 240px", gap: showChat ? 20 : 32, transition: "all 0.2s" }}>
        {/* ─── Left: Éditeur contentEditable ─── */}
        <div style={{ position: "relative" }}>
          {hasContent ? (
            <>
              {/* Barre d'outils de formatage */}
              <div style={{
                display: "flex", alignItems: "center", gap: 2, padding: "6px 8px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius) var(--radius) 0 0", borderBottom: "none",
                flexWrap: "wrap", position: "sticky", top: 52, zIndex: 10,
              }}>
                {/* Bloc de titres */}
                <ToolbarBtn label="H1" title="Titre principal (section)" onClick={() => execBlock("h2")} />
                <ToolbarBtn label="H2" title="Sous-titre (sous-section)" onClick={() => execBlock("h3")} />
                <ToolbarBtn label="H3" title="Sous-sous-titre" onClick={() => execBlock("h4")} />
                <ToolbarSep />
                {/* Formatage inline */}
                <ToolbarBtn label="G" title="Gras (Ctrl+B)" onClick={() => document.execCommand("bold")} bold />
                <ToolbarBtn label="I" title="Italique (Ctrl+I)" onClick={() => document.execCommand("italic")} italic />
                <ToolbarBtn label="S" title="Souligné (Ctrl+U)" onClick={() => document.execCommand("underline")} underline />
                <ToolbarBtn label="ab" title="Surligner" onClick={() => document.execCommand("hiliteColor", false, "#fef9c3")} highlight />
                <ToolbarSep />
                {/* Listes */}
                <ToolbarBtn label="1." title="Liste numérotée" onClick={() => document.execCommand("insertOrderedList")} />
                <ToolbarBtn label="•" title="Liste à puces" onClick={() => document.execCommand("insertUnorderedList")} />
                <ToolbarSep />
                {/* Blocs spéciaux */}
                <ToolbarBtn label="▤" title="Insérer un tableau" onClick={() => insertTable()} />
                <ToolbarBtn label="☐" title="Insérer un encadré" onClick={() => insertCallout()} />
                <ToolbarSep />
                {/* IA */}
                {/* Import fichier */}
                <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 4, border: "none", background: "transparent", color: "var(--text-2)", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}>
                  <Icons.Download size={12} style={{ transform: "rotate(180deg)" }} /> {importing ? "Import..." : "Importer"}
                </button>
                <input ref={fileInputRef} type="file" accept=".docx,.html,.htm,.txt,.md" onChange={handleImport} style={{ display: "none" }} />
                <ToolbarSep />
                {/* IA */}
                <button onClick={() => setShowChat(!showChat)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 4, border: "none", background: showChat ? "var(--primary)" : "var(--primary-soft)", color: showChat ? "white" : "var(--primary)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                  <Icons.Sparkles size={12} /> Co-pilote IA
                </button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onClick={() => setShowSlashMenu(false)}
                style={{
                  outline: "none", minHeight: 500, fontSize: 15, lineHeight: 1.7, color: "var(--text-2)",
                  cursor: "text", padding: "20px 24px",
                  border: "1px solid var(--border)", borderRadius: "0 0 var(--radius) var(--radius)",
                  background: "var(--surface)",
                }}
              />

              {/* Menu "/" — commandes IA */}
              {showSlashMenu && (
                <div style={{
                  position: "absolute", top: slashPos.top, left: slashPos.left,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, boxShadow: "var(--shadow-lg)", zIndex: 60,
                  padding: "6px 0", width: 260,
                }}>
                  <div style={{ padding: "6px 14px", fontSize: 10.5, color: "var(--text-4)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>
                    Co-pilote IA
                  </div>
                  {[
                    { id: "continuer", icon: "→", label: "Continuer la rédaction", desc: "L'IA écrit la suite" },
                    { id: "ameliorer", icon: "✦", label: "Améliorer le texte", desc: "Rendre plus professionnel" },
                    { id: "developper", icon: "⊕", label: "Développer", desc: "Ajouter des détails" },
                    { id: "resumer", icon: "≡", label: "Résumer", desc: "Synthétiser en 2-3 phrases" },
                    { id: "titres", icon: "#", label: "Générer un plan", desc: "Structure de sections" },
                  ].map(item => (
                    <button key={item.id} onClick={() => callCopilot(item.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "8px 14px", border: "none", background: "transparent",
                        cursor: "pointer", fontSize: 13, color: "var(--text)", textAlign: "left",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--primary)", flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Indicateur de chargement IA */}
              {aiLoading && (
                <div style={{ border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)", borderRadius: 8, padding: 16, background: "color-mix(in oklch, var(--primary) 4%, transparent)", marginTop: 16, textAlign: "center" }}>
                  <Icons.Sparkles size={16} style={{ color: "var(--primary)", marginBottom: 6 }} />
                  <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 500 }}>L&apos;IA rédige...</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Cela peut prendre quelques secondes</div>
                </div>
              )}

              {/* Suggestion IA — à accepter ou rejeter */}
              {aiSuggestion && (
                <div style={{ border: "2px solid color-mix(in oklch, var(--primary) 40%, transparent)", borderRadius: 10, overflow: "hidden", marginTop: 16 }}>
                  <div style={{ padding: "8px 14px", background: "color-mix(in oklch, var(--primary) 8%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icons.Sparkles size={14} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Suggestion IA</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button onClick={acceptSuggestion} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>
                        <Icons.Check size={12} /> Accepter
                      </button>
                      <button onClick={rejectSuggestion} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                        <Icons.X size={12} /> Rejeter
                      </button>
                    </div>
                  </div>
                  <div
                    style={{ padding: "14px 18px", fontSize: 15, lineHeight: 1.7, color: "var(--text-2)", background: "color-mix(in oklch, var(--primary) 3%, transparent)" }}
                    dangerouslySetInnerHTML={{ __html: aiSuggestion }}
                  />
                </div>
              )}
            </>
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
                <button className="btn btn-secondary" onClick={() => { startWithTemplate(); setTimeout(() => callCopilot("titres"), 500); }}>
                  <Icons.Sparkles size={14} /> Générer avec l&apos;IA
                </button>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  <Icons.Download size={14} style={{ transform: "rotate(180deg)" }} /> {importing ? "Import..." : "Importer un fichier"}
                </button>
                <input ref={fileInputRef} type="file" accept=".docx,.html,.htm,.txt,.md" onChange={handleImport} style={{ display: "none" }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 12 }}>
                Formats acceptés : .docx, .html, .txt, .md
              </p>
            </div>
          )}

          {/* Raccourci IA — affiché sous le contenu */}
          {hasContent && !aiSuggestion && !aiLoading && (
            <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => callCopilot("continuer")} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                <Icons.Sparkles size={12} /> Continuer
              </button>
              <button onClick={() => callCopilot("ameliorer")} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                <Icons.Sparkles size={12} /> Améliorer
              </button>
              <button onClick={() => callCopilot("developper")} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                <Icons.Sparkles size={12} /> Développer
              </button>
              <span style={{ fontSize: 11, color: "var(--text-4)", display: "flex", alignItems: "center" }}>
                ou tapez <kbd style={{ margin: "0 4px", padding: "1px 5px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>/</kbd> pour plus d&apos;options
              </span>
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

        {/* ─── Panneau Chat IA ─── */}
        {showChat && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", position: "sticky", top: 64, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface)" }}>
            {/* Header chat */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Sparkles size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Co-pilote IA</span>
              <button onClick={() => setShowChat(false)} className="icon-btn" style={{ marginLeft: "auto", width: 24, height: 24 }}>
                <Icons.X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 8px" }}>
                  <Icons.Sparkles size={20} style={{ color: "var(--primary)", margin: "0 auto 8px", display: "block" }} />
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.5 }}>
                    Demandez-moi de modifier, améliorer ou reformater votre document. Sélectionnez du texte pour une action ciblée.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                    {[
                      "Améliore ce paragraphe",
                      "Ajoute une section méthodologie",
                      "Reformate en liste numérotée",
                      "Rédige une conclusion",
                    ].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} style={{
                        padding: "6px 10px", fontSize: 11.5, color: "var(--text-2)",
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        borderRadius: 6, cursor: "pointer", textAlign: "left",
                      }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                  maxWidth: "90%",
                  ...(msg.role === "user" ? {
                    alignSelf: "flex-end", background: "var(--primary)", color: "white",
                  } : {
                    alignSelf: "flex-start", background: "var(--surface-2)", color: "var(--text)",
                  }),
                }}>
                  {msg.role === "ai" ? (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: msg.text }} style={{ fontSize: 12.5, lineHeight: 1.6 }} />
                      <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                        <button onClick={() => insertAiResponse(msg.text)} className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}>
                          Insérer en bas
                        </button>
                        <button onClick={() => replaceWithAiResponse(msg.text)} className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}>
                          Remplacer sélection
                        </button>
                      </div>
                    </>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div style={{ alignSelf: "flex-start", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--text-3)" }}>
                  <Icons.Sparkles size={12} style={{ color: "var(--primary)", marginRight: 4 }} />
                  Réflexion en cours...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="Demandez une modification..."
                style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12.5, background: "var(--surface)", color: "var(--text)", outline: "none" }}
              />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}
                style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontSize: 12, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                Envoyer
              </button>
            </div>
          </div>
        )}
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

/* ─── Toolbar components ─── */
function ToolbarBtn({ label, title, onClick, bold, italic, underline, highlight }: {
  label: string; title: string; onClick: () => void;
  bold?: boolean; italic?: boolean; underline?: boolean; highlight?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "transparent", color: "var(--text-2)", fontSize: 12,
      fontWeight: bold ? 700 : 500,
      fontStyle: italic ? "italic" : "normal",
      textDecoration: underline ? "underline" : "none",
      ...(highlight ? { background: "#fef9c3" } : {}),
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = highlight ? "#fef9c3" : "transparent"; }}
    >
      {label}
    </button>
  );
}

function ToolbarSep() {
  return <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />;
}
