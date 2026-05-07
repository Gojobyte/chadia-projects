"use client";

import { useState, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlockEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function BlockEditor({
  content = "",
  onChange,
  readOnly = false,
  placeholder = "Commencez à écrire...",
}: BlockEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  const ToolbarButton = useCallback(
    ({
      onClick,
      active,
      children,
      title,
    }: {
      onClick: () => void;
      active?: boolean;
      children: React.ReactNode;
      title: string;
    }) => (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
          "p-1.5 rounded text-sm transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        {children}
      </button>
    ),
    []
  );

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isFocused ? "border-primary ring-1 ring-primary/20" : "border-border"
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
          {/* Text formatting */}
          <div className="flex gap-0.5 pr-2 border-r">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Gras (Ctrl+B)"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italique (Ctrl+I)"
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Barré"
            >
              <s>S</s>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
              title="Code"
            >
              {"</>"}
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex gap-0.5 pr-2 border-r">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
              title="Titre 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              title="Titre 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
              title="Titre 3"
            >
              H3
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex gap-0.5 pr-2 border-r">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Liste à puces"
            >
              • Liste
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Liste numérotée"
            >
              1. Liste
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Citation"
            >
              ❝
            </ToolbarButton>
          </div>

          {/* Link & Image */}
          <div className="flex gap-0.5">
            <ToolbarButton
              onClick={() => {
                const url = window.prompt("URL du lien:");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              active={editor.isActive("link")}
              title="Lien"
            >
              🔗
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt("URL de l'image:");
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
              title="Image"
            >
              🖼️
            </ToolbarButton>
          </div>
        </div>
      )}

      <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
