"use client";

import { useEffect, useRef, useId, type ReactNode } from "react";

interface Props {
  /** Si false, ne rend rien (équivalent au "open && <Modal/>") */
  open: boolean;
  /** Appelé quand on demande la fermeture (Escape, clic backdrop, bouton X) */
  onClose: () => void;
  /** Titre lisible utilisé pour aria-labelledby (peut être un nom programmé) */
  title: string;
  /** Description optionnelle, mise en aria-describedby */
  description?: string;
  /** Largeur max de la modal (px) */
  maxWidth?: number;
  /** Empêche la fermeture (backdrop / Escape) — utile pendant un save en cours */
  preventClose?: boolean;
  /** Contenu du Dialog */
  children: ReactNode;
}

/**
 * Composant Dialog accessible (P0 a11y Sprint 2).
 *
 * Garantit :
 *  - role="dialog" + aria-modal="true"
 *  - aria-labelledby pointe sur un h2 contenant le title
 *  - aria-describedby si description fournie
 *  - Escape ferme (sauf preventClose)
 *  - Clic backdrop ferme (sauf preventClose)
 *  - Focus piégé dans la modal (Tab/Shift-Tab boucle)
 *  - Focus initial sur le premier élément focusable
 *  - Focus restauré sur l'élément déclencheur à la fermeture
 *  - Scroll-lock du body tant que la modal est ouverte
 *
 * Remplace les modals "à la main" qui faisaient juste position:fixed sans
 * sémantique. À utiliser pour PieceEditModal, SelectiveExportModal,
 * ScoreDetailModal et la confirm de suppression.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  maxWidth = 540,
  preventClose = false,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    // 1. Sauvegarde l'élément qui avait le focus pour le restaurer ensuite
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // 2. Lock le scroll de l'arrière-plan
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 3. Focus le premier élément focusable de la modal après mount
    const focusFirst = () => {
      const el = dialogRef.current;
      if (!el) return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length > 0) focusables[0].focus();
      else el.focus(); // fallback : focus le container
    };
    // Léger délai pour laisser le DOM se monter avant focus()
    const focusTimer = setTimeout(focusFirst, 10);

    // 4. Handler global : Escape + focus trap (Tab/Shift-Tab)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const el = dialogRef.current;
        if (!el) return;
        const focusables = Array.from(
          el.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // 5. Cleanup au démontage / fermeture
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // Restore focus sur l'élément déclencheur (si toujours dans le DOM)
      const prev = previouslyFocused.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, [open, onClose, preventClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        // Click sur le backdrop (= e.currentTarget, pas un enfant)
        if (e.target === e.currentTarget && !preventClose) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(26,22,18,0.55)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={{
          background: "var(--color-surface)",
          borderRadius: 12,
          width: "100%",
          maxWidth,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px -20px rgba(26,22,18,0.4)",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Le titre est obligatoire pour aria-labelledby — on le rend en
            visually-hidden si l'appelant veut son propre header custom.
            On laisse l'appelant écrire son header dans children pour
            la liberté de design ; ce h2 reste pour le SR. */}
        <h2
          id={titleId}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p id={descId} style={{ display: "none" }}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
