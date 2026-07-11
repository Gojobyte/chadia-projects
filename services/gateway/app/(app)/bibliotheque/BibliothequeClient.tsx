"use client";

import { useState, useCallback, type ReactNode } from "react";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface DocLike {
  id: string;
  nom: string;
  mimeType?: string | null;
  taille?: number | null;
  originalName?: string | null;
}

interface Props {
  /** Liste de tous les documents indexés par id pour résolution rapide */
  docsMap: Record<string, DocLike>;
  children: ReactNode;
}

/**
 * Wrapper client qui intercepte les clics sur n'importe quel <a> ou <button>
 * porteur de `data-doc-id="..."` à l'intérieur, et ouvre le modal de preview
 * au lieu de naviguer.
 *
 * On utilise la délégation d'événements plutôt qu'un onClick par ligne pour
 * garder la page bibliothèque (Server Component) telle qu'elle est — on ne
 * fait que rajouter des attributs `data-doc-id` sur ses liens.
 */
export function BibliothequeClient({ docsMap, children }: Props) {
  const [previewDoc, setPreviewDoc] = useState<DocLike | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Cherche le plus proche ancêtre qui a data-doc-id (lien ou bouton)
      const target = e.target as HTMLElement;
      const trigger = target.closest<HTMLElement>("[data-doc-id]");
      if (!trigger) return;

      // Si l'utilisateur fait Cmd/Ctrl-clic ou clic milieu, on laisse le
      // comportement natif (nouvel onglet) — pratique courante.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;

      const id = trigger.getAttribute("data-doc-id");
      if (!id) return;
      const doc = docsMap[id];
      if (!doc) return;

      e.preventDefault();
      setPreviewDoc(doc);
    },
    [docsMap],
  );

  return (
    <div onClick={handleClick}>
      {children}
      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
