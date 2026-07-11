"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
}

interface Options<T> {
  /** Valeur à sauvegarder (généralement le HTML édité) */
  value: T;
  /** Callback async appelé après le debounce. Doit throw en cas d'erreur. */
  onSave: (value: T) => Promise<void>;
  /** Délai après la dernière modification avant de sauver. 1500ms par défaut. */
  delay?: number;
  /** Désactive l'autosave (ex : mode lecture seule) */
  disabled?: boolean;
  /** Quand cette clé change, on saute le prochain autosave (utile au montage
   *  ou au changement de pièce pour éviter de sauver la valeur initiale). */
  skipKey?: string | number;
  /** Timestamp de la dernière sauvegarde côté serveur. Affiché tant qu'aucun
   *  save local n'a eu lieu — sinon écrasé par le timestamp du save local. */
  initialLastSavedAt?: Date | null;
}

/**
 * Autosave debouncé.
 *
 * Politique :
 *  - Premier render : `status = "idle"`, AUCUN save (skipKey évite le save initial).
 *  - Changement de `value` → `status = "saving"` après `delay` ms.
 *  - Callback résolu → `status = "saved"`, `lastSavedAt = now`.
 *  - Callback rejeté → `status = "error"`, `error` rempli.
 *  - Changement de `skipKey` → reset timer + saut du save courant (pour
 *    quand on change de pièce, on ne veut pas resave l'ancienne).
 *  - Au démontage : on annule le timer (le save en cours n'est pas annulé).
 *
 * Retourne aussi `flush()` pour forcer un save immédiat (utile pour
 * sauver avant de naviguer).
 */
export function useAutosave<T>({
  value,
  onSave,
  delay = 1500,
  disabled = false,
  skipKey,
  initialLastSavedAt = null,
}: Options<T>): AutosaveState & { flush: (override?: T) => Promise<void> } {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initialLastSavedAt);
  const [error, setError] = useState<string | null>(null);

  // Refs pour éviter les closures stales dans les timers
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const valueRef = useRef(value);
  const skipKeyRef = useRef(skipKey);
  // Évite de saver la toute première valeur (état initial venant du serveur)
  const initialSkipRef = useRef(true);

  // Garde les refs à jour
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Note : on accepte un override explicite pour éviter une race au moment
  // d'un switch de pièce. Le caller capture (value) AVANT setSelectedId puis
  // passe ces valeurs ici — sinon valueRef.current peut déjà refléter la
  // NOUVELLE pièce et on sauve son contenu sur l'ID en cours de changement.
  const doSave = useCallback(async (override?: T) => {
    setStatus("saving");
    setError(null);
    try {
      const v = override !== undefined ? override : valueRef.current;
      await onSaveRef.current(v);
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    }
  }, []);

  const flush = useCallback(async (override?: T) => {
    // Respecte disabled : un user en lecture seule ne doit pas déclencher
    // de save fantôme via flush() depuis le parent.
    if (disabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave(override);
  }, [doSave, disabled]);

  // Reset quand skipKey change (changement de pièce) — on saute le save initial
  // et on remet lastSavedAt au timestamp serveur de la nouvelle pièce
  // (si fourni via initialLastSavedAt).
  useEffect(() => {
    skipKeyRef.current = skipKey;
    initialSkipRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("idle");
    setError(null);
    setLastSavedAt(initialLastSavedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipKey]);

  // Trigger debounced save quand value change
  useEffect(() => {
    if (disabled) return;
    if (initialSkipRef.current) {
      // Première fois qu'on voit cette valeur — c'est l'init, on ne save pas
      initialSkipRef.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      doSave();
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, disabled, doSave]);

  return { status, lastSavedAt, error, flush };
}

/** Helper pour afficher un libellé relatif "il y a Xs/Xmin" */
export function formatRelative(date: Date | null): string {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "à l'instant";
  if (diff < 60) return `il y a ${diff} s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
