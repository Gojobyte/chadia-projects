import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Bid {
  initials: string;
  vendor: string;
  vendorMeta: string;
  pli: string;
  amount: string;
  amountUnit?: string;
  delta?: string;
  deltaTone?: "under" | "over" | "";
  scoreLabel?: string;
  score?: number;
  badge: string;
  badgeTone: "won" | "review" | "lost" | "reject" | "scheduled";
  badgeLabel: string;
  deposed: string;
  winner?: boolean;
  sealed?: boolean;
}

interface Group {
  ref: string;
  titre: string;
  em: string;
  ct: string;
  meta: string;
  isLocation?: boolean;
  bids: Bid[];
}

const GROUPS: Group[] = [
  {
    ref: "AO-2026-094",
    titre: "Réhabilitation de ", em: "6 forages",
    ct: "3 plis · ouverture le 15 mai 2026",
    meta: "Mongo, Guéra · UE/ECHO",
    bids: [
      { initials: "SH", vendor: "SAHEL Hydro SARL", vendorMeta: "NIF · 8742-01-N · N'Djaména", pli: "SOUM-094-01", amount: "28,4", amountUnit: "M FCFA", delta: "-12% vs estim.", deltaTone: "under", score: 88, badge: "won", badgeTone: "won", badgeLabel: "Recommandée", deposed: "12 mai · 09:14", winner: true },
      { initials: "FT", vendor: "FORATEC Tchad", vendorMeta: "NIF · 6219-08-N · N'Djaména", pli: "SOUM-094-02", amount: "31,2", amountUnit: "M FCFA", delta: "-3% vs estim.", deltaTone: "", score: 74, badge: "review", badgeTone: "review", badgeLabel: "En analyse", deposed: "11 mai · 16:42" },
      { initials: "EM", vendor: "Entreprise Madibaye", vendorMeta: "NIF · 4480-12-S · Sarh", pli: "SOUM-094-03", amount: "34,8", amountUnit: "M FCFA", delta: "+8% vs estim.", deltaTone: "over", score: 62, badge: "review", badgeTone: "review", badgeLabel: "En analyse", deposed: "12 mai · 11:08" },
    ],
  },
  {
    ref: "AO-2026-091",
    titre: "Fourniture de ", em: "kits scolaires",
    ct: "5 plis · attribué le 28 avril 2026",
    meta: "N'Djaména · Coopération Française",
    bids: [
      { initials: "PL", vendor: "Papeterie du Logone", vendorMeta: "NIF · 1124-04-N · N'Djaména", pli: "SOUM-091-04", amount: "7,8", amountUnit: "M FCFA", delta: "-9% vs estim.", deltaTone: "under", score: 92, badge: "won", badgeTone: "won", badgeLabel: "Attribuée", deposed: "22 avr.", winner: true },
      { initials: "LB", vendor: "Librairie Bichara", vendorMeta: "NIF · 3287-06-N · N'Djaména", pli: "SOUM-091-01", amount: "8,1", amountUnit: "M FCFA", delta: "-5% vs estim.", deltaTone: "under", score: 81, badge: "lost", badgeTone: "lost", badgeLabel: "Non retenu", deposed: "21 avr." },
      { initials: "TS", vendor: "Tchad Stationery", vendorMeta: "NIF · 5602-09-N", pli: "SOUM-091-02", amount: "9,4", amountUnit: "M FCFA", delta: "+10% vs estim.", deltaTone: "over", score: 68, badge: "lost", badgeTone: "lost", badgeLabel: "Non retenu", deposed: "22 avr." },
      { initials: "EA", vendor: "El-Amine Distrib.", vendorMeta: "NIF · 9015-11-N", pli: "SOUM-091-03", amount: "8,9", amountUnit: "M FCFA", delta: "-3% vs estim.", deltaTone: "", score: 55, badge: "reject", badgeTone: "reject", badgeLabel: "Rejetée — non conforme", deposed: "22 avr." },
      { initials: "SC", vendor: "Sahel Consulting Trade", vendorMeta: "NIF · 7140-02-N", pli: "SOUM-091-05", amount: "9,8", amountUnit: "M FCFA", delta: "+15% vs estim.", deltaTone: "over", score: 48, badge: "lost", badgeTone: "lost", badgeLabel: "Non retenu", deposed: "23 avr." },
    ],
  },
  {
    ref: "AO-2026-088",
    titre: "Étude ", em: "diagnostic genre · Guéra",
    ct: "2 plis · ouverture le 22 mai 2026",
    meta: "Bitkine · Union Européenne",
    bids: [
      { initials: "CG", vendor: "Cabinet Genre & Société", vendorMeta: "Indép. · N'Djaména", pli: "SOUM-088-01", amount: "—", amountUnit: "scellé", delta: "ouverture 22/05", scoreLabel: "en attente", badge: "scheduled", badgeTone: "scheduled", badgeLabel: "Reçue · scellée", deposed: "8 mai · 14:20", sealed: true },
      { initials: "IS", vendor: "Institut Sahel Études", vendorMeta: "Cabinet · Mongo", pli: "SOUM-088-02", amount: "—", amountUnit: "scellé", delta: "ouverture 22/05", scoreLabel: "en attente", badge: "scheduled", badgeTone: "scheduled", badgeLabel: "Reçue · scellée", deposed: "9 mai · 11:45", sealed: true },
    ],
  },
  {
    ref: "AO-2026-082",
    titre: "Location de ", em: "bureau d'antenne · Mongo",
    ct: "4 plis · attribué le 02 avril 2026",
    meta: "Mongo, Guéra · Fonds propres",
    isLocation: true,
    bids: [
      { initials: "RM", vendor: "Résidence Al-Mongo", vendorMeta: "SCI · Mongo", pli: "SOUM-082-02", amount: "320", amountUnit: "k FCFA", score: 84, badge: "won", badgeTone: "won", badgeLabel: "Attribuée", deposed: "28 mars", winner: true },
      { initials: "VM", vendor: "Villa Mahamat", vendorMeta: "Particulier · Mongo", pli: "SOUM-082-01", amount: "280", amountUnit: "k FCFA", score: 71, badge: "lost", badgeTone: "lost", badgeLabel: "Non retenu", deposed: "26 mars" },
    ],
  },
];

const PIPELINE = [
  { tone: "var(--color-mineral)", label: "Tous", v: 38, d: "Cumul 2026", on: true },
  { tone: "var(--color-warning)", label: "Reçues", v: 14, d: "Plis scellés · ouverture à venir" },
  { tone: "var(--color-terracotta)", label: "En analyse", v: 11, d: "Comité de dépouillement" },
  { tone: "var(--color-success)", label: "Attribuées", v: 8, d: "Notification émise" },
  { tone: "var(--color-shale)", label: "Rejetées", v: 5, d: "Dossier non conforme" },
];

export default async function SoumissionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">38 plis reçus · 9 marchés en cours · 4 attribués en 2026</div>
          <h1 className="pg-title">Toutes les <em>soumissions.</em></h1>
          <p className="pg-sub">
            Vue transversale des plis reçus pour l&apos;ensemble des appels d&apos;offres ouverts par
            CHADIA. Trier par appel, par fournisseur, par statut. Les soumissions confidentielles
            restent scellées jusqu&apos;à la séance d&apos;ouverture.
          </p>
        </div>
        <div className="pg-actions">
          <button className="btn btn--ghost btn--sm"><i className="ph ph-export"></i> Exporter</button>
          <button className="btn btn--secondary btn--sm"><i className="ph ph-funnel"></i> Filtres</button>
        </div>
      </header>

      <div className="sm-pipe">
        {PIPELINE.map((p) => (
          <div key={p.label} className={`col ${p.on ? "on" : ""}`}>
            <div className="l"><span className="dot" style={{ background: p.tone }}></span> {p.label}</div>
            <div className="v">{p.v}</div>
            <div className="d">{p.d}</div>
          </div>
        ))}
      </div>

      <div className="sm-bar">
        <label className="search" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, height: 32, padding: "0 12px", background: "var(--color-page)", border: "1px solid var(--color-line-strong)", borderRadius: 4, maxWidth: 360, minWidth: 240 }}>
          <i className="ph ph-magnifying-glass" style={{ color: "var(--color-shale)" }}></i>
          <input type="text" placeholder="Rechercher un fournisseur, un appel, une référence…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "400 13px var(--font-sans)" }} />
        </label>
        <button className="pill"><i className="ph ph-megaphone"></i> Tous appels <i className="ph ph-caret-down"></i></button>
        <button className="pill"><i className="ph ph-buildings"></i> Tous fournisseurs <i className="ph ph-caret-down"></i></button>
        <button className="pill"><i className="ph ph-calendar"></i> 2026 <i className="ph ph-caret-down"></i></button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: "var(--color-shale)" }}>
          Grouper par <strong style={{ color: "var(--color-ink)" }}>appel d&apos;offres</strong>{" "}
          <i className="ph ph-caret-down"></i>
        </span>
      </div>

      {GROUPS.map((g) => (
        <div key={g.ref} className="sm-group">
          <div className="sm-group-h">
            <h3>{g.ref} · {g.titre}<em>{g.em}</em></h3>
            <span className="ct">{g.ct}</span>
            <span className="meta">{g.meta}</span>
          </div>
          <table className="bids">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Fournisseur</th>
                <th>Pli</th>
                <th style={{ textAlign: "right" }}>{g.isLocation ? "Loyer mensuel" : "Montant TTC"}</th>
                <th>Évaluation</th>
                <th>Statut</th>
                <th>Déposé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {g.bids.map((b) => (
                <tr key={b.pli} className={b.winner ? "winner" : ""}>
                  <td>
                    <div className="vendor">
                      <span className="av">{b.initials}</span>
                      <div className="nm">{b.vendor}<small>{b.vendorMeta}</small></div>
                    </div>
                  </td>
                  <td><span className="stamp">{b.pli}</span></td>
                  <td>
                    <div className="num-cell">
                      {b.amount} {b.amountUnit && <em>{b.amountUnit}</em>}
                      {b.delta && <span className={`delta ${b.deltaTone}`}>{b.delta}</span>}
                    </div>
                  </td>
                  <td>
                    {b.sealed ? (
                      <span className="stamp" style={{ color: "var(--color-mineral)" }}>{b.scoreLabel}</span>
                    ) : (
                      <div className="score">
                        <div className="gauge"><span style={{ width: `${b.score ?? 0}%` }}></span></div>
                        <span className="v">{b.score}/100</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge--${b.badgeTone}`}>
                      <span className="dot" style={b.badgeTone === "scheduled" ? { background: "var(--color-warning)" } : undefined}></span>
                      {b.badgeLabel}
                    </span>
                  </td>
                  <td><span className="stamp">{b.deposed}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button style={{ background: "transparent", border: "none", color: "var(--color-stone)", cursor: "pointer", padding: 4, fontSize: 16 }}>
                      <i className={b.winner ? "ph ph-arrow-right" : "ph ph-dots-three"}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ textAlign: "center", padding: "8px 0 0" }}>
        <button className="btn btn--ghost">
          Voir 5 autres groupes <i className="ph ph-caret-down"></i>
        </button>
      </div>
    </div>
  );
}
