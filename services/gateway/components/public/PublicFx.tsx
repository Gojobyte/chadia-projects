"use client";

import { useEffect } from "react";

/**
 * Effets dynamiques du site public — compteurs animés.
 *
 * Anime le premier nombre de chaque `.counter .v` (de 0 vers sa valeur)
 * quand la bande de chiffres entre dans le viewport. Zéro dépendance,
 * ne touche pas au HTML servi (SEO intact) et respecte
 * `prefers-reduced-motion`.
 */
export function PublicFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const values = document.querySelectorAll<HTMLElement>(".pub .counter .v");
    if (values.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          countUp(entry.target as HTMLElement);
        }
      },
      { threshold: 0.5 }
    );
    values.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}

function countUp(el: HTMLElement) {
  // Seul le nœud texte est animé — le <em> (unité : km, %, M FCFA)
  // reste intact.
  const node = Array.from(el.childNodes).find(
    (n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent ?? "")
  );
  if (!node) return;

  const original = node.textContent ?? "";
  // Gère « 145 », « +250 », « 1,9 » (décimale française).
  const match = original.match(/([+]?)(\d+(?:,\d+)?)/);
  if (!match) return;

  const decimals = match[2].includes(",") ? match[2].split(",")[1].length : 0;
  const target = parseFloat(match[2].replace(",", "."));
  const duration = 1400;
  const start = performance.now();

  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4); // décélération douce
    const value = (target * eased).toFixed(decimals).replace(".", ",");
    node.textContent = original.replace(match[0], match[1] + value);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
