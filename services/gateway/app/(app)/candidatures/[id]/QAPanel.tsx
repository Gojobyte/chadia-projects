"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Dialog } from "@/components/Dialog";

export type QASens = "vers_bailleur" | "vers_chadia";
export type QAStatut = "brouillon" | "pose" | "repondu";
export type QASource = "officiel" | "informel";

export interface QAItem {
  id: string;
  sens: QASens;
  question: string;
  reponse?: string;
  statut: QAStatut;
  auteurId?: string;
  dateCreation: string;
  dateReponse?: string;
  source?: QASource;
}

interface Props {
  candidatureId: string;
  initialThread: QAItem[];
  canEdit: boolean;
  /** Server Action liée : remplace tout le thread. */
  saveAction: (thread: QAItem[]) => Promise<void>;
}

const SENS_LABEL: Record<QASens, string> = {
  vers_bailleur: "Question au bailleur",
  vers_chadia: "Question du bailleur",
};

const STATUT_LABEL: Record<QAStatut, string> = {
  brouillon: "Brouillon",
  pose: "Posée",
  repondu: "Répondue",
};

const STATUT_TONE: Record<QAStatut, string> = {
  brouillon: "stone",
  pose: "warning",
  repondu: "success",
};

export function QAPanel({ candidatureId: _candidatureId, initialThread, canEdit, saveAction }: Props) {
  const [thread, setThread] = useState<QAItem[]>(initialThread);
  const [filter, setFilter] = useState<"all" | QAStatut>("all");
  const [composing, setComposing] = useState<QASens | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftSource, setDraftSource] = useState<QASource>("officiel");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Confirmation modale stylée (P0 a11y — remplace window.confirm).
  const [pendingDelete, setPendingDelete] = useState<QAItem | null>(null);

  // Resync du thread quand le parent reload (autre user ajoute une question via
  // revalidatePath). On ne resync que si l'utilisateur n'est PAS en train d'éditer
  // localement (isPending), sinon on écrase ses modifs en cours.
  const lastInitialRef = useRef<string>(JSON.stringify(initialThread));
  useEffect(() => {
    const serialized = JSON.stringify(initialThread);
    if (serialized !== lastInitialRef.current && !isPending) {
      lastInitialRef.current = serialized;
      setThread(initialThread);
    }
  }, [initialThread, isPending]);

  const filtered = filter === "all" ? thread : thread.filter((q) => q.statut === filter);
  const stats = {
    pose: thread.filter((q) => q.statut === "pose").length,
    repondu: thread.filter((q) => q.statut === "repondu").length,
    brouillon: thread.filter((q) => q.statut === "brouillon").length,
  };

  // P0-fix : persist applique un transformer pur sur le state courant
  // (setter fonctionnel pour éviter les closures stales sur clic rapide)
  // et garde une référence de l'ancien thread pour rollback en cas d'échec.
  function persist(transform: (prev: QAItem[]) => QAItem[]) {
    if (isPending) return; // évite les saves concurrents qui s'écrasent
    setError(null);
    let previous: QAItem[] = thread;
    setThread((prev) => {
      previous = prev;
      const next = transform(prev);
      // On lance le save APRÈS avoir muté le state local, dans la transition.
      startTransition(async () => {
        try {
          await saveAction(next);
        } catch (e) {
          // Rollback : on remet l'ancien thread et on affiche l'erreur.
          setThread(previous);
          setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
        }
      });
      return next;
    });
  }

  function addQuestion() {
    if (!composing || !draftQ.trim() || isPending) return;
    const item: QAItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? `qa_${crypto.randomUUID()}`
        : `qa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sens: composing,
      question: draftQ.trim(),
      statut: composing === "vers_bailleur" ? "brouillon" : "pose",
      dateCreation: new Date().toISOString(),
      source: draftSource,
    };
    persist((prev) => [...prev, item]);
    setComposing(null);
    setDraftQ("");
    setDraftSource("officiel");
  }

  function markAsPosed(id: string) {
    persist((prev) => prev.map((q) => (q.id === id ? { ...q, statut: "pose" as QAStatut } : q)));
  }

  function addReply(id: string) {
    if (!draftReply.trim() || isPending) return;
    persist((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              reponse: draftReply.trim(),
              statut: "repondu" as QAStatut,
              dateReponse: new Date().toISOString(),
            }
          : q,
      ),
    );
    setEditingId(null);
    setDraftReply("");
  }

  function removeItem(id: string) {
    persist((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <section className="qa-panel">
      <header className="qa-h">
        <div>
          <div className="qa-eb">Communication · bailleur</div>
          <h3 className="qa-t">
            Questions &amp; <em>réponses</em>
          </h3>
        </div>
        <div className="qa-counts">
          <span className="cnt"><i className="ph ph-clock" aria-hidden="true"></i> {stats.pose} en attente</span>
          <span className="cnt"><i className="ph ph-check" aria-hidden="true"></i> {stats.repondu} répondues</span>
          {stats.brouillon ? <span className="cnt"><i className="ph ph-pencil" aria-hidden="true"></i> {stats.brouillon} brouillons</span> : null}
        </div>
      </header>

      <div className="qa-actions">
        <div className="qa-filters" role="tablist">
          {([["all", "Toutes"], ["brouillon", "Brouillons"], ["pose", "Posées"], ["repondu", "Répondues"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              className={`qa-filter ${filter === k ? "on" : ""}`}
              onClick={() => setFilter(k as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
        {canEdit ? (
          <div className="qa-add">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setComposing("vers_bailleur")}
              disabled={isPending || composing !== null}
            >
              <i className="ph ph-paper-plane-tilt" aria-hidden="true"></i> Question au bailleur
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setComposing("vers_chadia")}
              title="Enregistrer une question reçue du bailleur (clarification)"
              disabled={isPending || composing !== null}
            >
              <i className="ph ph-arrow-down" aria-hidden="true"></i> Question reçue
            </button>
          </div>
        ) : null}
      </div>

      {composing && canEdit ? (
        <div className="qa-compose">
          <div className="qa-compose-h">
            <i className={`ph ${composing === "vers_bailleur" ? "ph-paper-plane-tilt" : "ph-arrow-down"}`} aria-hidden="true"></i>
            {SENS_LABEL[composing]}
          </div>
          <textarea
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder={
              composing === "vers_bailleur"
                ? "Ex : Le co-financement peut-il être valorisé en nature (matériel terrain) ?"
                : "Ex : Le bailleur demande à clarifier la composition de l'équipe..."
            }
            rows={3}
          />
          {composing === "vers_bailleur" ? (
            <div className="qa-meta-row">
              <label>
                <input
                  type="radio"
                  name="source"
                  value="officiel"
                  checked={draftSource === "officiel"}
                  onChange={() => setDraftSource("officiel")}
                />
                Canal officiel
              </label>
              <label>
                <input
                  type="radio"
                  name="source"
                  value="informel"
                  checked={draftSource === "informel"}
                  onChange={() => setDraftSource("informel")}
                />
                Échange informel
              </label>
            </div>
          ) : null}
          <div className="qa-compose-acts">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setComposing(null); setDraftQ(""); }}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={addQuestion}
              disabled={!draftQ.trim() || isPending}
            >
              {isPending ? "Enregistrement…" : composing === "vers_bailleur" ? "Enregistrer en brouillon" : "Enregistrer la question reçue"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="qa-error">
          <i className="ph ph-warning-circle" aria-hidden="true"></i> {error}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="qa-empty">
          <i className="ph ph-chats" aria-hidden="true"></i>
          <p>
            {filter === "all"
              ? "Aucune question pour cette candidature."
              : `Aucune question avec le statut « ${STATUT_LABEL[filter as QAStatut]} ».`}
          </p>
          {canEdit && filter === "all" ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setComposing("vers_bailleur")}
            >
              Poser la première question
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="qa-list">
          {filtered.map((q) => (
            <li key={q.id} className={`qa-item ${q.statut} ${q.sens}`}>
              <div className="qa-item-h">
                <span className={`qa-chip qa-chip--${q.sens}`}>
                  <i className={`ph ${q.sens === "vers_bailleur" ? "ph-paper-plane-tilt" : "ph-arrow-down"}`} aria-hidden="true"></i>
                  {SENS_LABEL[q.sens]}
                </span>
                <span className={`qa-status qa-status--${STATUT_TONE[q.statut]}`}>{STATUT_LABEL[q.statut]}</span>
                {q.source ? <span className="qa-src">{q.source}</span> : null}
                <span className="qa-date">{formatDate(q.dateCreation)}</span>
                {canEdit ? (
                  <button
                    type="button"
                    className="qa-del"
                    onClick={() => setPendingDelete(q)}
                    title="Supprimer"
                    aria-label="Supprimer cette question"
                  >
                    <i className="ph ph-trash" aria-hidden="true"></i>
                  </button>
                ) : null}
              </div>
              <div className="qa-q">{q.question}</div>

              {q.reponse ? (
                <div className="qa-r">
                  <div className="qa-r-h">
                    <i className="ph ph-arrow-bend-down-right" aria-hidden="true"></i>
                    Réponse {q.dateReponse ? `· ${formatDate(q.dateReponse)}` : ""}
                  </div>
                  <div>{q.reponse}</div>
                </div>
              ) : null}

              {canEdit && !q.reponse ? (
                editingId === q.id ? (
                  <div className="qa-reply">
                    <textarea
                      value={draftReply}
                      onChange={(e) => setDraftReply(e.target.value)}
                      placeholder="Saisir la réponse reçue / à donner…"
                      rows={3}
                      autoFocus
                    />
                    <div className="qa-compose-acts">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingId(null); setDraftReply(""); }}>
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="btn btn--accent btn--sm"
                        onClick={() => addReply(q.id)}
                        disabled={!draftReply.trim() || isPending}
                      >
                        {isPending ? "Enregistrement…" : "Enregistrer la réponse"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="qa-item-acts">
                    {q.statut === "brouillon" ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => markAsPosed(q.id)}>
                        <i className="ph ph-paper-plane-tilt" aria-hidden="true"></i> Marquer comme posée
                      </button>
                    ) : null}
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingId(q.id); setDraftReply(""); }}>
                      <i className="ph ph-chat-text" aria-hidden="true"></i> Ajouter la réponse
                    </button>
                  </div>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isPending ? (
        <div className="qa-pending">
          <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
          Synchronisation…
        </div>
      ) : null}

      <style jsx>{`
        .qa-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 18px 20px;
          margin-top: 16px;
        }
        .qa-h {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          margin-bottom: 12px;
        }
        .qa-eb {
          font-size: 10px; letter-spacing: 0.14em;
          color: var(--color-stone); text-transform: uppercase;
          margin-bottom: 4px;
        }
        .qa-t {
          font-family: var(--font-display);
          font-size: 18px; font-weight: 400;
          color: var(--color-ink); margin: 0;
        }
        .qa-t em { color: var(--color-terracotta); font-style: italic; }
        .qa-counts {
          display: flex; gap: 12px; flex-wrap: wrap;
          font-size: 11.5px; color: var(--color-stone);
          font-family: var(--font-mono);
        }
        .qa-counts .cnt { display: inline-flex; align-items: center; gap: 4px; }

        .qa-actions {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
          padding: 10px 0;
          border-top: 1px dashed var(--color-line);
          border-bottom: 1px dashed var(--color-line);
        }
        .qa-filters { display: flex; gap: 4px; }
        .qa-filter {
          background: transparent; border: 1px solid transparent;
          padding: 4px 10px; border-radius: 4px;
          font-size: 11.5px; color: var(--color-stone);
          cursor: pointer; font-family: inherit;
        }
        .qa-filter.on {
          background: var(--color-canvas);
          color: var(--color-ink);
          border-color: var(--color-line);
        }
        .qa-add { display: flex; gap: 6px; flex-wrap: wrap; }

        .qa-compose {
          background: var(--color-canvas);
          border: 1px dashed var(--color-line-strong);
          border-radius: 6px;
          padding: 12px 14px;
          margin-top: 10px;
        }
        .qa-compose-h {
          font-size: 11px; color: var(--color-sepia);
          letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .qa-compose textarea, .qa-reply textarea {
          width: 100%; padding: 8px 10px;
          font-family: inherit; font-size: 13px;
          color: var(--color-ink);
          background: var(--color-page);
          border: 1px solid var(--color-line);
          border-radius: 4px;
          resize: vertical; min-height: 60px;
        }
        .qa-compose textarea:focus, .qa-reply textarea:focus {
          outline: none;
          border-color: var(--color-terracotta);
          box-shadow: 0 0 0 3px var(--color-terracotta-soft);
        }
        .qa-meta-row {
          display: flex; gap: 14px; margin: 8px 0;
          font-size: 12px; color: var(--color-sepia);
        }
        .qa-meta-row label { display: inline-flex; gap: 4px; cursor: pointer; }
        .qa-compose-acts {
          display: flex; justify-content: flex-end; gap: 6px;
          margin-top: 8px;
        }

        .qa-list { list-style: none; padding: 0; margin: 14px 0 0; display: flex; flex-direction: column; gap: 10px; }
        .qa-item {
          padding: 12px 14px;
          background: var(--color-page);
          border: 1px solid var(--color-line);
          border-radius: 6px;
        }
        .qa-item.repondu { background: rgba(46, 125, 50, 0.04); border-color: rgba(46, 125, 50, 0.2); }
        .qa-item.pose { border-left: 3px solid var(--color-warning); }
        .qa-item-h {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap;
          font-size: 11px; margin-bottom: 6px;
        }
        .qa-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px;
          background: var(--color-canvas);
          border-radius: 3px;
          color: var(--color-sepia);
        }
        .qa-chip--vers_bailleur { color: var(--color-terracotta); background: var(--color-terracotta-soft); }
        .qa-status {
          padding: 2px 8px; border-radius: 3px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 10px;
        }
        .qa-status--stone { background: var(--color-canvas); color: var(--color-stone); }
        .qa-status--warning { background: rgba(237, 108, 2, 0.1); color: var(--color-warning); }
        .qa-status--success { background: rgba(46, 125, 50, 0.1); color: var(--color-success); }
        .qa-src {
          font-family: var(--font-mono);
          color: var(--color-stone);
        }
        .qa-date { color: var(--color-stone); margin-left: auto; }
        .qa-del {
          background: transparent; border: 0;
          color: var(--color-stone); cursor: pointer;
          padding: 2px 4px; font-size: 12px;
        }
        .qa-del:hover { color: var(--color-danger); }
        .qa-q {
          font-size: 13px;
          color: var(--color-ink);
          line-height: 1.5;
        }
        .qa-r {
          margin-top: 8px;
          padding: 10px 12px;
          background: var(--color-surface-2);
          border-left: 2px solid var(--color-success);
          border-radius: 0 4px 4px 0;
          font-size: 13px;
        }
        .qa-r-h {
          font-size: 11px; color: var(--color-success);
          margin-bottom: 4px;
          display: flex; align-items: center; gap: 4px;
        }

        .qa-item-acts { display: flex; gap: 6px; margin-top: 8px; }
        .qa-reply { margin-top: 8px; }

        .qa-empty {
          text-align: center;
          padding: 28px 16px;
          color: var(--color-stone);
        }
        .qa-empty i { font-size: 32px; display: block; margin-bottom: 8px; opacity: 0.6; }
        .qa-empty p { font-size: 13px; margin: 0 0 10px; }

        .qa-error {
          padding: 8px 12px; margin-top: 10px;
          background: rgba(198, 40, 40, 0.08);
          border: 1px solid rgba(198, 40, 40, 0.3);
          color: var(--color-danger);
          border-radius: 4px;
          font-size: 12px;
          display: flex; align-items: center; gap: 6px;
        }
        .qa-pending {
          font-size: 11px; color: var(--color-stone);
          margin-top: 8px;
          display: flex; align-items: center; gap: 4px;
        }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Confirmer la suppression de cette question"
        maxWidth={460}
        preventClose={isPending}
      >
        {pendingDelete ? (
          <div style={{ padding: "20px 24px" }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 400,
              color: "var(--color-ink)",
              margin: "0 0 12px",
            }}>
              Supprimer cette <em style={{ color: "var(--color-danger)", fontStyle: "italic" }}>question</em> ?
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-sepia)", lineHeight: 1.55, margin: "0 0 8px" }}>
              «&nbsp;{pendingDelete.question.length > 140 ? pendingDelete.question.slice(0, 140) + "…" : pendingDelete.question}&nbsp;»
            </p>
            <p style={{ fontSize: 12, color: "var(--color-stone)", margin: "0 0 16px" }}>
              {pendingDelete.reponse
                ? "La question ET sa réponse seront retirées. Cette action est irréversible."
                : "Cette action est irréversible."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPendingDelete(null)}
                disabled={isPending}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => {
                  const target = pendingDelete;
                  setPendingDelete(null);
                  removeItem(target.id);
                }}
                disabled={isPending}
                style={{
                  background: "var(--color-danger)",
                  color: "#fff",
                  borderColor: "var(--color-danger)",
                }}
              >
                <i className="ph ph-trash" aria-hidden="true"></i> Supprimer
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
