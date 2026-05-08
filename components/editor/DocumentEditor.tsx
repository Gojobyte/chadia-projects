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
import FontFamilyExt from "@tiptap/extension-font-family";
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
  paragraphStyle: ParagraphStyle;
}

type ParagraphStyle =
  | "normal"
  | "titre1"
  | "titre2"
  | "titre3"
  | "sous-titre"
  | "citation"
  | "code-block";

const PARAGRAPH_STYLE_OPTIONS: { value: ParagraphStyle; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "titre1", label: "Titre 1" },
  { value: "titre2", label: "Titre 2" },
  { value: "titre3", label: "Titre 3" },
  { value: "sous-titre", label: "Sous-titre" },
  { value: "citation", label: "Citation" },
  { value: "code-block", label: "Code" },
];

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
  paragraphStyle: "normal",
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
          <div key={i} className="absolute bottom-0" style={{ left: `${t.pos * 24}px` }}>
            <div className={cn("w-px bg-muted-foreground/40", t.major ? "h-2.5" : "h-1.5")} />
            {t.major && t.label && (
              <span className="absolute -top-0.5 left-0.5 text-[7px] text-muted-foreground">{t.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Context Menu ─── */

function ContextMenu({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = editor.view.dom;
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY + 10 });
      setShow(true);
    };
    const onClick = () => setShow(false);
    el.addEventListener("contextmenu", onContext);
    document.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("contextmenu", onContext);
      document.removeEventListener("click", onClick);
    };
  }, [editor]);

  if (!show || !pos) return null;

  const items = [
    { label: "Couper", action: () => { document.execCommand("cut"); setShow(false); } },
    { label: "Copier", action: () => { document.execCommand("copy"); setShow(false); } },
    { label: "Coller", action: () => { document.execCommand("paste"); setShow(false); } },
    { label: "separator" as string, action: null },
    { label: "Effacer la mise en forme", action: () => { editor.chain().focus().clearNodes().unsetAllMarks().run(); setShow(false); } },
  ];

  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-lg border bg-card shadow-xl py-1"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={e => e.preventDefault()}
      onClick={() => setShow(false)}
    >
      {items.map((item, i) =>
        item.action === null ? (
          <div key={i} className="h-px bg-border my-1" />
        ) : (
          <button
            key={i}
            onMouseDown={e => { e.preventDefault(); item.action(); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ─── Find & Replace Bar ─── */

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [showReplace, setShowReplace] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Simple find using window.find API
  const updateMatches = useCallback(
    (text: string) => {
      if (!text) {
        setMatchCount(0);
        setActiveIndex(0);
        return;
      }
      // Count matches in text content
      const editorEl = editor.view.dom;
      const textContent = editorEl.textContent || "";
      const searchLower = text.toLowerCase();
      const textLower = textContent.toLowerCase();
      let count = 0;
      let idx = 0;
      while ((idx = textLower.indexOf(searchLower, idx)) !== -1) {
        count++;
        idx += text.length;
      }
      setMatchCount(count);
      setActiveIndex(0);
    },
    [editor],
  );

  const findText = useCallback(
    (text: string, reverse: boolean = false) => {
      if (!text) return;
      // Use built-in browser find (not in TS types but works in browsers)
      try {
        const w = window as unknown as { find: (text: string, caseSensitive: boolean, backwards: boolean, wrapAround: boolean, wholeWord: boolean, searchInFrames: boolean, showDialog: boolean) => boolean };
        const found = w.find(text, false, reverse, false, false, true, false);
        if (!found) {
          w.find(text, false, reverse, true, false, true, false);
        }
      } catch {
        // window.find not supported
      }
    },
    [],
  );

  const replaceText = useCallback(
    (search: string, replace: string) => {
      if (!search || !replace) return;
      const { state } = editor.view;
      const { doc } = state;
      const matches: { from: number; to: number }[] = [];
      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const searchLower = search.toLowerCase();
          const textLower = node.text.toLowerCase();
          let startIndex = 0;
          let idx = textLower.indexOf(searchLower, startIndex);
          while (idx !== -1) {
            matches.push({ from: pos + idx, to: pos + idx + search.length });
            startIndex = idx + search.length;
            idx = textLower.indexOf(searchLower, startIndex);
          }
        }
      });
      if (activeIndex >= 0 && activeIndex < matches.length) {
        const match = matches[activeIndex];
        const tr = state.tr.replaceWith(
          match.from, match.to,
          state.schema.text(replace)
        );
        editor.view.dispatch(tr);
      }
    },
    [editor, activeIndex],
  );

  const replaceAllText = useCallback(
    (search: string, replace: string) => {
      if (!search || !replace) return;
      const { state } = editor.view;
      const { doc } = state;
      const matches: { from: number; to: number }[] = [];
      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const searchLower = search.toLowerCase();
          const textLower = node.text.toLowerCase();
          let startIndex = 0;
          let idx = textLower.indexOf(searchLower, startIndex);
          while (idx !== -1) {
            matches.push({ from: pos + idx, to: pos + idx + search.length });
            startIndex = idx + search.length;
            idx = textLower.indexOf(searchLower, startIndex);
          }
        }
      });
      let tr = state.tr;
      [...matches].reverse().forEach((match) => {
        tr = tr.replaceWith(match.from, match.to, state.schema.text(replace));
      });
      editor.view.dispatch(tr);
      setMatchCount(0);
    },
    [editor],
  );

  const handleFindChange = useCallback(
    (text: string) => {
      setSearchText(text);
      updateMatches(text);
      if (text) findText(text);
    },
    [updateMatches, findText],
  );

  const goToNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = (activeIndex + 1) % matchCount;
    setActiveIndex(next);
    findText(searchText);
  }, [matchCount, activeIndex, searchText, findText]);

  const goToPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = (activeIndex - 1 + matchCount) % matchCount;
    setActiveIndex(prev);
    findText(searchText, true);
  }, [matchCount, activeIndex, searchText, findText]);

  const replaceOne = useCallback(() => {
    replaceText(searchText, replaceValue);
    setTimeout(() => updateMatches(searchText), 50);
  }, [searchText, replaceValue, replaceText, updateMatches]);

  const replaceAllFn = useCallback(() => {
    replaceAllText(searchText, replaceValue);
    setSearchText("");
  }, [searchText, replaceValue, replaceAllText]);

  const toggleReplace = useCallback(() => {
    setShowReplace((prev) => {
      const next = !prev;
      if (next) setTimeout(() => replaceInputRef.current?.focus(), 50);
      return next;
    });
  }, []);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (document.activeElement === replaceInputRef.current) replaceOne();
        else if (e.shiftKey) goToPrev();
        else goToNext();
      }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "F3") { e.preventDefault(); e.shiftKey ? goToPrev() : goToNext(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goToNext, goToPrev, replaceOne, onClose]);

  return (
    <div className="border-t bg-card px-3 py-2 flex items-center gap-2 shrink-0 relative">
      <div className="flex items-center gap-1 flex-1">
        <input ref={findInputRef} type="text" value={searchText}
          onChange={(e) => handleFindChange(e.target.value)}
          placeholder="Rechercher..."
          className="h-7 px-2 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48" />
        <span className="text-[10px] text-muted-foreground min-w-[40px] text-center">
          {matchCount > 0 ? `${activeIndex + 1} sur ${matchCount}` : searchText ? "0 resultat" : ""}
        </span>
      </div>
      <button type="button" onClick={goToPrev} disabled={matchCount === 0} title="Precedent"
        className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", matchCount === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted")}> ▲ </button>
      <button type="button" onClick={goToNext} disabled={matchCount === 0} title="Suivant"
        className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", matchCount === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted")}> ▼ </button>
      <button type="button" onClick={toggleReplace} title="Remplacer"
        className={cn("h-6 px-2 rounded text-xs", showReplace ? "bg-primary text-primary-foreground" : "hover:bg-muted")}> Remplacer </button>
      <button type="button" onClick={onClose} title="Fermer"
        className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-muted"> x </button>
      {showReplace && (
        <div className="absolute bottom-full right-0 mb-0 border-t border-l bg-card px-3 py-2 flex items-center gap-2 rounded-tl-md shadow-lg z-50">
          <input ref={replaceInputRef} type="text" value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            placeholder="Remplacer par..."
            className="h-7 px-2 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48" />
          <button type="button" onClick={replaceOne} disabled={matchCount === 0}
            className={cn("h-6 px-2 rounded text-xs", matchCount === 0 ? "opacity-30" : "bg-primary text-primary-foreground hover:bg-primary/90")}> Remplacer </button>
          <button type="button" onClick={replaceAllFn} disabled={matchCount === 0}
            className={cn("h-6 px-2 rounded text-xs", matchCount === 0 ? "opacity-30" : "bg-destructive text-destructive-foreground hover:bg-destructive/90")}> Tout remplacer </button>
        </div>
      )}
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
  const [showFindBar, setShowFindBar] = useState(false);
  const [showReplaceInBar, setShowReplaceInBar] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // We'll handle code blocks via paragraph styles
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
      FontFamilyExt,
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

  // Ctrl+S to save, Ctrl+F to find, Ctrl+H to find & replace
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
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowFindBar(true);
        setShowReplaceInBar(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setShowFindBar(true);
        setShowReplaceInBar(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editor, onSave]);

  function updateToolbarState(e: Editor) {
    // Detect current paragraph style
    let paragraphStyle: ParagraphStyle = "normal";
    if (e.isActive("heading", { level: 1 })) paragraphStyle = "titre1";
    else if (e.isActive("heading", { level: 2 })) paragraphStyle = "titre2";
    else if (e.isActive("heading", { level: 3 })) paragraphStyle = "titre3";
    else if (e.isActive("blockquote")) paragraphStyle = "citation";
    else if (e.isActive("codeBlock")) paragraphStyle = "code-block";

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
      paragraphStyle,
    });
  }

  // Apply paragraph style
  const applyParagraphStyle = useCallback(
    (style: ParagraphStyle) => {
      if (!editor) return;

      switch (style) {
        case "normal":
          editor.chain().focus().setParagraph().run();
          break;
        case "titre1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "titre2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "titre3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "sous-titre": {
          // Apply as paragraph with italic + gray color + 12pt
          editor.chain().focus().setParagraph().run();
          editor.chain().focus().setFontSize("12pt").run();
          editor.chain().focus().toggleItalic().run();
          editor.chain().focus().setColor("#6b7280").run();
          break;
        }
        case "citation": {
          editor.chain().focus().toggleBlockquote().run();
          break;
        }
        case "code-block": {
          editor.chain().focus().toggleCodeBlock().run();
          break;
        }
      }
    },
    [editor]
  );

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

          {/* Paragraph Style Dropdown */}
          <TSelect
            value={toolbar.paragraphStyle}
            options={PARAGRAPH_STYLE_OPTIONS}
            onChange={(v) => applyParagraphStyle(v)}
            title="Style de paragraphe"
            className="min-w-[90px]"
          />

          <Divider />

          {/* Font family */}
          <TSelect
            value={toolbar.fontFamily}
            options={FONT_FAMILIES}
            onChange={(v) => {
              editor.chain().focus().setFontFamily(v).run();
            }}
            title="Police"
          />

          {/* Font size */}
          <TSelect
            value={toolbar.fontSize}
            options={FONT_SIZES}
          onChange={(v) => {
            // Apply font size via textStyle mark
            editor.chain().focus().setMark("textStyle", { fontSize: v + "pt" }).run();
          }}
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

      {/* ── Find & Replace Bar ── */}
      {showFindBar && !readOnly && (
        <FindReplaceBar
          editor={editor}
          onClose={() => setShowFindBar(false)}
        />
      )}

      {/* ── Context Menu ── */}
      <ContextMenu editor={editor} />

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
