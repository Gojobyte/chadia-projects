export interface HistoryEvent {
  /** Libellé court (ex: "Candidature créée") */
  label: string;
  /** Détail facultatif (ex: "par Aïssatou S.") */
  detail?: string | null;
  /** Date ISO (ou null si pas encore arrivé) */
  date: string | null;
  /** Type pour l'icône et la couleur */
  kind?: "create" | "draft" | "validate" | "submit" | "awarded" | "rejected" | "abandon" | "info";
}

interface Props {
  events: HistoryEvent[];
  /** Statut courant pour mettre en évidence l'étape active */
  currentStatut?: string;
}

const KIND_ICON: Record<string, string> = {
  create: "ph-flag",
  draft: "ph-pencil-simple",
  validate: "ph-eye",
  submit: "ph-paper-plane-tilt",
  awarded: "ph-trophy",
  rejected: "ph-x-circle",
  abandon: "ph-circle-dashed",
  info: "ph-info",
};

const KIND_COLOR: Record<string, string> = {
  create: "var(--color-shale)",
  draft: "var(--color-terracotta)",
  validate: "var(--color-warning)",
  submit: "var(--color-info)",
  awarded: "var(--color-success)",
  rejected: "var(--color-danger)",
  abandon: "var(--color-mineral)",
  info: "var(--color-stone)",
};

/**
 * Panel "Historique" qui affiche la timeline des changements de statut
 * + dates clés (création, dépôt prévu, dépôt effectif, résultat).
 *
 * Pour la V1, on dérive les événements des champs de la candidature.
 * Une vraie table AuditLog viendra dans une itération suivante pour
 * tracer qui a fait quoi quand.
 */
export function StatutHistorique({ events, currentStatut }: Props) {
  const sorted = [...events]
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  const planned = events.filter((e) => !e.date);

  if (sorted.length === 0 && planned.length === 0) return null;

  return (
    <section className="historique">
      <header className="hist-h">
        <div className="hist-eb">Historique · changements de statut</div>
        <h3 className="hist-t">
          {sorted.length} événement{sorted.length > 1 ? "s" : ""}
          {currentStatut ? <> · statut actuel <strong>{currentStatut}</strong></> : null}
        </h3>
      </header>

      <ul className="hist-list">
        {sorted.map((e, i) => {
          const icon = KIND_ICON[e.kind || "info"];
          const color = KIND_COLOR[e.kind || "info"];
          return (
            <li key={`${e.label}-${i}`} className="hist-event">
              <span className="hist-icon" style={{ background: color }}>
                <i className={`ph-fill ${icon}`} aria-hidden="true"></i>
              </span>
              <div className="hist-body">
                <div className="hist-label">{e.label}</div>
                {e.detail ? <div className="hist-detail">{e.detail}</div> : null}
              </div>
              <time className="hist-date">
                {new Date(e.date!).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {" · "}
                {new Date(e.date!).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          );
        })}
        {planned.map((e, i) => (
          <li key={`planned-${i}`} className="hist-event planned">
            <span className="hist-icon" style={{ background: "var(--color-mineral)" }}>
              <i className="ph ph-clock" aria-hidden="true"></i>
            </span>
            <div className="hist-body">
              <div className="hist-label">{e.label}</div>
              {e.detail ? <div className="hist-detail">{e.detail}</div> : null}
            </div>
            <time className="hist-date">à venir</time>
          </li>
        ))}
      </ul>

      <style>{`
        .historique {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 16px 18px;
          margin-top: 14px;
        }
        .hist-h {
          margin-bottom: 12px;
        }
        .hist-eb {
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--color-stone);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .hist-t {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 400;
          color: var(--color-ink);
          margin: 0;
        }
        .hist-t strong {
          color: var(--color-terracotta);
          font-weight: 500;
          font-family: var(--font-sans);
          font-size: 13px;
          padding: 2px 8px;
          background: var(--color-terracotta-soft);
          border-radius: 999px;
        }
        .hist-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hist-event {
          display: grid;
          grid-template-columns: 28px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          background: var(--color-page);
          border: 1px solid var(--color-line);
        }
        .hist-event.planned {
          background: transparent;
          border-style: dashed;
          opacity: 0.7;
        }
        .hist-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 14px;
          flex-shrink: 0;
        }
        .hist-body {
          min-width: 0;
        }
        .hist-label {
          font-size: 13px;
          color: var(--color-ink);
          font-weight: 500;
          line-height: 1.3;
        }
        .hist-detail {
          font-size: 11px;
          color: var(--color-stone);
          margin-top: 2px;
          line-height: 1.4;
        }
        .hist-date {
          font-size: 11px;
          color: var(--color-stone);
          font-family: var(--font-mono);
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
