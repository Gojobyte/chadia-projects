"use client";

import { useEffect, type RefObject } from "react";

/**
 * Ferme un élément (menu, dropdown, popover) au clic en dehors OU à la
 * touche Escape. Mutualisé pour éviter de réécrire ce pattern dans chaque
 * composant. Sprint 2 a11y — résout l'incohérence entre WorkflowStepper
 * (onMouseLeave non-clavier) et DocsWorkspace (mousedown ad-hoc).
 *
 * Utilisation :
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutsideAndEscape(ref, isOpen, () => setOpen(false));
 *   return <div ref={ref}>...</div>;
 */
export function useClickOutsideAndEscape<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, onClose, ref]);
}
