"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Typography from "@tiptap/extension-typography";
import { cn } from "@/lib/utils";

// ─── Types ───

interface BlockEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onAIRequest?: (text: string) => Promise<string>;
}

// ─── Slash Menu Component ───

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "heading1",
    label: "Titre 1",
    description: "Grand titre de section",
    icon: "H1",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Titre 2",
    description: "Sous-titre",
    icon: "H2",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Titre 3",
    description: "Sous-section",
    icon: "H3",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Liste à puces",
    description: "Liste simple",
    icon: "•",
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Liste numérotée",
    description: "Liste ordonnée",
    icon: "1.",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "Citation",
    description: "Bloc de citation",
    icon: "❝",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Bloc de code",
    description: "Code formaté",
    icon: "</>",
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "table",
    label: "Tableau",
    description: "Tableau 3×3",
    icon: "⊞",
    action: (e) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: "callout",
    label: "Callout",
    description: "Encadré d'information",
    icon: "💡",
    action: (e) => {
      e.chain().focus().toggleBlockquote().run();
      // Add callout data attribute via wrapping node
    },
  },
  {
    id: "divider",
    label: "Séparateur",
    description: "Ligne horizontale",
    icon: "―",
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

function SlashMenu({
  editor,
  position,
  onSelect,
  filter,
}: {
  editor: Editor;
  position: { top: number; left: number };
  onSelect: () => void;
  filter: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = MENU_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filtered.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            filtered[selectedIndex].action(editor);
            onSelect();
          }
          break;
        case "Escape":
          e.preventDefault();
          onSelect();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, editor, onSelect]);

  // Scroll selected into view
  useEffect(() => {
    const el = menuRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 max-h-72 overflow-y-auto rounded-lg border bg-card shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-1.5">
        <p className="text-[10px] text-muted-foreground font-medium px-2 py-1">
          Insérer un bloc
        </p>
        {filtered.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              item.action(editor);
              onSelect();
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2 py-1.5 rounded text-left transition-colors text-sm",
              index === selectedIndex
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <span className="w-7 h-7 rounded border bg-muted/50 flex items-center justify-center text-xs font-mono shrink-0">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── AI Generation Helper ───

async function generateWithAI(prompt: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text || "";
  } catch {
    return `<!-- AI generated content for: ${prompt} -->`;
  }
}

// ─── Main Editor Component ───

export function BlockEditor({
  content = "",
  onChange,
  readOnly = false,
  placeholder = "Tapez '/' pour insérer un bloc, ou commencez à écrire...",
}: BlockEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: true,
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Typography,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px]",
      },
      handleKeyDown: (_view, event) => {
        // Handle slash command trigger
        if (event.key === "/" && !showSlashMenu) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.top > 0) {
              setSlashPosition({ top: rect.bottom + 4, left: rect.left });
              setSlashFilter("");
              setShowSlashMenu(true);
              return false;
            }
          }
        }

        // Handle filtering in slash menu
        if (showSlashMenu) {
          if (event.key === "Backspace") {
            setSlashFilter((f) => f.slice(0, -1));
            if (slashFilter.length <= 1) {
              setShowSlashMenu(false);
            }
            return false;
          }
          if (event.key.length === 1) {
            setSlashFilter((f) => f + event.key);
            return false;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      setIsFocused(false);
      // Delay hiding slash menu so click events can fire
      setTimeout(() => setShowSlashMenu(false), 200);
    },
  });

  const insertAI = useCallback(async () => {
    if (!editor || isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      const text = await generateWithAI("Rédigez un paragraphe professionnel pour ce document.");
      if (text) {
        editor.chain().focus().insertContent(`<p>${text}</p>`).run();
      }
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editor, isGeneratingAI]);

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isFocused ? "border-primary ring-1 ring-primary/20" : "border-border"
      )}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-muted/30 rounded-t-lg">
          {/* Format */}
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Gras"
          >
            <strong className="text-xs">B</strong>
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italique"
          >
            <em className="text-xs">I</em>
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Barré"
          >
            <s className="text-xs">S</s>
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Code"
          >
            <code className="text-[10px]">&lt;/&gt;</code>
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-0.5 self-center" />

          {/* Headings dropdown */}
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Titre 1"
          >
            H1
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Titre 2"
          >
            H2
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Titre 3"
          >
            H3
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-0.5 self-center" />

          {/* Lists */}
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Liste à puces"
          >
            •
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Liste numérotée"
          >
            1.
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Citation"
          >
            ❝
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-0.5 self-center" />

          {/* Insert */}
          <ToolBtn
            onClick={() => {
              const url = window.prompt("URL du lien:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive("link")}
            title="Lien"
          >
            🔗
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              const url = window.prompt("URL de l'image:");
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }}
            title="Image"
          >
            🖼️
          </ToolBtn>
          <ToolBtn
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Tableau"
          >
            ⊞
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Séparateur"
          >
            ―
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-0.5 self-center" />

          {/* AI */}
          <ToolBtn onClick={insertAI} title="Générer avec l'IA">
            {isGeneratingAI ? (
              <span className="text-[10px] animate-pulse">✨...</span>
            ) : (
              <span className="text-xs">✨ IA</span>
            )}
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-0.5 self-center" />

          {/* Undo/Redo */}
          <ToolBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler"
          >
            ↩
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir"
          >
            ↪
          </ToolBtn>
        </div>
      )}

      {/* Editor content */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Slash menu */}
      {showSlashMenu && (
        <SlashMenu
          editor={editor}
          position={slashPosition}
          filter={slashFilter}
          onSelect={() => setShowSlashMenu(false)}
        />
      )}

      {/* Status bar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/10 rounded-b-lg text-[10px] text-muted-foreground">
          <span>
            {editor.storage.characterCount?.words?.() || 0} mots ·{" "}
            {editor.storage.characterCount?.characters?.() || 0} caractères
          </span>
          <span>Tapez &apos;/&apos; pour les blocs</span>
        </div>
      )}
    </div>
  );
}

// ─── Toolbar Button ───

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-6 h-6 rounded flex items-center justify-center transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
