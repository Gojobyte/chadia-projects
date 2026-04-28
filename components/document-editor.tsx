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
import { useState, useEffect, useCallback, useRef } from "react";

interface DocumentEditorProps {
  documentId: string;
  initialContent?: string;
  onSave?: () => void;
}

export function DocumentEditor({ documentId, initialContent, onSave }: DocumentEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Placeholder.configure({ placeholder: "Commencez a rediger votre document..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      LinkExt.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount,
      FontFamily,
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[600px] px-12 py-8",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(editor.getHTML()), 3000);
    },
  });

  const saveContent = useCallback(async (content: string) => {
    setSaving(true);
    await fetch(`/api/documents/${documentId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: content }),
    });
    setSaving(false);
    setLastSaved(new Date());
    onSave?.();
  }, [documentId, onSave]);

  function handleManualSave() { if (editor) saveContent(editor.getHTML()); }

  function addLink() {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl(""); setShowLinkInput(false);
    }
  }

  function addImage() {
    const url = prompt("URL de l'image :");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }

  function addTable() {
    if (editor) editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  async function loadTemplate(categorie: string) {
    const res = await fetch(`/api/templates?categorie=${categorie}`);
    if (res.ok) {
      const data = await res.json();
      if (data.templates.length > 0 && editor) {
        const content = data.templates[0].contenu
          .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
          .replace(/^### (.*$)/gm, "<h3>$1</h3>")
          .replace(/^## (.*$)/gm, "<h2>$1</h2>")
          .replace(/^# (.*$)/gm, "<h1>$1</h1>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\[(.*?)\]/g, "<em>$1</em>")
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br>");
        editor.commands.setContent(`<p>${content}</p>`);
      }
    }
  }

  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }; }, []);

  if (!editor) return <p className="text-slate-500 p-8">Chargement de l&apos;editeur...</p>;

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
      {/* Toolbar Row 1 — Fichier & Templates */}
      <div className="border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 bg-slate-50">
        <div className="relative group">
          <button className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">Templates ▾</button>
          <div className="absolute hidden group-hover:block left-0 top-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-56">
            {["PROPOSITION_TECHNIQUE", "CADRE_LOGIQUE", "NOTE_CONCEPTUELLE", "BUDGET_PREVISIONNEL", "PLAN_TRAVAIL"].map(cat => (
              <button key={cat} onClick={() => loadTemplate(cat)} className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                {cat.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <span className="text-xs text-slate-400">{words} mots · {chars} caracteres</span>
        {saving && <span className="text-xs text-indigo-500">Sauvegarde...</span>}
        {lastSaved && !saving && <span className="text-xs text-green-600">Sauve {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
        <button onClick={handleManualSave} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Sauvegarder</button>
      </div>

      {/* Toolbar Row 2 — Formatage texte */}
      <div className="border-b border-slate-200 px-3 py-1.5 flex items-center gap-0.5 flex-wrap bg-white">
        {/* Font family */}
        <select onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="text-xs border border-slate-200 rounded px-1 py-1 mr-1 w-28">
          <option value="">Police</option>
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
        </select>

        {/* Headings */}
        <select onChange={e => {
          const val = e.target.value;
          if (val === "p") editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(val) as 1|2|3|4 }).run();
          e.target.value = "";
        }} className="text-xs border border-slate-200 rounded px-1 py-1 mr-1 w-28">
          <option value="">Style</option>
          <option value="1">Titre 1</option>
          <option value="2">Titre 2</option>
          <option value="3">Titre 3</option>
          <option value="4">Titre 4</option>
          <option value="p">Paragraphe</option>
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Bold, Italic, Underline, Strikethrough */}
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
          <em>I</em>
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligne">
          <span className="underline">U</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barre">
          <span className="line-through">S</span>
        </ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Subscript, Superscript */}
        <ToolBtn active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Indice">
          X<sub>2</sub>
        </ToolBtn>
        <ToolBtn active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Exposant">
          X<sup>2</sup>
        </ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Text color */}
        <label title="Couleur du texte" className="relative cursor-pointer">
          <span className="px-1.5 py-1 text-xs rounded hover:bg-slate-100 inline-block">A<span className="block h-0.5 bg-red-500 -mt-0.5" /></span>
          <input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} className="absolute opacity-0 w-0 h-0" />
        </label>

        {/* Highlight */}
        <ToolBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} title="Surligner">
          <span className="bg-yellow-200 px-0.5">H</span>
        </ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Alignment */}
        <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Gauche">≡</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centre">≡</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Droite">≡</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justifie">≡</ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists */}
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste a puces">•</ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numerotee">1.</ToolBtn>
        <ToolBtn active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">☑</ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Block elements */}
        <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">❝</ToolBtn>
        <ToolBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code">{"</>"}</ToolBtn>
        <ToolBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Ligne horizontale">—</ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Insert */}
        <ToolBtn active={false} onClick={addTable} title="Inserer un tableau">▦</ToolBtn>
        <ToolBtn active={false} onClick={addImage} title="Inserer une image">🖼</ToolBtn>
        <ToolBtn active={editor.isActive("link")} onClick={() => {
          if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); }
          else { setShowLinkInput(!showLinkInput); }
        }} title="Lien">🔗</ToolBtn>
      </div>

      {/* Table toolbar (visible quand on est dans un tableau) */}
      {editor.isActive("table") && (
        <div className="border-b border-slate-200 px-3 py-1 flex items-center gap-1 bg-blue-50">
          <span className="text-xs text-blue-600 mr-2">Tableau :</span>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">+ Colonne</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">+ Ligne</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">- Colonne</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">- Ligne</button>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Supprimer tableau</button>
        </div>
      )}

      {/* Link input */}
      {showLinkInput && (
        <div className="border-b border-slate-200 px-3 py-2 flex items-center gap-2 bg-yellow-50">
          <span className="text-xs text-slate-600">URL :</span>
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
            className="flex-1 text-sm px-2 py-1 border border-slate-300 rounded" onKeyDown={e => e.key === "Enter" && addLink()} />
          <button onClick={addLink} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded">Ajouter</button>
          <button onClick={() => setShowLinkInput(false)} className="text-xs px-2 py-1 text-slate-500">Annuler</button>
        </div>
      )}

      {/* Editor Content */}
      <div className="bg-white min-h-[700px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Composant bouton de toolbar reutilisable
function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`px-1.5 py-1 text-xs rounded transition-colors ${active ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}
