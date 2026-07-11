export interface Milestone {
  /** Libellé du jalon (ex: "Dépôt note conceptuelle") */
  label: string;
  /** Date au format ISO ou date string parsable */
  date: string | null;
  /** Type pour le style visuel */
  kind?: "deadline" | "lifecycle" | "info";
}

interface Props {
  milestones: Milestone[];
  /** Date de référence pour calculer "passé / aujourd'hui / à venir" */
  now?: Date;
}

/**
 * Timeline horizontale qui visualise les échéances du dossier.
 * - Jalons passés : grisés
 * - Jalon courant (J-7 ou moins) : terracotta
 * - Jalons futurs : bleu
 * - Jalons sans date : en bas (réserve)
 *
 * Aide l'utilisateur à voir d'un coup d'œil la pression temporelle de
 * son dossier (P1-32 de l'audit).
 */
export function MilestonesTimeline({ milestones, now = new Date() }: Props) {
  // Server Component pur — pas besoin de useMemo, le composant n'est rendu
  // qu'une fois par requête côté serveur.
  const items = milestones
    .map((m) => {
      const d = m.date ? new Date(m.date) : null;
      if (d && Number.isNaN(d.getTime())) return { ...m, parsedDate: null };
      return { ...m, parsedDate: d };
    })
    .filter((m) => m.label);

  items.sort((a, b) => {
    if (!a.parsedDate && !b.parsedDate) return 0;
    if (!a.parsedDate) return 1;
    if (!b.parsedDate) return -1;
    return a.parsedDate.getTime() - b.parsedDate.getTime();
  });

  const enriched = items.map((m) => {
    const days = m.parsedDate
      ? Math.ceil((m.parsedDate.getTime() - now.getTime()) / (24 * 3600 * 1000))
      : null;
    let state: "past" | "imminent" | "future" | "unknown" = "unknown";
    if (days !== null) {
      if (days < 0) state = "past";
      else if (days <= 7) state = "imminent";
      else state = "future";
    }
    return { ...m, days, state };
  });

  if (enriched.length === 0) return null;

  return (
    <section className="milestones">
      <header className="milestones-h">
        <div>
          <div className="milestones-eb">Calendrier · jalons clés</div>
          <h3 className="milestones-t">
            {enriched.length} échéance{enriched.length > 1 ? "s" : ""}
            {enriched.some((m) => m.state === "imminent")
              ? " · attention aux dates urgentes"
              : ""}
          </h3>
        </div>
        <div className="milestones-legend">
          <span className="leg past">passé</span>
          <span className="leg imminent">imminent</span>
          <span className="leg future">à venir</span>
        </div>
      </header>

      <ol className="milestones-list">
        {enriched.map((m, i) => (
          <li key={`${m.label}-${i}`} className={`milestone ${m.state}`}>
            <div className="dot" aria-hidden="true"></div>
            <div className="ml-content">
              <div className="ml-label">{m.label}</div>
              <div className="ml-date">
                {m.parsedDate
                  ? m.parsedDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "date à confirmer"}
              </div>
              {m.days !== null ? (
                <div className="ml-days">
                  {m.days < 0
                    ? `il y a ${Math.abs(m.days)} j`
                    : m.days === 0
                    ? "aujourd'hui"
                    : `J-${m.days}`}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <style>{`
        .milestones {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 16px 18px;
          margin-bottom: 18px;
        }
        .milestones-h {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .milestones-eb {
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--color-stone);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .milestones-t {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 400;
          color: var(--color-ink);
          margin: 0;
          line-height: 1.2;
        }
        .milestones-legend {
          display: flex;
          gap: 12px;
          font-size: 10px;
          color: var(--color-stone);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
        .milestones-legend .leg {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .milestones-legend .leg::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .milestones-legend .past::before { background: var(--color-mineral); }
        .milestones-legend .imminent::before { background: var(--color-terracotta); }
        .milestones-legend .future::before { background: var(--color-info); }

        .milestones-list {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 0;
          margin: 0;
          list-style: none;
          position: relative;
        }
        .milestones-list::before {
          content: "";
          position: absolute;
          top: 11px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-line);
          pointer-events: none;
        }

        .milestone {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          min-width: 140px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          padding-top: 4px;
        }
        .milestone .dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-canvas);
          border: 2px solid var(--color-line-strong);
          margin-bottom: 4px;
        }
        .milestone.past .dot {
          background: var(--color-mineral);
          border-color: var(--color-mineral);
        }
        .milestone.imminent .dot {
          background: var(--color-terracotta);
          border-color: var(--color-terracotta);
          box-shadow: 0 0 0 3px var(--color-terracotta-soft);
        }
        .milestone.future .dot {
          background: var(--color-info);
          border-color: var(--color-info);
        }
        .ml-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ml-label {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--color-ink);
          line-height: 1.3;
        }
        .milestone.past .ml-label {
          color: var(--color-stone);
          text-decoration: line-through;
          text-decoration-color: var(--color-mineral);
        }
        .ml-date {
          font-size: 11px;
          color: var(--color-stone);
          font-family: var(--font-mono);
        }
        .ml-days {
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 3px;
          align-self: flex-start;
          margin-top: 2px;
        }
        .milestone.past .ml-days {
          background: var(--color-canvas);
          color: var(--color-stone);
        }
        .milestone.imminent .ml-days {
          background: var(--color-terracotta);
          color: #fff;
        }
        .milestone.future .ml-days {
          background: var(--color-info-soft);
          color: var(--color-info);
        }
      `}</style>
    </section>
  );
}
