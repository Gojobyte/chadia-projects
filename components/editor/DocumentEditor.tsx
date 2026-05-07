"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  cn,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  type FontFamily,
  type FontSize,
  type LineSpacing,
} from "@/lib/utils";

/* ─── Types ─── */

interface DocumentEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  readOnly?: boolean;
  documentTitle?: string;
  onTitleChange?: (title: string) => void;
}

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  heading: 0 | 1 | 2 | 3;
  alignment: "left" | "center" | "right" | "justify";
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  link: boolean;
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  textColor: string;
  highlightColor: string;
}

const TOOLBAR_DEFAULTS: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  heading: 0,
  alignment: "left",
  bulletList: false,
  orderedList: false,
  blockquote: false,
  link: false,
  fontFamily: "Inter",
  fontSize: "12",
  lineSpacing: "1.5",
  textColor: "#000000",
  highlightColor: "transparent",
};

/* ─── Toolbar Button ─── */

function TBtn({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-7 h-7 rounded flex items-center justify-center transition-colors text-sm",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

function TSelect<T extends string>({
  value,
  options,
  onChange,
  title,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  title?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      title={title}
      className={cn(
        "h-7 px-1.5 rounded border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />;
}

/* ─── Ruler Component ─── */

function Ruler({ zoom }: { zoom: number }) {
  const ticks = useMemo(() => {
    const arr: { pos: number; major: boolean; label?: string }[] = [];
    for (let i = 0; i <= 21; i++) {
      arr.push({ pos: i, major: true, label: `${i}` });
      for (let j = 1; j < 4; j++) {
        arr.push({ pos: i + j * 0.25, major: false });
      }
    }
    return arr;
  }, []);

  const scale = zoom / 100;

  return (
    <div className="relative h-5 bg-muted/20 border-b overflow-hidden select-none">
      <div
        className="absolute inset-0 flex items-end"
        style={{ transform: `scaleX(${scale})`, transformOrigin: "left top" }}
      >
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{ left: `${t.pos * 24}px` }}
          >
            <div
              className={cn(
                "w-px bg-muted-foreground/40",
                t.major ? "h-2.5" : "h-1.5"
              )}
            />
            {t.major && t.label && (
              <span className="absolute -top-0.5 left-0.5 text-[7px] text-muted-foreground">
                {t.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Editor ─── */

export function DocumentEditor({
  content = "",
  onChange,
  onSave,
  readOnly = false,
  documentTitle = "Document sans titre",
  onTitleChange,
}: DocumentEditorProps) {
  const [toolbar, setToolbar] = useState<ToolbarState>(TOOLBAR_DEFAULTS);
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank" } }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({
        placeholder: "Commencez à rédiger votre document...",
        showOnlyWhenEditable: true,
      }),
      Typography,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "doc-table" } }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "ProseMirror prose prose-sm dark:prose-invert max-w-none focus:outline-none px-8 py-4 min-h-[1000px]",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);

      // Auto-save after 2s idle
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave?.(html);
        setLastSaved(new Date());
      }, 2000);
    },
    onSelectionUpdate: ({ editor }) => updateToolbarState(editor),
  });

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editor) {
          setIsSaving(true);
          onSave?.(editor.getHTML());
          setTimeout(() => {
            setIsSaving(false);
            setLastSaved(new Date());
          }, 500);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editor, onSave]);

  function updateToolbarState(e: Editor) {
    setToolbar({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      heading: e.isActive("heading", { level: 1 })
        ? 1
        : e.isActive("heading", { level: 2 })
        ? 2
        : e.isActive("heading", { level: 3 })
        ? 3
        : 0,
      alignment:
        e.isActive({ textAlign: "center" })
          ? "center"
          : e.isActive({ textAlign: "right" })
          ? "right"
          : e.isActive({ textAlign: "justify" })
          ? "justify"
          : "left",
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
      fontFamily: "Inter",
      fontSize: "12",
      lineSpacing: "1.5",
      textColor: "#000000",
      highlightColor: "transparent",
    });
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-muted/10" ref={editorRef}>
      {/* ── Top Menu Bar ── */}
      <div className="border-b bg-card px-4 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => onTitleChange?.(e.target.value)}
            className="text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-0 min-w-[120px]"
            placeholder="Titre du document"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Sauvegarde...
            </span>
          ) : lastSaved ? (
            <span>✓ Sauvegardé à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          ) : null}
        </div>
      </div>

      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="border-b bg-card px-2 py-1 flex flex-wrap items-center gap-0.5 shrink-0">
          {/* Undo / Redo */}
          <TBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler (Ctrl+Z)"
          >
            ↩
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir (Ctrl+Y)"
          >
            ↪
          </TBtn>

          <Divider />

          {/* Font family */}
          <TSelect
            value={toolbar.fontFamily}
            options={FONT_FAMILIES}
            onChange={(v) => {
              // Apply font family via TextStyle mark
              editor.chain().focus().extendMarkRange("textStyle").setFontFamily ? editor.chain().focus().extendMarkRange("textStyle").setFontFamily(v).run() : null;
            }}
            title="Police"
          />

          {/* Font size */}
          <TSelect
            value={toolbar.fontSize}
            options={FONT_SIZES}
            onChange={(v) =>
              editor.chain().focus().setFontSize(v + "pt").run()
            }
            title="Taille"
          />

          <Divider />

          {/* Headings */}
          <TBtn
            onClick={() =>
              toolbar.heading === 1
                ? editor.chain().focus().setParagraph().run()
                : editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={toolbar.heading === 1}
            title="Titre 1"
            className="text-xs font-bold"
          >
            T1
          </TBtn>
          <TBtn
            onClick={() =>
              toolbar.heading === 2
                ? editor.chain().focus().setParagraph().run()
                : editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={toolbar.heading === 2}
            title="Titre 2"
            className="text-xs font-bold"
          >
            T2
          </TBtn>
          <TBtn
            onClick={() =>
              toolbar.heading === 3
                ? editor.chain().focus().setParagraph().run()
                : editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={toolbar.heading === 3}
            title="Titre 3"
            className="text-xs font-bold"
          >
            T3
          </TBtn>

          <Divider />

          {/* Formatting */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={toolbar.bold}
            title="Gras (Ctrl+B)"
          >
            <strong>B</strong>
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={toolbar.italic}
            title="Italique (Ctrl+I)"
          >
            <em>I</em>
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={toolbar.underline}
            title="Souligné (Ctrl+U)"
          >
            <u className="text-xs">U</u>
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={toolbar.strike}
            title="Barré"
          >
            <s className="text-xs">S</s>
          </TBtn>

          <Divider />

          {/* Text color */}
          <label
            title="Couleur du texte"
            className="relative w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer"
          >
            <span className="text-xs font-bold border-b-2 border-current">A</span>
            <input
              type="color"
              value={toolbar.textColor}
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          {/* Highlight */}
          <label
            title="Surlignage"
            className="relative w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer"
          >
            <span className="text-xs px-0.5 rounded font-bold" style={{ backgroundColor: "#fef08a", color: "#854d0e" }}>H</span>
            <input
              type="color"
              defaultValue="#fef08a"
              onChange={(e) =>
                editor.chain().focus().setHighlight({ color: e.target.value }).run()
              }
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          <Divider />

          {/* Alignment */}
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={toolbar.alignment === "left"}
            title="Aligner à gauche"
          >
            ⫷
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={toolbar.alignment === "center"}
            title="Centrer"
          >
            ⫿
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={toolbar.alignment === "right"}
            title="Aligner à droite"
          >
            ⫸
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={toolbar.alignment === "justify"}
            title="Justifier"
          >
            ⊞
          </TBtn>

          <Divider />

          {/* Lists */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={toolbar.bulletList}
            title="Liste à puces"
          >
            •≡
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={toolbar.orderedList}
            title="Liste numérotée"
          >
            1≡
          </TBtn>

          <Divider />

          {/* Insert */}
          <TBtn
            onClick={() => {
              const url = window.prompt("URL du lien:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={toolbar.link}
            title="Insérer un lien"
          >
            🔗
          </TBtn>
          <TBtn
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = async () => {
                const file = input.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    editor
                      .chain()
                      .focus()
                      .setImage({ src: reader.result as string })
                      .run();
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            title="Insérer une image"
          >
            🖼️
          </TBtn>
          <TBtn
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Insérer un tableau"
          >
            ⊞
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Ligne séparatrice"
          >
            ―
          </TBtn>

          <Divider />

          {/* Clear formatting */}
          <TBtn
            onClick={() => {
              editor.chain().focus().clearNodes().run();
              editor.chain().focus().unsetAllMarks().run();
            }}
            title="Effacer la mise en forme"
          >
            ✕
          </TBtn>
        </div>
      )}

      {/* ── Ruler ── */}
      {!readOnly && <Ruler zoom={zoom} />}

      {/* ── Document Area ── */}
      <div className="flex-1 overflow-auto bg-muted/5 p-4">
        <div
          className="mx-auto bg-white shadow-lg rounded-sm"
          style={{
            width: `${(210 * zoom) / 100}mm`,
            maxWidth: "100%",
            minHeight: `${(297 * zoom) / 100}mm`,
            padding: `${(20 * zoom) / 100}mm`,
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {/* Page break indicator */}
        <div className="text-center py-2 text-xs text-muted-foreground">
          — Fin du document —
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="border-t bg-card px-4 py-1 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span>
            {editor.storage.characterCount?.words?.() || 0} mots ·{" "}
            {editor.storage.characterCount?.characters?.() || 0} caractères
          </span>
          <span>Page 1 sur {pageCount}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="px-1 hover:bg-muted rounded"
          >
            −
          </button>
          <span className="w-10 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="px-1 hover:bg-muted rounded"
          >
            +
          </button>
          <Divider />
          <span>Ctrl+S pour sauvegarder</span>
        </div>
      </div>
    </div>
  );
}
