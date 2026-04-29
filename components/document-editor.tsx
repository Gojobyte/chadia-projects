"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import LinkExt from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import FontFamily from "@tiptap/extension-font-family";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface DocumentEditorProps {
  documentId: string;
  initialContent?: string;
  projetTitre?: string;
  bailleurNom?: string;
  onSave?: () => void;
}

interface TocItem { level: number; text: string; }

type TabName = "accueil" | "insertion" | "mise-en-page" | "references";

export function DocumentEditor({ documentId, initialContent, projetTitre, bailleurNom, onSave }: DocumentEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("accueil");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [fontSize, setFontSize] = useState("11");
  const [showCoverForm, setShowCoverForm] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [coverData, setCoverData] = useState({
    titre: projetTitre ?? "", sousTitre: "", bailleur: bailleurNom ?? "",
    organisation: "ONG CHADIA", date: new Date().toLocaleDateString("fr-FR"),
    reference: "", version: "1.0", confidentiel: false,
  });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
      Placeholder.configure({ placeholder: "Commencez a rediger..." }),
      Underline, TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      LinkExt.configure({ openOnClick: false }), Image,
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
      Subscript, Superscript, TaskList, TaskItem.configure({ nested: true }),
      Typography, CharacterCount, FontFamily,
    ],
    content: initialContent ?? "",
    editorProps: { attributes: { class: "document-content" } },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(editor.getHTML()), 3000);
      updateToc(editor.getHTML());
    },
  });

  function updateToc(html: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4");
    const items: TocItem[] = [];
    headings.forEach(h => { items.push({ level: Number(h.tagName[1]), text: h.textContent ?? "" }); });
    setToc(items);
  }

  useEffect(() => { if (initialContent) updateToc(initialContent); }, [initialContent]);

  const saveContent = useCallback(async (content: string) => {
    setSaving(true);
    await fetch(`/api/documents/${documentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contenu: content }) });
    setSaving(false); setLastSaved(new Date()); onSave?.();
  }, [documentId, onSave]);

  function handleManualSave() { if (editor) saveContent(editor.getHTML()); }
  function addLink() { if (linkUrl && editor) { editor.chain().focus().setLink({ href: linkUrl }).run(); setLinkUrl(""); setShowLinkInput(false); } }
  function addImage() { const url = prompt("URL de l'image :"); if (url && editor) editor.chain().focus().setImage({ src: url }).run(); }
  function addTable() { if (editor) editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
  function insertPageBreak() { if (editor) editor.commands.insertContent('<div class="page-break"></div><p></p>'); }

  function insertCoverPage() {
    if (!editor) return;
    const cover = `<div class="cover-page"><div class="cover-header"><p class="cover-org">${coverData.organisation}</p>${coverData.confidentiel ? '<p class="cover-confidentiel">CONFIDENTIEL</p>' : ''}</div><div class="cover-body"><h1 class="cover-title">${coverData.titre}</h1>${coverData.sousTitre ? `<p class="cover-subtitle">${coverData.sousTitre}</p>` : ''}<hr class="cover-divider" />${coverData.bailleur ? `<p class="cover-bailleur">Soumis a : ${coverData.bailleur}</p>` : ''}${coverData.reference ? `<p class="cover-ref">Reference : ${coverData.reference}</p>` : ''}</div><div class="cover-footer"><p>${coverData.organisation}</p><p>${coverData.date} · Version ${coverData.version}</p></div></div><div class="page-break"></div><p></p>`;
    editor.chain().focus().insertContentAt(0, cover).run();
    setShowCoverForm(false);
  }

  function insertToc() {
    if (!editor || toc.length === 0) return;
    let html = '<div class="toc-container"><h2 class="toc-title">Table des matieres</h2>';
    toc.forEach(item => { html += `<p class="toc-item" style="padding-left: ${(item.level - 1) * 20}px">${item.text}</p>`; });
    html += '</div><div class="page-break"></div><p></p>';
    editor.commands.insertContent(html);
  }

  async function loadTemplate(categorie: string) {
    const res = await fetch(`/api/templates?categorie=${categorie}`);
    if (res.ok) {
      const data = await res.json();
      if (data.templates.length > 0 && editor) {
        const c = data.templates[0].contenu.replace(/^#### (.*$)/gm, "<h4>$1</h4>").replace(/^### (.*$)/gm, "<h3>$1</h3>").replace(/^## (.*$)/gm, "<h2>$1</h2>").replace(/^# (.*$)/gm, "<h1>$1</h1>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
        editor.commands.setContent(`<p>${c}</p>`);
      }
    }
  }

  function changeFontSize(size: string) {
    setFontSize(size);
    if (editor) {
      editor.chain().focus().setMark("textStyle", { fontSize: `${size}pt` }).run();
    }
  }

  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }; }, []);

  const chars = useMemo(() => editor?.storage.characterCount.characters() ?? 0, [editor?.state]);
  const words = useMemo(() => editor?.storage.characterCount.words() ?? 0, [editor?.state]);
  const pages = useMemo(() => Math.max(1, Math.ceil(words / 300)), [words]);

  if (!editor) return <p className="text-slate-500 p-8">Chargement...</p>;

  return (
    <div className="flex gap-4">
      {/* Sidebar — Sommaire */}
      <div className="w-52 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Navigation</h3>
          {toc.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Ajoutez des titres...</p>
          ) : (
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
              {toc.map((item, i) => (
                <p key={i} className={`text-xs cursor-pointer hover:text-indigo-600 truncate ${item.level === 1 ? "font-semibold text-slate-800" : item.level === 2 ? "text-slate-600" : "text-slate-400"}`}
                  style={{ paddingLeft: `${(item.level - 1) * 10}px` }}>
                  {item.text}
                </p>
              ))}
            </div>
          )}
          <hr className="my-3" />
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>{words} mots</p>
            <p>{chars} caracteres</p>
            <p>~{pages} page{pages > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Editeur principal */}
      <div className="flex-1 min-w-0">
        {/* Menu tabs style Word */}
        <div className="bg-white border border-slate-200 rounded-t-lg overflow-hidden">
          {/* Barre de titre */}
          <div className="bg-slate-700 text-white px-4 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold">CHADIA Projects</span>
              {saving && <span className="text-indigo-300">Sauvegarde en cours...</span>}
              {lastSaved && !saving && <span className="text-green-300">Sauvegarde {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            <button onClick={handleManualSave} className="px-3 py-0.5 bg-indigo-500 rounded hover:bg-indigo-600 text-xs">💾 Sauvegarder</button>
          </div>

          {/* Onglets */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            {(["accueil", "insertion", "mise-en-page", "references"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                {tab === "mise-en-page" ? "Mise en page" : tab === "references" ? "References" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Ruban — Accueil */}
          {activeTab === "accueil" && (
            <div className="px-3 py-2 flex items-end gap-3 border-b border-slate-200 bg-white flex-wrap">
              {/* Groupe Police */}
              <div className="border-r border-slate-200 pr-3">
                <p className="text-[10px] text-slate-400 mb-1">Police</p>
                <div className="flex items-center gap-1">
                  <select onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()} className="text-xs border border-slate-300 rounded px-1 py-1 w-28">
                    <option value="Inter">Inter</option><option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option><option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                  <select value={fontSize} onChange={e => changeFontSize(e.target.value)} className="text-xs border border-slate-300 rounded px-1 py-1 w-14">
                    {["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "36", "48", "72"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  <RB a={editor.isActive("bold")} o={() => editor.chain().focus().toggleBold().run()}><strong>G</strong></RB>
                  <RB a={editor.isActive("italic")} o={() => editor.chain().focus().toggleItalic().run()}><em>I</em></RB>
                  <RB a={editor.isActive("underline")} o={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">S</span></RB>
                  <RB a={editor.isActive("strike")} o={() => editor.chain().focus().toggleStrike().run()}><span className="line-through">ab</span></RB>
                  <RB a={editor.isActive("subscript")} o={() => editor.chain().focus().toggleSubscript().run()}>x<sub>2</sub></RB>
                  <RB a={editor.isActive("superscript")} o={() => editor.chain().focus().toggleSuperscript().run()}>x<sup>2</sup></RB>
                  <label className="relative cursor-pointer"><span className="px-1.5 py-0.5 text-xs rounded hover:bg-slate-100 inline-flex items-center">A<span className="block w-3 h-1 bg-red-500 ml-0.5" /></span><input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} className="absolute opacity-0 w-0 h-0" /></label>
                  <RB a={editor.isActive("highlight")} o={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}><span className="bg-yellow-200 px-1">ab</span></RB>
                </div>
              </div>

              {/* Groupe Paragraphe */}
              <div className="border-r border-slate-200 pr-3">
                <p className="text-[10px] text-slate-400 mb-1">Paragraphe</p>
                <div className="flex items-center gap-0.5">
                  <RB a={editor.isActive("bulletList")} o={() => editor.chain().focus().toggleBulletList().run()}>☰•</RB>
                  <RB a={editor.isActive("orderedList")} o={() => editor.chain().focus().toggleOrderedList().run()}>☰1</RB>
                  <RB a={editor.isActive("taskList")} o={() => editor.chain().focus().toggleTaskList().run()}>☑</RB>
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  <RB a={editor.isActive({ textAlign: "left" })} o={() => editor.chain().focus().setTextAlign("left").run()}>⫷</RB>
                  <RB a={editor.isActive({ textAlign: "center" })} o={() => editor.chain().focus().setTextAlign("center").run()}>☰</RB>
                  <RB a={editor.isActive({ textAlign: "right" })} o={() => editor.chain().focus().setTextAlign("right").run()}>⫸</RB>
                  <RB a={editor.isActive({ textAlign: "justify" })} o={() => editor.chain().focus().setTextAlign("justify").run()}>≡</RB>
                </div>
              </div>

              {/* Groupe Styles */}
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Styles</p>
                <div className="flex items-center gap-1">
                  <StyleBtn active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} label="Normal" />
                  <StyleBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Titre 1" className="text-blue-700 text-lg font-bold" />
                  <StyleBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Titre 2" className="text-blue-600 text-base font-semibold" />
                  <StyleBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Titre 3" className="text-blue-500 text-sm font-medium" />
                  <StyleBtn active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} label="Titre 4" className="text-teal-600 text-sm" />
                  <StyleBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Citation" className="text-slate-500 italic text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* Ruban — Insertion */}
          {activeTab === "insertion" && (
            <div className="px-3 py-2 flex items-end gap-3 border-b border-slate-200 bg-white flex-wrap">
              <div className="border-r border-slate-200 pr-3">
                <p className="text-[10px] text-slate-400 mb-1">Pages</p>
                <div className="flex gap-1">
                  <BigBtn onClick={() => setShowCoverForm(!showCoverForm)} icon="📄" label="Page de garde" />
                  <BigBtn onClick={insertPageBreak} icon="📃" label="Saut de page" />
                </div>
              </div>
              <div className="border-r border-slate-200 pr-3">
                <p className="text-[10px] text-slate-400 mb-1">Elements</p>
                <div className="flex gap-1">
                  <BigBtn onClick={addTable} icon="▦" label="Tableau" />
                  <BigBtn onClick={addImage} icon="🖼" label="Image" />
                  <BigBtn onClick={() => setShowLinkInput(!showLinkInput)} icon="🔗" label="Lien" />
                  <BigBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon="—" label="Ligne" />
                  <BigBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon="{ }" label="Code" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Templates</p>
                <div className="flex gap-1 flex-wrap">
                  {[["PROPOSITION_TECHNIQUE","Proposition"],["CADRE_LOGIQUE","Cadre log."],["NOTE_CONCEPTUELLE","Note conc."],["BUDGET_PREVISIONNEL","Budget"],["PLAN_TRAVAIL","Plan"]].map(([cat, label]) => (
                    <button key={cat} onClick={() => loadTemplate(cat)} className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ruban — References */}
          {activeTab === "references" && (
            <div className="px-3 py-2 flex items-end gap-3 border-b border-slate-200 bg-white">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Table des matieres</p>
                <div className="flex gap-1">
                  <BigBtn onClick={insertToc} icon="📑" label="Inserer sommaire" />
                </div>
              </div>
            </div>
          )}

          {/* Ruban — Mise en page */}
          {activeTab === "mise-en-page" && (
            <div className="px-3 py-2 flex items-end gap-3 border-b border-slate-200 bg-white">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Mise en page</p>
                <p className="text-xs text-slate-500">Format A4 · Marges normales (2.5cm)</p>
              </div>
            </div>
          )}

          {/* Table toolbar */}
          {editor.isActive("table") && (
            <div className="px-3 py-1 flex items-center gap-1 bg-blue-50 border-b border-slate-200">
              <span className="text-xs text-blue-600 font-medium mr-2">Tableau :</span>
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">+ Colonne</button>
              <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">+ Ligne</button>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">- Colonne</button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">- Ligne</button>
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Supprimer</button>
            </div>
          )}

          {/* Link input */}
          {showLinkInput && (
            <div className="px-3 py-2 flex items-center gap-2 bg-yellow-50 border-b border-slate-200">
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 text-sm px-2 py-1 border border-slate-300 rounded" onKeyDown={e => e.key === "Enter" && addLink()} />
              <button onClick={addLink} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded">OK</button>
              <button onClick={() => setShowLinkInput(false)} className="text-xs text-slate-500">✕</button>
            </div>
          )}

          {/* Cover page form */}
          {showCoverForm && (
            <div className="p-4 bg-indigo-50 border-b border-slate-200 space-y-3">
              <h3 className="text-sm font-semibold text-indigo-800">Page de garde</h3>
              <div className="grid grid-cols-2 gap-2">
                <input value={coverData.titre} onChange={e => setCoverData({...coverData, titre: e.target.value})} placeholder="Titre" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.sousTitre} onChange={e => setCoverData({...coverData, sousTitre: e.target.value})} placeholder="Sous-titre" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.bailleur} onChange={e => setCoverData({...coverData, bailleur: e.target.value})} placeholder="Bailleur" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.reference} onChange={e => setCoverData({...coverData, reference: e.target.value})} placeholder="Reference" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.date} onChange={e => setCoverData({...coverData, date: e.target.value})} placeholder="Date" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.version} onChange={e => setCoverData({...coverData, version: e.target.value})} placeholder="Version" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={coverData.confidentiel} onChange={e => setCoverData({...coverData, confidentiel: e.target.checked})} /> Confidentiel</label>
                <button onClick={insertCoverPage} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded">Inserer</button>
                <button onClick={() => setShowCoverForm(false)} className="text-xs text-slate-500">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Zone d'edition — Pages A4 avec separation style Word */}
        <div className="editor-page-container rounded-b-lg">
          <div className="editor-page">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Barre de statut */}
        <div className="bg-slate-700 text-white px-4 py-1 flex justify-between text-xs rounded-b-lg">
          <span>Page 1 sur {pages}</span>
          <span>{words} mots · {chars} caracteres · {toc.length} titres</span>
        </div>
      </div>
    </div>
  );
}

// Bouton ruban petit
function RB({ a, o, children }: { a: boolean; o: () => void; children: React.ReactNode }) {
  return <button onClick={o} className={`px-1.5 py-0.5 text-xs rounded ${a ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300" : "hover:bg-slate-100 text-slate-600"}`}>{children}</button>;
}

// Bouton style (Titre 1, Titre 2, etc.)
function StyleBtn({ active, onClick, label, className }: { active: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 border rounded text-left min-w-[70px] transition-all ${active ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"}`}>
      <span className={className ?? "text-xs text-slate-700"}>{label}</span>
    </button>
  );
}

// Gros bouton insertion
function BigBtn({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 px-3 py-2 border border-slate-300 rounded hover:bg-slate-50 min-w-[60px]">
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] text-slate-600">{label}</span>
    </button>
  );
}
