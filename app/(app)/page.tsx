import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function daysUntil(date: Date): number { return Math.ceil((date.getTime() - Date.now()) / 864e5); }

function fmtMoney(n: number, cur = "EUR"): string {
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${sym}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusLabels: Record<string, string> = {
  BROUILLON: "Brouillon", EN_COURS: "Rédaction", EN_REVISION: "Relecture",
  SOUMIS: "Soumis", ACCEPTE: "Accepté", REJETE: "Rejeté",
  REDACTION: "Rédaction", RELECTURE: "Relecture", VALIDATION: "Validation",
  FINALISATION: "Finalisation",
};
const statusKeys: Record<string, string> = {
  BROUILLON: "brouillon", EN_COURS: "redaction", EN_REVISION: "relecture",
  REDACTION: "redaction", RELECTURE: "relecture", VALIDATION: "validation",
  FINALISATION: "finalisation", SOUMIS: "soumis", ACCEPTE: "accepte", REJETE: "rejete",
};

const bailleurColors: Record<string, string> = {
  PNUD: "oklch(0.55 0.18 245)", UE: "oklch(0.55 0.18 270)",
  BADEA: "oklch(0.55 0.15 30)", AFD: "oklch(0.55 0.15 0)",
  USAID: "oklch(0.55 0.15 240)", BM: "oklch(0.5 0.15 200)",
  UNICEF: "oklch(0.55 0.15 240)", OMS: "oklch(0.5 0.15 200)",
};
const avatarColors = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)", "oklch(0.55 0.1 200)",
];

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projets, taches, activites, totalProjets, acceptes] = await Promise.all([
    prisma.projet.findMany({
      where: { statut: { notIn: ["ACCEPTE", "REJETE", "ARCHIVE"] } },
      include: {
        bailleur: { select: { sigle: true } },
        documents: { select: { statut: true } },
        membres: { select: { user: { select: { id: true, name: true } } }, take: 4 },
      },
      orderBy: { dateLimite: "asc" }, take: 8,
    }),
    prisma.tache.findMany({
      where: { assigneAId: session.user.id, statut: { not: "TERMINE" } },
      include: { projet: { select: { titre: true } } },
      orderBy: { dateLimite: "asc" }, take: 5,
    }),
    prisma.activite.findMany({
      include: { user: { select: { name: true } }, projet: { select: { titre: true } } },
      orderBy: { createdAt: "desc" }, take: 6,
    }),
    prisma.projet.count(),
    prisma.projet.count({ where: { statut: "ACCEPTE" } }),
  ]);

  const inFlight = projets.filter(p => !["SOUMIS"].includes(p.statut));
  const budget = projets.reduce((s, p) => s + (p.budget ?? 0), 0);
  const deadlines7j = projets.filter(p => daysUntil(p.dateLimite) <= 7 && daysUntil(p.dateLimite) >= 0).length;
  const tauxAcceptation = totalProjets > 0 ? Math.round((acceptes / totalProjets) * 100) : 0;

  return (<>
    {/* Header */}
    <div className="page-header">
      <div>
        <div className="page-title">Bonjour {session.user.name?.split(" ")[0]} 👋</div>
        <div className="page-subtitle">{inFlight.length} projets en cours · {deadlines7j} échéances cette semaine · {tauxAcceptation}% de taux de soumission ce trimestre</div>
      </div>
      <div className="page-actions">
        <Link href="/projets/nouveau" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14Z"/></svg>
          Analyser un appel d&apos;offre
        </Link>
      </div>
    </div>

    {/* KPI strip */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Projets en cours", value: String(inFlight.length), trend: `+${inFlight.length} ce mois`, color: "var(--primary)" },
        { label: "Budget en jeu", value: fmtMoney(budget, "EUR"), trend: `${inFlight.length} dossiers actifs`, color: "var(--info)" },
        { label: "Échéances < 7 jours", value: String(deadlines7j), trend: deadlines7j > 0 ? `${deadlines7j} critique${deadlines7j > 1 ? "s" : ""}` : "RAS", color: "var(--warning)" },
        { label: "Taux d'acceptation", value: `${tauxAcceptation}%`, trend: totalProjets > 0 ? `${acceptes} sur ${totalProjets} projets` : "—", color: "var(--success)" },
      ].map((k, i) => (
        <div key={i} className="card" style={{ padding: "16px 18px" }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: k.color }} />
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{k.label}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 6, color: "var(--text)" }}>{k.value}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{k.trend}</div>
        </div>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      {/* Projets actifs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Projets actifs</div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm">Tous</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-3)" }}>Mes projets</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-3)" }}>Archives</button>
          </div>
        </div>
        <div>
          {inFlight.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              Aucun projet. <Link href="/projets/nouveau" style={{ color: "var(--primary)" }}>Créer</Link>
            </div>
          ) : inFlight.map((p, i) => {
            const tot = p.documents.length;
            const val = p.documents.filter(d => d.statut === "VALIDE").length;
            const pct = tot > 0 ? Math.round(val / tot * 100) : 0;
            const days = daysUntil(p.dateLimite);
            const urgent = days <= 7;
            const bColor = bailleurColors[p.bailleur.sigle] ?? "oklch(0.55 0.13 200)";

            // DeadlineLabel
            let dlColor = "var(--text-3)";
            let dlPrefix = "";
            if (days < 0) { dlColor = "var(--danger)"; dlPrefix = "Dépassée · "; }
            else if (days === 0) { dlColor = "var(--danger)"; dlPrefix = "Aujourd'hui · "; }
            else if (days <= 3) { dlColor = "var(--warning)"; dlPrefix = `J-${days} · `; }
            else if (days <= 14) { dlColor = "var(--text-2)"; dlPrefix = `J-${days} · `; }

            return (
              <Link key={p.id} href={`/projets/${p.id}`} style={{
                padding: "14px 18px",
                borderBottom: i === inFlight.length - 1 ? "none" : "1px solid var(--border)",
                cursor: "pointer", display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 14, alignItems: "center", textDecoration: "none", color: "inherit",
              }}>
                {/* Bailleur badge — carré arrondi oklch */}
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: bColor, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 10, letterSpacing: "0.02em",
                  boxShadow: "inset 0 -6px 12px rgba(0,0,0,0.15)",
                }}>
                  {p.bailleur.sigle}
                </div>

                {/* Titre + ref + pays + budget */}
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titre}</div>
                  </div>
                  <div className="row" style={{ gap: 10, fontSize: 11.5, color: "var(--text-3)" }}>
                    <span className="mono">{p.reference ?? p.bailleur.sigle}</span>
                    {p.pays && <><span>·</span><span>{p.pays}</span></>}
                    {p.budget && <><span>·</span><span className="tnum">{fmtMoney(p.budget, p.devise)}</span></>}
                  </div>
                </div>

                {/* Progress + status pill */}
                <div style={{ width: 120 }}>
                  <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{pct}%</span>
                    <span style={{ marginLeft: "auto" }}>
                      <span className={`pill pill-${statusKeys[p.statut] ?? "brouillon"}`}>
                        <span className="dot" />{statusLabels[p.statut] ?? p.statut}
                      </span>
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${pct}%`, background: urgent ? "var(--warning)" : undefined }} />
                  </div>
                </div>

                {/* Deadline + avatars */}
                <div style={{ minWidth: 90, textAlign: "right" }}>
                  <span className="tnum" style={{ color: dlColor, fontSize: 12.5 }}>
                    {dlPrefix}{fmtDate(p.dateLimite)}
                  </span>
                  <div className="avatar-stack" style={{ marginTop: 4, justifyContent: "flex-end" }}>
                    {p.membres.slice(0, 3).map((m, mi) => {
                      const init = m.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <span key={m.user.id} className="avatar avatar-sm" style={{
                          background: avatarColors[mi % avatarColors.length],
                          width: 22, height: 22, fontSize: 9,
                        }}>
                          {init}
                        </span>
                      );
                    })}
                    {p.membres.length > 3 && (
                      <span className="avatar avatar-sm" style={{ background: "var(--surface-3)", color: "var(--text-2)", width: 22, height: 22, fontSize: 9 }}>
                        +{p.membres.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Colonne droite */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Mes tâches */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mes tâches</div>
            <span className="tag">{taches.length}</span>
          </div>
          <div>
            {taches.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>Aucune tâche</div>
            ) : taches.map((t, i) => {
              const isToday = t.dateLimite && daysUntil(t.dateLimite) === 0;
              const isTomorrow = t.dateLimite && daysUntil(t.dateLimite) === 1;
              const dlText = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : t.dateLimite ? fmtDate(t.dateLimite) : "";
              return (
                <div key={t.id} className="row" style={{ padding: "10px 18px", borderBottom: i === taches.length - 1 ? "none" : "1px solid var(--border)", gap: 10, alignItems: "flex-start" }}>
                  <input type="checkbox" disabled style={{ marginTop: 3, accentColor: "var(--primary)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, lineHeight: 1.4 }}>{t.titre}</div>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: isToday ? "var(--danger)" : "var(--text-3)" }}>{dlText}</span>
                      {t.priorite === "HAUTE" && (
                        <span className="tag" style={{ borderColor: "color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", background: "var(--danger-soft)" }}>Haute</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Activité récente</div>
          </div>
          <div style={{ padding: "10px 18px 14px" }}>
            {activites.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, padding: 16 }}>Aucune activité</div>
            ) : activites.map((a, i) => {
              const init = a.user.name?.charAt(0) ?? "?";
              const timeDiff = Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60000);
              const timeLabel = timeDiff < 60 ? `il y a ${timeDiff} min` : timeDiff < 1440 ? `il y a ${Math.round(timeDiff / 60)}h` : `il y a ${Math.round(timeDiff / 1440)}j`;
              return (
                <div key={a.id} className="row" style={{ gap: 8, padding: "6px 0", alignItems: "flex-start" }}>
                  <span className="avatar avatar-sm" style={{ background: avatarColors[i % avatarColors.length], width: 22, height: 22, fontSize: 10 }}>{init}</span>
                  <div style={{ fontSize: 12, lineHeight: 1.5, flex: 1 }}>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{a.user.name?.split(" ")[0]}</span>
                    <span style={{ color: "var(--text-3)" }}> {a.description}</span>
                    <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>{a.projet?.titre} · {timeLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </>);
}
