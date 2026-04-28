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

interface TocItem { level: number; text: string; id: string; }

export function DocumentEditor({ documentId, initialContent, projetTitre, bailleurNom, onSave }: DocumentEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showCoverPage, setShowCoverPage] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [coverData, setCoverData] = useState({
    titre: projetTitre ?? "", sousTitre: "", bailleur: bailleurNom ?? "",
    organisation: "ONG CHADIA", date: new Date().toLocaleDateString("fr-FR"),
    reference: "", version: "1.0", confidentiel: false,
  });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Placeholder.configure({ placeholder: "Commencez a rediger votre document..." }),
      Underline, TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      LinkExt.configure({ openOnClick: false }), Image.configure({ inline: true }),
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
      Subscript, Superscript, TaskList, TaskItem.configure({ nested: true }),
      Typography, CharacterCount, FontFamily,
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: { class: "document-page focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(editor.getHTML()), 3000);
      updateToc(editor.getHTML());
    },
  });

  // Extraire le sommaire depuis les headings
  function updateToc(html: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4");
    const items: TocItem[] = [];
    headings.forEach((h, i) => {
      items.push({ level: Number(h.tagName[1]), text: h.textContent ?? "", id: `heading-${i}` });
    });
    setToc(items);
  }

  useEffect(() => { if (initialContent) updateToc(initialContent); }, [initialContent]);

  const saveContent = useCallback(async (content: string) => {
    setSaving(true);
    await fetch(`/api/documents/${documentId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: content }),
    });
    setSaving(false); setLastSaved(new Date()); onSave?.();
  }, [documentId, onSave]);

  function handleManualSave() { if (editor) saveContent(editor.getHTML()); }
  function addLink() { if (linkUrl && editor) { editor.chain().focus().setLink({ href: linkUrl }).run(); setLinkUrl(""); setShowLinkInput(false); } }
  function addImage() { const url = prompt("URL de l'image :"); if (url && editor) editor.chain().focus().setImage({ src: url }).run(); }
  function addTable() { if (editor) editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
  function insertPageBreak() { if (editor) editor.chain().focus().setHardBreak().insertContent('<div class="page-break"></div>').run(); }

  // Inserer une page de garde
  function insertCoverPage() {
    if (!editor) return;
    const cover = `
      <div class="cover-page">
        <div class="cover-header">
          <p class="cover-org">${coverData.organisation}</p>
          ${coverData.confidentiel ? '<p class="cover-confidentiel">CONFIDENTIEL</p>' : ''}
        </div>
        <div class="cover-body">
          <h1 class="cover-title">${coverData.titre}</h1>
          ${coverData.sousTitre ? `<p class="cover-subtitle">${coverData.sousTitre}</p>` : ''}
          <hr class="cover-divider" />
          ${coverData.bailleur ? `<p class="cover-bailleur">Soumis a : ${coverData.bailleur}</p>` : ''}
          ${coverData.reference ? `<p class="cover-ref">Reference : ${coverData.reference}</p>` : ''}
        </div>
        <div class="cover-footer">
          <p>${coverData.organisation}</p>
          <p>${coverData.date} · Version ${coverData.version}</p>
        </div>
      </div>
      <div class="page-break"></div>
    `;
    editor.chain().focus().insertContentAt(0, cover).run();
    setShowCoverPage(false);
  }

  // Inserer un sommaire
  function insertToc() {
    if (!editor || toc.length === 0) return;
    let tocHtml = '<div class="toc-container"><h2 class="toc-title">Sommaire</h2>';
    toc.forEach(item => {
      const indent = (item.level - 1) * 20;
      tocHtml += `<p class="toc-item" style="padding-left: ${indent}px">${item.text}</p>`;
    });
    tocHtml += '</div><div class="page-break"></div>';
    // Inserer apres la page de garde ou au debut
    const content = editor.getHTML();
    const afterCover = content.indexOf('class="page-break"');
    if (afterCover > -1) {
      const insertPos = afterCover + 'class="page-break"></div>'.length;
      editor.commands.insertContentAt(insertPos + 5, tocHtml);
    } else {
      editor.chain().focus().insertContentAt(0, tocHtml).run();
    }
    setShowToc(false);
  }

  async function loadTemplate(categorie: string) {
    const res = await fetch(`/api/templates?categorie=${categorie}`);
    if (res.ok) {
      const data = await res.json();
      if (data.templates.length > 0 && editor) {
        const content = data.templates[0].contenu
          .replace(/^#### (.*$)/gm, "<h4>$1</h4>").replace(/^### (.*$)/gm, "<h3>$1</h3>")
          .replace(/^## (.*$)/gm, "<h2>$1</h2>").replace(/^# (.*$)/gm, "<h1>$1</h1>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\[(.*?)\]/g, "<em>$1</em>")
          .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
        editor.commands.setContent(`<p>${content}</p>`);
      }
    }
  }

  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }; }, []);

  const chars = useMemo(() => editor?.storage.characterCount.characters() ?? 0, [editor?.state]);
  const words = useMemo(() => editor?.storage.characterCount.words() ?? 0, [editor?.state]);
  const pages = useMemo(() => Math.max(1, Math.ceil(words / 300)), [words]);

  if (!editor) return <p className="text-slate-500 p-8">Chargement de l&apos;editeur...</p>;

  return (
    <div className="flex gap-4">
      {/* Panneau lateral — Sommaire */}
      <div className="w-56 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Sommaire</h3>
          {toc.length === 0 ? (
            <p className="text-xs text-slate-400">Ajoutez des titres pour generer le sommaire.</p>
          ) : (
            <div className="space-y-1">
              {toc.map((item, i) => (
                <p key={i} className="text-xs text-slate-600 hover:text-indigo-600 cursor-pointer truncate"
                  style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
                  {item.text}
                </p>
              ))}
            </div>
          )}
          <hr className="my-3" />
          <div className="text-xs text-slate-400 space-y-1">
            <p>{words} mots · {chars} car.</p>
            <p>~{pages} page{pages > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Editeur principal */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          {/* Toolbar Row 1 — Insertion */}
          <div className="border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 bg-slate-50 flex-wrap">
            <button onClick={() => setShowCoverPage(!showCoverPage)} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">
              📄 Page de garde
            </button>
            <button onClick={() => setShowToc(!showToc)} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">
              📑 Sommaire
            </button>
            <button onClick={insertPageBreak} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">
              📃 Saut de page
            </button>
            <div className="relative group">
              <button className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">📝 Templates ▾</button>
              <div className="absolute hidden group-hover:block left-0 top-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-56">
                {["PROPOSITION_TECHNIQUE", "CADRE_LOGIQUE", "NOTE_CONCEPTUELLE", "BUDGET_PREVISIONNEL", "PLAN_TRAVAIL"].map(cat => (
                  <button key={cat} onClick={() => loadTemplate(cat)} className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    {cat.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1" />
            {saving && <span className="text-xs text-indigo-500">Sauvegarde...</span>}
            {lastSaved && !saving && <span className="text-xs text-green-600">Sauve {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={handleManualSave} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">💾 Sauvegarder</button>
          </div>

          {/* Toolbar Row 2 — Formatage */}
          <div className="border-b border-slate-200 px-3 py-1.5 flex items-center gap-0.5 flex-wrap bg-white">
            <select onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()} className="text-xs border border-slate-200 rounded px-1 py-1 mr-1 w-28">
              <option value="">Police</option>
              <option value="Inter">Inter</option><option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option><option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>
            <select onChange={e => { const v = e.target.value; if (v === "p") editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: Number(v) as 1|2|3|4 }).run(); e.target.value = ""; }} className="text-xs border border-slate-200 rounded px-1 py-1 mr-1 w-28">
              <option value="">Style</option><option value="1">Titre 1</option><option value="2">Titre 2</option>
              <option value="3">Titre 3</option><option value="4">Titre 4</option><option value="p">Paragraphe</option>
            </select>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={editor.isActive("bold")} o={() => editor.chain().focus().toggleBold().run()} t="Gras"><strong>B</strong></TB>
            <TB a={editor.isActive("italic")} o={() => editor.chain().focus().toggleItalic().run()} t="Italique"><em>I</em></TB>
            <TB a={editor.isActive("underline")} o={() => editor.chain().focus().toggleUnderline().run()} t="Souligne"><span className="underline">U</span></TB>
            <TB a={editor.isActive("strike")} o={() => editor.chain().focus().toggleStrike().run()} t="Barre"><span className="line-through">S</span></TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={editor.isActive("subscript")} o={() => editor.chain().focus().toggleSubscript().run()} t="Indice">X<sub>2</sub></TB>
            <TB a={editor.isActive("superscript")} o={() => editor.chain().focus().toggleSuperscript().run()} t="Exposant">X<sup>2</sup></TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <label title="Couleur" className="relative cursor-pointer">
              <span className="px-1.5 py-1 text-xs rounded hover:bg-slate-100 inline-block">A<span className="block h-0.5 bg-red-500 -mt-0.5" /></span>
              <input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} className="absolute opacity-0 w-0 h-0" />
            </label>
            <TB a={editor.isActive("highlight")} o={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} t="Surligner"><span className="bg-yellow-200 px-0.5">H</span></TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={editor.isActive({ textAlign: "left" })} o={() => editor.chain().focus().setTextAlign("left").run()} t="Gauche">⫷</TB>
            <TB a={editor.isActive({ textAlign: "center" })} o={() => editor.chain().focus().setTextAlign("center").run()} t="Centre">☰</TB>
            <TB a={editor.isActive({ textAlign: "right" })} o={() => editor.chain().focus().setTextAlign("right").run()} t="Droite">⫸</TB>
            <TB a={editor.isActive({ textAlign: "justify" })} o={() => editor.chain().focus().setTextAlign("justify").run()} t="Justifie">☰</TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={editor.isActive("bulletList")} o={() => editor.chain().focus().toggleBulletList().run()} t="Puces">•</TB>
            <TB a={editor.isActive("orderedList")} o={() => editor.chain().focus().toggleOrderedList().run()} t="Numerotee">1.</TB>
            <TB a={editor.isActive("taskList")} o={() => editor.chain().focus().toggleTaskList().run()} t="Checklist">☑</TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={editor.isActive("blockquote")} o={() => editor.chain().focus().toggleBlockquote().run()} t="Citation">❝</TB>
            <TB a={editor.isActive("codeBlock")} o={() => editor.chain().focus().toggleCodeBlock().run()} t="Code">{"</>"}</TB>
            <TB a={false} o={() => editor.chain().focus().setHorizontalRule().run()} t="Ligne">—</TB>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <TB a={false} o={addTable} t="Tableau">▦</TB>
            <TB a={false} o={addImage} t="Image">🖼</TB>
            <TB a={editor.isActive("link")} o={() => { if (editor.isActive("link")) editor.chain().focus().unsetLink().run(); else setShowLinkInput(!showLinkInput); }} t="Lien">🔗</TB>
          </div>

          {/* Table toolbar */}
          {editor.isActive("table") && (
            <div className="border-b border-slate-200 px-3 py-1 flex items-center gap-1 bg-blue-50">
              <span className="text-xs text-blue-600 mr-2">Tableau :</span>
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">+ Col</button>
              <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">+ Ligne</button>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">- Col</button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">- Ligne</button>
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Supprimer</button>
            </div>
          )}

          {/* Link input */}
          {showLinkInput && (
            <div className="border-b border-slate-200 px-3 py-2 flex items-center gap-2 bg-yellow-50">
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 text-sm px-2 py-1 border border-slate-300 rounded" onKeyDown={e => e.key === "Enter" && addLink()} />
              <button onClick={addLink} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded">OK</button>
              <button onClick={() => setShowLinkInput(false)} className="text-xs px-2 py-1 text-slate-500">✕</button>
            </div>
          )}

          {/* Cover page form */}
          {showCoverPage && (
            <div className="border-b border-slate-200 p-4 bg-indigo-50 space-y-3">
              <h3 className="text-sm font-semibold text-indigo-800">Page de garde</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={coverData.titre} onChange={e => setCoverData({...coverData, titre: e.target.value})} placeholder="Titre du document" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.sousTitre} onChange={e => setCoverData({...coverData, sousTitre: e.target.value})} placeholder="Sous-titre (optionnel)" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.bailleur} onChange={e => setCoverData({...coverData, bailleur: e.target.value})} placeholder="Bailleur (ex: PNUD)" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.reference} onChange={e => setCoverData({...coverData, reference: e.target.value})} placeholder="Reference (optionnel)" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.date} onChange={e => setCoverData({...coverData, date: e.target.value})} placeholder="Date" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
                <input value={coverData.version} onChange={e => setCoverData({...coverData, version: e.target.value})} placeholder="Version" className="text-sm px-2 py-1.5 border border-slate-300 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={coverData.confidentiel} onChange={e => setCoverData({...coverData, confidentiel: e.target.checked})} />
                <label className="text-xs text-slate-600">Document confidentiel</label>
              </div>
              <div className="flex gap-2">
                <button onClick={insertCoverPage} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded">Inserer la page de garde</button>
                <button onClick={() => setShowCoverPage(false)} className="px-3 py-1.5 text-xs text-slate-500">Annuler</button>
              </div>
            </div>
          )}

          {/* TOC form */}
          {showToc && (
            <div className="border-b border-slate-200 p-4 bg-green-50">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Sommaire automatique ({toc.length} titres detectes)</h3>
              {toc.length === 0 ? (
                <p className="text-xs text-slate-500">Ajoutez des titres (H1, H2, H3) dans votre document pour generer le sommaire.</p>
              ) : (
                <div className="flex gap-2">
                  <button onClick={insertToc} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded">Inserer le sommaire</button>
                  <button onClick={() => setShowToc(false)} className="px-3 py-1.5 text-xs text-slate-500">Annuler</button>
                </div>
              )}
            </div>
          )}

          {/* Editor Content — Style A4 */}
          <div className="bg-slate-100 p-8 flex justify-center">
            <div className="bg-white shadow-lg w-full max-w-[816px] min-h-[1056px] px-[72px] py-[72px]">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Footer — Page info */}
          <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex justify-between text-xs text-slate-400">
            <span>{words} mots · {chars} caracteres</span>
            <span>~{pages} page{pages > 1 ? "s" : ""} (estimation)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TB({ a, o, t, children }: { a: boolean; o: () => void; t: string; children: React.ReactNode }) {
  return (
    <button onClick={o} title={t} className={`px-1.5 py-1 text-xs rounded transition-colors ${a ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}
