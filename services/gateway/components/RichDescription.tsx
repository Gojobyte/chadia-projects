// =====================================================================
// RichDescription — rendu structuré d'une description en texte brut
// =====================================================================
// Le texte d'entrée peut contenir :
// - des paragraphes séparés par doubles sauts de ligne
// - des listes ("- ", "• ", "* ", "1) ", "1. ")
// - des labels typographiques ("Pays : Tchad", "Émis le : 24 avril")
// - des URLs et emails à transformer en liens cliquables
// - des lignes courtes en MAJUSCULES qui sont en réalité des titres
//
// Ce composant transforme tout ça en JSX propre sans dépendre d'un parser
// HTML. C'est un Server Component (rendu côté serveur, zéro JS client).

import React from "react";

interface Props {
  text: string | null | undefined;
  emptyMessage?: string;
}

// Regex utilitaires
const URL_RE = /(https?:\/\/[^\s<>")]+)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const LIST_LINE_RE = /^\s*(?:[-•*–—]|(?:\d{1,2})[.)])\s+(.+)$/;
const LABEL_RE = /^([A-ZÀ-ÖØ-Þ][\wÀ-ÿ'’ ]{2,40}?)\s*:\s+(.+)$/;
const TITLE_LINE_RE = /^[A-ZÀ-ÖØ-Þ0-9'’,. \-/–—°()«»]{6,}$/;

// Détection « ligne en MAJUSCULES = titre » : on exige au moins 60% de
// caractères en majuscules sur la ligne pour éviter de classer une phrase
// normale comportant un sigle (« USAID », « UE »).
function isLikelyTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!TITLE_LINE_RE.test(trimmed)) return false;
  if (trimmed.length < 6 || trimmed.length > 90) return false;
  const letters = trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? [];
  if (letters.length < 4) return false;
  const upper = letters.filter((c) => c === c.toUpperCase()).length;
  return upper / letters.length >= 0.6;
}

// Linkify : URLs + emails en liens cliquables. Retourne un tableau de
// nœuds React (chaînes + <a>) à insérer dans un parent.
function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const merged = new RegExp(`${URL_RE.source}|${EMAIL_RE.source}`, "g");
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = merged.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const isEmail = m[0].includes("@") && !m[0].startsWith("http");
    parts.push(
      <a
        key={`${keyPrefix}-${i++}`}
        href={isEmail ? `mailto:${m[0]}` : m[0]}
        target={isEmail ? undefined : "_blank"}
        rel={isEmail ? undefined : "noreferrer noopener"}
        style={{ color: "var(--color-terracotta)", textDecoration: "underline", textUnderlineOffset: 2 }}
      >
        {m[0]}
      </a>,
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : [text];
}

// Rendu d'une ligne unique (paragraphe ou item de liste).
function renderLine(line: string, key: string): React.ReactNode {
  const labelMatch = line.match(LABEL_RE);
  if (labelMatch) {
    const [, label, value] = labelMatch;
    return (
      <span key={key}>
        <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{label} :</strong>{" "}
        {linkify(value, `${key}-v`)}
      </span>
    );
  }
  return <React.Fragment key={key}>{linkify(line, `${key}-t`)}</React.Fragment>;
}

export function RichDescription({ text, emptyMessage = "Aucune description disponible." }: Props) {
  if (!text || !text.trim()) {
    return (
      <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--color-shale)", fontStyle: "italic" }}>
        {emptyMessage}
      </p>
    );
  }

  // 1) Découpe en "blocs" séparés par doubles sauts de ligne
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.replace(/\r/g, "").trim())
    .filter(Boolean);

  // 2) Pour chaque bloc, on regroupe les lignes qui forment une liste
  type Block =
    | { kind: "title"; line: string }
    | { kind: "paragraph"; lines: string[] }
    | { kind: "list"; items: string[] };

  const parsed: Block[] = [];

  for (const block of blocks) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Bloc d'une seule ligne courte en MAJUSCULES → titre
    if (lines.length === 1 && isLikelyTitleLine(lines[0])) {
      parsed.push({ kind: "title", line: lines[0] });
      continue;
    }

    // Si TOUTES les lignes sont des items de liste → liste
    const listItems = lines.map((l) => l.match(LIST_LINE_RE)?.[1]);
    if (listItems.every((it) => !!it)) {
      parsed.push({ kind: "list", items: listItems as string[] });
      continue;
    }

    // Sinon : regroupage paragraphe / liste imbriquée
    let currentList: string[] = [];
    const paragraphLines: string[] = [];

    const flushList = () => {
      if (currentList.length) {
        parsed.push({ kind: "list", items: currentList });
        currentList = [];
      }
    };
    const flushParagraph = () => {
      if (paragraphLines.length) {
        parsed.push({ kind: "paragraph", lines: [...paragraphLines] });
        paragraphLines.length = 0;
      }
    };

    for (const line of lines) {
      const itemMatch = line.match(LIST_LINE_RE);
      if (itemMatch) {
        flushParagraph();
        currentList.push(itemMatch[1]);
      } else {
        flushList();
        paragraphLines.push(line);
      }
    }
    flushList();
    flushParagraph();
  }

  return (
    <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.75, color: "var(--color-ink)" }}>
      {parsed.map((block, i) => {
        if (block.kind === "title") {
          return (
            <h4
              key={`b-${i}`}
              style={{
                margin: i === 0 ? "0 0 12px" : "22px 0 8px",
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-terracotta)",
                textTransform: "none",
                letterSpacing: "0.02em",
              }}
            >
              {block.line}
            </h4>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={`b-${i}`} style={{ margin: "0 0 14px", paddingLeft: 22 }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: 6 }}>
                  {renderLine(item, `b-${i}-l-${j}`)}
                </li>
              ))}
            </ul>
          );
        }
        // paragraphe : chaque ligne séparée par un <br />
        return (
          <p key={`b-${i}`} style={{ margin: "0 0 14px" }}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>
                {renderLine(line, `b-${i}-l-${j}`)}
                {j < block.lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
