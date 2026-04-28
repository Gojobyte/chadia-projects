"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useCallback, useRef } from "react";

interface DocumentEditorProps {
  documentId: string;
  initialContent?: string;
  onSave?: () => void;
}

export function DocumentEditor({ documentId, initialContent, onSave }: DocumentEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Commencez a rediger..." }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save 3 secondes apres la derniere modification
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(editor.getHTML());
      }, 3000);
    },
  });

  const saveContent = useCallback(async (content: string) => {
    setSaving(true);
    await fetch(`/api/documents/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: content }),
    });
    setSaving(false);
    setLastSaved(new Date());
    onSave?.();
  }, [documentId, onSave]);

  // Charger un template
  async function loadTemplate(categorie: string) {
    setLoadingTemplate(true);
    const res = await fetch(`/api/templates?categorie=${categorie}`);
    if (res.ok) {
      const data = await res.json();
      if (data.templates.length > 0 && editor) {
        // Convertir le markdown du template en HTML basique
        const content = data.templates[0].contenu
          .replace(/^### (.*$)/gm, "<h3>$1</h3>")
          .replace(/^## (.*$)/gm, "<h2>$1</h2>")
          .replace(/^# (.*$)/gm, "<h1>$1</h1>")
          .replace(/\n/g, "<br>");
        editor.commands.setContent(content);
      }
    }
    setLoadingTemplate(false);
  }

  // Sauvegarde manuelle
  function handleManualSave() {
    if (editor) saveContent(editor.getHTML());
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!editor) return <p className="text-slate-500">Chargement de l&apos;editeur...</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-slate-200 px-4 py-2 flex items-center gap-1 flex-wrap">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          H1
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          H2
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("heading", { level: 3 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          H3
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm rounded font-bold ${editor.isActive("bold") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          B
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm rounded italic ${editor.isActive("italic") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          I
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("bulletList") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          • Liste
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("orderedList") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          1. Liste
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 text-sm rounded ${editor.isActive("blockquote") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
          Citation
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 text-sm rounded text-slate-600 hover:bg-slate-100">
          — Ligne
        </button>

        <div className="flex-1" />

        {/* Template */}
        <button onClick={() => loadTemplate("PROPOSITION_TECHNIQUE")} disabled={loadingTemplate}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
          {loadingTemplate ? "..." : "Charger template"}
        </button>

        {/* Save */}
        <button onClick={handleManualSave} disabled={saving}
          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        {lastSaved && (
          <span className="text-xs text-slate-400 ml-2">
            Sauve a {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
